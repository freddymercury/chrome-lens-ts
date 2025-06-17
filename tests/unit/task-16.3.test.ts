import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.CODE_RELOAD_STRATEGY = 'hot';
process.env.CODE_MODIFICATION_ENABLED = 'true';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 16.3: Real-time Code Modification Engine', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Debugger: {
        enable: jest.fn().mockResolvedValue({}),
        setScriptSource: jest.fn().mockResolvedValue({
          status: 'Ok'
        }),
        setBreakpointsActive: jest.fn().mockResolvedValue({}),
        getScriptSource: jest.fn().mockResolvedValue({
          scriptSource: '// Original source code'
        })
      },
      Runtime: {
        enable: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn()
      },
      Page: {
        reload: jest.fn().mockResolvedValue({})
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'TAB123', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should modify source code using Debugger.setScriptSource', async () => {
    const tabId = 'TAB123';
    const scriptId = '456';
    const newContent = 'console.log("Modified code");';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/app.js',
      hasSourceMap: false
    });
    
    // Mock successful modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok',
      callFrames: [],
      stackChanged: false
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: false,
      validateSyntax: false
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
      scriptId,
      scriptSource: newContent
    });
  });

  test('should handle hot reload after modification', async () => {
    const tabId = 'TAB123';
    const scriptId = '789';
    const newContent = 'function updated() { return true; }';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/module.js',
      hasSourceMap: false
    });
    
    // Mock successful modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    // Mock hot reload via Runtime.evaluate - sequence of calls made by attemptHotReload
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { value: false } }) // Vite check fails
      .mockResolvedValueOnce({ result: { value: true } })  // Webpack check succeeds
      .mockResolvedValueOnce({ result: { value: { success: true, accepted: true, reloadedModules: ['http://example.com/module.js'] } } }); // Webpack HMR succeeds
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: true,
      validateSyntax: false
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(false);
    expect(mockClient.Runtime.evaluate).toHaveBeenCalled();
  });

  test('should fall back to page reload when hot reload fails', async () => {
    const tabId = 'TAB123';
    const scriptId = '999';
    const newContent = 'const x = 42;';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/main.js',
      hasSourceMap: false
    });
    
    // Mock successful modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    // Mock failed hot reload - all checks fail
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { value: false } }) // Vite check fails
      .mockResolvedValueOnce({ result: { value: false } }) // Webpack check fails  
      .mockResolvedValueOnce({ result: { value: { success: false } } }); // ES module reload fails
    
    // Mock Page.enable and Page.reload
    mockClient.Page.enable = jest.fn().mockResolvedValue({});
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: true,
      validateSyntax: false
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(true);
    expect(mockClient.Page.reload).toHaveBeenCalled();
  });

  test('should handle modification failure', async () => {
    const tabId = 'TAB123';
    const scriptId = '111';
    const newContent = 'invalid { code';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/bad.js',
      hasSourceMap: false
    });
    
    // Mock failed modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'CompileError',
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token'
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: false,
      validateSyntax: false
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('SyntaxError');
  });

  test('should store original source for rollback', async () => {
    const tabId = 'TAB123';
    const scriptId = '222';
    const originalContent = 'console.log("Original");';
    const newContent = 'console.log("Modified");';
    
    // Set up source registry with original content
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/rollback.js',
      hasSourceMap: false,
      content: originalContent
    });
    
    // Mock getting original source
    mockClient.send.mockImplementation((method: string) => {
      if (method === 'Debugger.getScriptSource') {
        return Promise.resolve({ scriptSource: originalContent });
      }
      return Promise.resolve({});
    });
    
    // Mock successful modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: false,
      validateSyntax: false
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.originalStored).toBe(true);
  });

  test('should track affected modules for hot reload', async () => {
    const tabId = 'TAB123';
    const scriptId = '333';
    const newContent = 'export function updated() { return 2; }';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/utils.js',
      hasSourceMap: false
    });
    
    // Mock successful modification
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    // Mock module detection
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        type: 'object',
        value: {
          moduleType: 'ESM',
          dependencies: ['app.js', 'main.js']
        }
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent,
      hotReload: true,
      validateSyntax: false
    });
    
    expect(result.success).toBe(true);
    expect(result.affectedModules).toBeDefined();
    expect(result.affectedModules.length).toBeGreaterThan(0);
  });

  test('should handle source not found error', async () => {
    const tabId = 'TAB123';
    const sourceId = 'nonexistent.js';
    const newContent = 'console.log("Test");';
    
    // Don't add to registry - source doesn't exist
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId,
      newContent,
      hotReload: false,
      validateSyntax: false
    });
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Could not find source file matching');
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'NOTCONNECTED';
    const sourceId = 'test.js';
    const newContent = 'console.log("Test");';
    
    // Clear the mock client to simulate not connected
    server.clearStorage();
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId,
      newContent,
      hotReload: false,
      validateSyntax: false
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });
});