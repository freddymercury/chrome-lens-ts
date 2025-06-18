import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF2.3: Add Modification Rollback Support', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const mockTabId = 'A1B2C3D4E5F67890123456789012345F';
  const originalCode = 'console.log("original");';
  const modifiedCode = 'console.log("modified");';
  
  beforeEach(() => {
    jest.clearAllMocks();
    server = new ChromeDevToolsMCPServer();
    
    // Mock Chrome client
    mockClient = {
      Runtime: { 
        enable: jest.fn().mockResolvedValue({}),
        compileScript: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          result: { value: true }
        })
      },
      Debugger: { 
        enable: jest.fn().mockResolvedValue({}),
        getScriptSource: jest.fn().mockResolvedValue({
          scriptSource: originalCode
        }),
        setScriptSource: jest.fn().mockResolvedValue({
          status: 'Ok'
        })
      },
      send: jest.fn().mockImplementation((method) => {
        if (method === 'Debugger.getScriptSource') {
          return Promise.resolve({ scriptSource: originalCode });
        }
        return Promise.resolve({});
      }),
      Page: {
        enable: jest.fn().mockResolvedValue({}),
        reload: jest.fn().mockResolvedValue({})
      }
    };
    
    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    // Add source file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-1', {
      scriptId: 'script-1',
      url: 'http://example.com/app.js',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should store original source before modification', async () => {
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: modifiedCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.getScriptSource).toHaveBeenCalledWith({ scriptId: 'script-1' });
    
    // Check that original source was stored in registry
    const registry = (server as any).sourceFiles.get(mockTabId);
    const sourceInfo = registry.get('script-1');
    expect(sourceInfo.originalSource).toBe(originalCode);
    expect(sourceInfo.isModified).toBe(true);
  });

  test('should rollback on syntax error', async () => {
    // Configure to fail validation
    mockClient.Runtime.compileScript.mockResolvedValueOnce({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token',
        lineNumber: 1,
        columnNumber: 10
      }
    });
    
    const invalidCode = 'console.log(;'; // Missing closing paren
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: invalidCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('SyntaxError');
    
    // Should have attempted rollback
    const rollbackCall = mockClient.Debugger.setScriptSource.mock.calls.find(
      (call: any[]) => call[0].scriptSource === originalCode
    );
    expect(rollbackCall).toBeDefined();
  });

  test('should rollback on runtime error when ENABLE_CODE_ROLLBACK is true', async () => {
    process.env.ENABLE_CODE_ROLLBACK = 'true';
    
    // First call succeeds (modification)
    mockClient.Debugger.setScriptSource.mockResolvedValueOnce({
      status: 'Ok'
    });
    
    // Runtime check fails - simulate runtime error
    mockClient.Runtime.evaluate.mockImplementation(() => {
      return Promise.resolve({
        exceptionDetails: {
          text: 'ReferenceError: undefinedVariable is not defined',
          lineNumber: 1,
          columnNumber: 1
        }
      });
    });
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'undefinedVariable.method();',
      validateSyntax: true
    });
    
    // Should report runtime error
    expect(result.success).toBe(true); // Modification succeeded
    expect(result.sourceModification.warnings).toBeDefined();
    expect(result.sourceModification.warnings[0].type).toBe('RuntimeError');
    
    // Check for rollback attempt
    expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledTimes(2);
    expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
      scriptId: 'script-1',
      scriptSource: originalCode
    });
    
    delete process.env.ENABLE_CODE_ROLLBACK;
  });

  test('should respect rollback history limit', async () => {
    process.env.MAX_ROLLBACK_HISTORY = '3';
    
    // Make multiple modifications
    for (let i = 1; i <= 5; i++) {
      const newCode = `console.log("version ${i}");`;
      
      // Update mock to return previous version
      mockClient.send.mockImplementation((method: string) => {
        if (method === 'Debugger.getScriptSource') {
          return Promise.resolve({ 
            scriptSource: i === 1 ? originalCode : `console.log("version ${i - 1}");` 
          });
        }
        return Promise.resolve({});
      });
      
      await server.modifySourceCode({
        tabId: mockTabId,
        sourceId: 'script-1',
        newContent: newCode,
        validateSyntax: false
      });
    }
    
    // Check rollback history
    const registry = (server as any).sourceFiles.get(mockTabId);
    const sourceInfo = registry.get('script-1');
    
    // Should only keep last 3 versions
    expect(sourceInfo.rollbackHistory).toBeDefined();
    expect(sourceInfo.rollbackHistory.length).toBeLessThanOrEqual(3);
    
    delete process.env.MAX_ROLLBACK_HISTORY;
  });

  test('should handle rollback failure gracefully', async () => {
    // Configure validation to fail
    mockClient.Runtime.compileScript.mockResolvedValueOnce({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token'
      }
    });
    
    // Configure rollback to also fail
    mockClient.Debugger.setScriptSource.mockRejectedValueOnce(new Error('Rollback failed'));
    
    const invalidCode = 'invalid syntax here';
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: invalidCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(false);
    expect(result.sourceModification.error.rollbackFailed).toBe(true);
    expect(result.sourceModification.error.rollbackError).toContain('Rollback failed');
  });

  test('should skip rollback when ENABLE_CODE_ROLLBACK is false', async () => {
    process.env.ENABLE_CODE_ROLLBACK = 'false';
    
    // Configure to fail validation
    mockClient.Runtime.compileScript.mockResolvedValueOnce({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token'
      }
    });
    
    const invalidCode = 'console.log(;';
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: invalidCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(false);
    
    // Should not attempt rollback
    expect(mockClient.Debugger.setScriptSource).not.toHaveBeenCalled();
    
    delete process.env.ENABLE_CODE_ROLLBACK;
  });

  test('should provide rollback method in response', async () => {
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: modifiedCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.canRollback).toBe(true);
    expect(result.sourceModification.rollbackId).toBeDefined();
  });
});