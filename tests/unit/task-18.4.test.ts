import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.STATE_ANALYSIS_ENABLED = 'true';
process.env.RUNTIME_INSPECTION_ENABLED = 'true';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 18.4: Runtime State Analysis Engine', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Runtime: {
        enable: jest.fn().mockResolvedValue({} as any),
        evaluate: jest.fn(),
        getProperties: jest.fn(),
        globalLexicalScopeNames: jest.fn(),
        queryObjects: jest.fn(),
        releaseObjectGroup: jest.fn()
      },
      Debugger: {
        enable: jest.fn().mockResolvedValue({} as any),
        evaluateOnCallFrame: jest.fn(),
        getStackTrace: jest.fn()
      },
      Profiler: {
        enable: jest.fn().mockResolvedValue({} as any),
        getSamplingProfile: jest.fn()
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should analyze global scope state', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock global object evaluation
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        type: 'object',
        objectId: 'global-obj',
        description: 'Window'
      }
    });
    
    // Mock global properties
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [
        { name: 'document', value: { type: 'object', description: 'HTMLDocument' } },
        { name: 'location', value: { type: 'object', description: 'Location' } },
        { name: 'customGlobal', value: { type: 'string', value: 'test' } }
      ]
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global',
      maxResults: 10
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: 'window',
      returnByValue: false
    });
    expect(result.stateAnalysis.globalState).toBeDefined();
    expect(result.stateAnalysis.globalState.properties).toHaveLength(3);
  });

  test('should analyze local scope when paused', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock debugger state with call frames
    server.updateDebuggerState(tabId, {
      reason: 'breakpoint',
      callFrames: [{
        callFrameId: 'frame-0',
        functionName: 'testFunction',
        scopeChain: [
          { type: 'local', object: { objectId: 'local-scope' } },
          { type: 'closure', object: { objectId: 'closure-scope' } },
          { type: 'global', object: { objectId: 'global-scope' } }
        ]
      }]
    });
    
    // Mock local scope properties
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [
        { name: 'localVar', value: { type: 'number', value: 42 } },
        { name: 'this', value: { type: 'object', objectId: 'this-obj' } }
      ]
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'local'
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.localState).toBeDefined();
    expect(result.stateAnalysis.localState.callFrame).toBe('testFunction');
    expect(result.stateAnalysis.localState.variables).toHaveLength(2);
  });

  test('should analyze closure scope', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock debugger state with closures
    server.updateDebuggerState(tabId, {
      reason: 'breakpoint',
      callFrames: [{
        callFrameId: 'frame-0',
        functionName: 'innerFunction',
        scopeChain: [
          { type: 'local', object: { objectId: 'local-scope' } },
          { type: 'closure', object: { objectId: 'closure-scope-1' } },
          { type: 'closure', object: { objectId: 'closure-scope-2' } },
          { type: 'global', object: { objectId: 'global-scope' } }
        ]
      }]
    });
    
    // Mock closure properties
    mockClient.Runtime.getProperties
      .mockResolvedValueOnce({
        result: [
          { name: 'capturedVar1', value: { type: 'string', value: 'captured' } }
        ]
      })
      .mockResolvedValueOnce({
        result: [
          { name: 'capturedVar2', value: { type: 'boolean', value: true } }
        ]
      });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'closure'
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.closureState).toBeDefined();
    expect(result.stateAnalysis.closureState.closures).toHaveLength(2);
    expect(mockClient.Runtime.getProperties).toHaveBeenCalledTimes(2);
  });

  test('should analyze all scopes comprehensively', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock global evaluation
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: { type: 'object', objectId: 'global-obj' }
    });
    
    // Mock various property calls
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [{ name: 'test', value: { type: 'string', value: 'all' } }]
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'all',
      maxResults: 50
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.scope).toBe('all');
    expect(result.stateAnalysis.globalState).toBeDefined();
    // Local and closure states will be empty if not paused
    expect(result.stateAnalysis.summary).toBeDefined();
  });

  test('should include prototype chain when requested', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: { type: 'object', objectId: 'obj-with-proto' }
    });
    
    // Mock properties including prototype
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [
        { name: 'ownProp', value: { type: 'string', value: 'own' } }
      ],
      internalProperties: [
        { name: '[[Prototype]]', value: { type: 'object', objectId: 'proto-obj' } }
      ]
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global',
      includePrototype: true
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.getProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        ownProperties: false // Should include inherited properties
      })
    );
  });

  test('should invoke getters when requested', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: { type: 'object', objectId: 'obj-with-getters' }
    });
    
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [
        { 
          name: 'computedProp',
          get: { type: 'function', objectId: 'getter-func' },
          configurable: true,
          enumerable: true
        }
      ]
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global',
      includeGetters: true
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.getProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        accessorPropertiesOnly: false,
        generatePreview: true
      })
    );
  });

  test('should respect maxResults limit', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const maxResults = 5;
    
    // Mock many properties
    const manyProps = Array.from({ length: 20 }, (_, i) => ({
      name: `prop${i}`,
      value: { type: 'number', value: i }
    }));
    
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: { type: 'object', objectId: 'large-obj' }
    });
    
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: manyProps
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global',
      maxResults
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.globalState.properties.length).toBeLessThanOrEqual(maxResults);
    expect(result.stateAnalysis.globalState.truncated).toBe(true);
  });

  test('should provide memory usage statistics', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({
        result: { type: 'object', objectId: 'global' }
      })
      .mockResolvedValueOnce({
        // Mock performance.memory call
        result: {
          type: 'object',
          preview: {
            properties: [
              { name: 'usedJSHeapSize', type: 'number', value: '10485760' },
              { name: 'totalJSHeapSize', type: 'number', value: '20971520' }
            ]
          }
        }
      });
    
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: []
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'all'
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.memoryUsage).toBeDefined();
    expect(result.stateAnalysis.memoryUsage.usedJSHeapSize).toBeDefined();
  });

  test('should handle analysis errors gracefully', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.evaluate.mockRejectedValue(new Error('Evaluation failed'));
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Evaluation failed');
    expect(result.stateAnalysis.error.type).toBe('AnalysisError');
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'all'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should analyze lexical scope names', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.globalLexicalScopeNames.mockResolvedValue({
      names: ['let1', 'const1', 'class1']
    });
    
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: { type: 'object', objectId: 'global' }
    });
    
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: []
    });
    
    const result = await server.analyzeRuntimeState({
      tabId,
      scope: 'global'
    });
    
    expect(result.success).toBe(true);
    expect(result.stateAnalysis.globalState.lexicalNames).toEqual(['let1', 'const1', 'class1']);
  });
});