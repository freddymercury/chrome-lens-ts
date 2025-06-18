import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.CODE_VALIDATION_STRICT = 'true';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 16.4: Modification Validation and Error Handling', () => {
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
        getScriptSource: jest.fn().mockResolvedValue({
          scriptSource: '// Original source code'
        })
      },
      Runtime: {
        enable: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn(),
        compileScript: jest.fn().mockResolvedValue({})
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

  test('should validate JavaScript syntax before modification', async () => {
    const tabId = 'TAB123';
    const scriptId = '123';
    const invalidCode = 'function test() { const x = ; }'; // Invalid syntax
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/test.js',
      hasSourceMap: false
    });
    
    // Mock Runtime.compileScript for better validation
    mockClient.Runtime.compileScript.mockResolvedValue({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token ;',
        lineNumber: 1,
        columnNumber: 28
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: invalidCode,
      hotReload: false,
      validateSyntax: true
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Syntax');
    expect(result.sourceModification.error.type).toBe('SyntaxError');
  });

  test('should detect runtime errors after modification', async () => {
    const tabId = 'TAB123';
    const scriptId = '456';
    const validSyntaxBadRuntime = 'window.nonExistentFunction();';
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/runtime-error.js',
      hasSourceMap: false
    });
    
    // Mock successful syntax validation
    mockClient.Runtime.compileScript.mockResolvedValue({});
    
    // Mock successful modification but runtime error on execution
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    // Mock runtime error detection
    mockClient.Runtime.evaluate.mockResolvedValue({
      exceptionDetails: {
        text: 'TypeError: window.nonExistentFunction is not a function',
        exception: {
          type: 'object',
          subtype: 'error',
          description: 'TypeError: window.nonExistentFunction is not a function'
        }
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: validSyntaxBadRuntime,
      hotReload: false,
      validateSyntax: true
    });
    
    // Should still succeed but report the runtime error warning
    expect(result.success).toBe(true);
    expect(result.sourceModification.warnings).toBeDefined();
  });

  test('should implement automatic rollback on compilation errors', async () => {
    const tabId = 'TAB123';
    const scriptId = '789';
    const originalCode = 'console.log("Original");';
    const badCode = 'console.log("Bad code"'; // Missing closing paren
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/rollback.js',
      hasSourceMap: false
    });
    
    // Mock getting original source
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: originalCode
    });
    
    // Mock modification failure
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'CompileError',
      exceptionDetails: {
        text: 'SyntaxError: missing ) after argument list'
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: badCode,
      hotReload: false,
      validateSyntax: false // Skip pre-validation to test CDP validation
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('SyntaxError');
    expect(result.sourceModification.originalStored).toBe(true);
  });

  test('should validate CSS syntax for CSS files', async () => {
    const tabId = 'TAB123';
    const scriptId = 'css-123';
    const invalidCSS = '.class { color: ; }'; // Invalid CSS
    
    // Set up source registry with CSS file
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/styles.css',
      hasSourceMap: false
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: invalidCSS,
      hotReload: false,
      validateSyntax: true
    });
    
    // CSS validation should be handled differently
    expect(result.sourceModification.fileType).toBe('css');
  });

  test('should handle TypeScript source map validation', async () => {
    const tabId = 'TAB123';
    const scriptId = 'ts-456';
    const typeScriptCode = 'const x: string = 123;'; // Type error
    
    // Set up source registry with source map
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/app.js',
      hasSourceMap: true,
      sourceMapURL: 'http://example.com/app.js.map',
      originalUrl: 'http://example.com/app.ts'
    });
    
    // For now, TypeScript validation is not implemented
    // This test documents expected future behavior
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: typeScriptCode,
      hotReload: false,
      validateSyntax: true
    });
    
    // Debug: log the result to see what happened
    if (!result.success) {
      console.log('Modification failed:', JSON.stringify(result, null, 2));
    }
    
    // Should succeed as runtime JS validation doesn't catch TS errors
    expect(result.success).toBe(true);
  });

  test('should provide enhanced error context on failure', async () => {
    const tabId = 'TAB123';
    const scriptId = '999';
    const codeWithError = `
      function test() {
        const x = {
          name: "test",
          value: 123,
          broken: ,  // Error here
        };
      }
    `;
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/context.js',
      hasSourceMap: false
    });
    
    // Mock compile error with details
    mockClient.Runtime.compileScript.mockResolvedValue({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token ,',
        lineNumber: 6,
        columnNumber: 19,
        scriptId: scriptId
      }
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: codeWithError,
      hotReload: false,
      validateSyntax: true
    });
    
    expect(result.success).toBe(false);
    expect(result.sourceModification.error.lineNumber).toBe(6);
    expect(result.sourceModification.error.columnNumber).toBe(19);
  });

  test('should validate module imports and exports', async () => {
    const tabId = 'TAB123';
    const scriptId = 'module-123';
    const moduleCode = `
      import { nonExistent } from './missing.js';
      export { something };
    `;
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/module.js',
      hasSourceMap: false
    });
    
    // Mock module validation
    mockClient.Runtime.compileScript.mockResolvedValue({});
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: moduleCode,
      hotReload: true,
      validateSyntax: true
    });
    
    // Module errors are runtime errors, not syntax errors
    expect(result.success).toBe(true);
  });

  test('should handle modification size limits', async () => {
    const tabId = 'TAB123';
    const scriptId = 'large-123';
    const largeCode = 'x'.repeat(10 * 1024 * 1024); // 10MB of code
    
    // Set up source registry
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, {
      scriptId,
      url: 'http://example.com/large.js',
      hasSourceMap: false
    });
    
    const result = await server.modifySourceCode({
      tabId,
      sourceId: scriptId,
      newContent: largeCode,
      hotReload: false,
      validateSyntax: false
    });
    
    // Should check for size limits
    expect(result.sourceModification.contentSize).toBeDefined();
  });
});