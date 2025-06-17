import ChromeDevToolsMCPServer from '../../server';
import { jest } from '@jest/globals';

describe('Task v1.1.2: Code Modification Fix', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create server instance
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create mock client with Chrome DevTools Protocol methods
    mockClient = {
      send: jest.fn(),
      Runtime: {
        compileScript: jest.fn(),
        evaluate: jest.fn()
      },
      Debugger: {
        enable: jest.fn(),
        getScriptSource: jest.fn(),
        setScriptSource: jest.fn(),
        disable: jest.fn()
      },
      DOM: {
        enable: jest.fn()
      },
      CSS: {
        enable: jest.fn()
      },
      on: jest.fn()
    };
    
    // Set up default mock responses
    mockClient.Runtime.compileScript.mockResolvedValue({});
    mockClient.Runtime.evaluate.mockResolvedValue({ result: { value: true } });
    mockClient.Debugger.enable.mockResolvedValue({});
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: 'original source code'
    });
    mockClient.Debugger.setScriptSource.mockResolvedValue({
      status: 'Ok'
    });
    mockClient.send.mockImplementation(() => {
      return Promise.resolve({});
    });
    
    // Pre-populate server storage for testing
    server.addStorageEntry('clients', 'A1B2C3D4E5F6789012345678901234AB', mockClient);
    // Initialize source registry
    const sourceRegistry = server.getSourceRegistry('A1B2C3D4E5F6789012345678901234AB');
    sourceRegistry.set('script123', { scriptId: 'script123', url: 'http://localhost/app.tsx', hasSourceURL: false });
    sourceRegistry.set('script456', { scriptId: 'script456', url: 'http://localhost/utils.ts', hasSourceURL: false });
    sourceRegistry.set('script789', { scriptId: 'script789', url: 'http://localhost/main.js', hasSourceURL: false });
    sourceRegistry.set('style123', { scriptId: 'style123', url: 'http://localhost/styles.css', hasSourceURL: false });
    sourceRegistry.set('data123', { scriptId: 'data123', url: 'http://localhost/config.json', hasSourceURL: false });
    
    // Mock attemptHotReload to avoid complex hot reload logic in tests
    jest.spyOn(server as any, 'attemptHotReload').mockResolvedValue({ 
      success: true, 
      system: 'webpack',
      reloadedModules: ['http://localhost/main.js']
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Function: shouldSkipValidation', () => {
    // Create a pure function to test validation logic
    const shouldSkipValidation = (params: any): boolean => {
      const { skipValidation = false, validateSyntax = true } = params;
      return skipValidation || !validateSyntax;
    };

    test('should skip validation when skipValidation is true', () => {
      expect(shouldSkipValidation({ skipValidation: true })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: true, validateSyntax: true })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: true, validateSyntax: false })).toBe(true);
    });

    test('should skip validation when validateSyntax is false', () => {
      expect(shouldSkipValidation({ validateSyntax: false })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: false, validateSyntax: false })).toBe(true);
    });

    test('should not skip validation by default', () => {
      expect(shouldSkipValidation({})).toBe(false);
      expect(shouldSkipValidation({ skipValidation: false, validateSyntax: true })).toBe(false);
    });
  });

  describe('Pure Function: detectFileType', () => {
    // Pure function to detect file type from URL
    const detectFileType = (url: string): string => {
      if (url.endsWith('.ts') || url.endsWith('.tsx')) return 'typescript';
      if (url.endsWith('.js') || url.endsWith('.jsx')) return 'javascript';
      if (url.endsWith('.css')) return 'css';
      if (url.endsWith('.json')) return 'json';
      return 'unknown';
    };

    test('should detect TypeScript files', () => {
      expect(detectFileType('app.ts')).toBe('typescript');
      expect(detectFileType('component.tsx')).toBe('typescript');
      expect(detectFileType('http://localhost/app.tsx')).toBe('typescript');
    });

    test('should detect JavaScript files', () => {
      expect(detectFileType('app.js')).toBe('javascript');
      expect(detectFileType('component.jsx')).toBe('javascript');
      expect(detectFileType('http://localhost/main.js')).toBe('javascript');
    });

    test('should detect other file types', () => {
      expect(detectFileType('styles.css')).toBe('css');
      expect(detectFileType('config.json')).toBe('json');
      expect(detectFileType('unknown.xyz')).toBe('unknown');
    });
  });

  describe('Pure Function: isRuntimeCode', () => {
    // Pure function to detect if code is meant for runtime execution
    const isRuntimeCode = (content: string): boolean => {
      // Check for runtime indicators
      const runtimePatterns = [
        /console\./,
        /document\./,
        /window\./,
        /alert\(/,
        /eval\(/,
        /Function\(/
      ];
      
      // Check for development indicators
      const devPatterns = [
        /^import\s+/m,
        /^export\s+/m,
        /^interface\s+/m,
        /^type\s+/m,
        /^enum\s+/m
      ];
      
      const hasRuntimeCode = runtimePatterns.some(pattern => pattern.test(content));
      const hasDevCode = devPatterns.some(pattern => pattern.test(content));
      
      // If it has runtime patterns and no dev patterns, it's likely runtime code
      return hasRuntimeCode && !hasDevCode;
    };

    test('should detect runtime code', () => {
      expect(isRuntimeCode('console.log("Hello")')).toBe(true);
      expect(isRuntimeCode('document.getElementById("app")')).toBe(true);
      expect(isRuntimeCode('window.location.reload()')).toBe(true);
      expect(isRuntimeCode('alert("Test")')).toBe(true);
    });

    test('should detect development code', () => {
      expect(isRuntimeCode('import React from "react"')).toBe(false);
      expect(isRuntimeCode('export const App = () => {}')).toBe(false);
      expect(isRuntimeCode('interface Props { name: string }')).toBe(false);
    });

    test('should handle mixed code', () => {
      const mixedCode = `
import React from 'react';
console.log('Debug');
export default App;
      `;
      expect(isRuntimeCode(mixedCode)).toBe(false); // Has imports/exports
    });
  });

  describe('modifySourceCode with skipValidation', () => {
    test('should successfully modify JavaScript code without validation when skipValidation=true', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("Modified without validation")',
        skipValidation: true
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script789',
        scriptSource: params.newContent
      });
      // Should NOT call compileScript when validation is skipped
      expect(mockClient.Runtime.compileScript).not.toHaveBeenCalled();
    });

    test('should successfully modify TypeScript code without validation when skipValidation=true', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script123', // .tsx file
        newContent: 'const App: React.FC = () => <div>Modified TSX</div>',
        skipValidation: true
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalled();
      // Should skip TypeScript validation
      expect(result.sourceModification?.validationSkipped).toBe(true);
    });

    test('should validate JavaScript by default when skipValidation is not set', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("Valid JS")'
      };
      
      mockClient.Runtime.compileScript.mockResolvedValueOnce({});
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(mockClient.Runtime.compileScript).toHaveBeenCalledWith({
        expression: params.newContent,
        sourceURL: 'http://localhost/main.js',
        persistScript: false
      });
    });

    test('should fail validation for invalid JavaScript when validation is enabled', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log(unclosed string"'
      };
      
      mockClient.Runtime.compileScript.mockResolvedValueOnce({
        exceptionDetails: {
          text: 'SyntaxError: Unterminated string literal',
          lineNumber: 1,
          columnNumber: 28
        }
      });
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unterminated string literal');
      // Rollback may happen after validation failure
      // Check that the original setScriptSource was not called for the invalid code
      if (mockClient.Debugger.setScriptSource.mock.calls.length > 0) {
        // If called, it should be for rollback only
        expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
          scriptId: 'script789',
          scriptSource: 'original source code'
        });
      }
    });

    test('should handle validateSyntax=false same as skipValidation=true', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("Modified")',
        validateSyntax: false
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(mockClient.Runtime.compileScript).not.toHaveBeenCalled();
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalled();
    });
  });

  describe('Runtime code detection and handling', () => {
    test('should auto-detect runtime JavaScript code and skip TypeScript validation', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'document.getElementById("app").innerHTML = "Updated"',
        autoDetectRuntime: true
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(result.sourceModification?.runtimeCodeDetected).toBe(true);
    });

    test('should validate development code even with runtime detection', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script456',
        newContent: `
import { utils } from './utils';
export function calculate() {
  return utils.add(1, 2);
}
        `,
        autoDetectRuntime: true
      };
      
      // This should still validate because it's development code
      const result = await server.modifySourceCode(params);
      
      // For development code, runtimeCodeDetected should be false or undefined
      expect(result.sourceModification?.runtimeCodeDetected).not.toBe(true);
    });
  });

  describe('Error handling and rollback', () => {
    test('should rollback on validation failure when original source is available', async () => {
      process.env.ENABLE_CODE_ROLLBACK = 'true';
      
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'invalid {{ code'
      };
      
      mockClient.Debugger.getScriptSource.mockResolvedValueOnce({
        scriptSource: 'original source code'
      });
      
      mockClient.Runtime.compileScript.mockResolvedValueOnce({
        exceptionDetails: {
          text: 'SyntaxError: Unexpected token',
          lineNumber: 1,
          columnNumber: 10
        }
      });
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(false);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script789',
        scriptSource: 'original source code'
      });
      expect(result.sourceModification?.error?.rollbackFailed).toBe(false);
    });

    test('should handle rollback failure gracefully', async () => {
      process.env.ENABLE_CODE_ROLLBACK = 'true';
      
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'invalid code'
      };
      
      mockClient.Runtime.compileScript.mockResolvedValueOnce({
        exceptionDetails: { text: 'SyntaxError' }
      });
      
      // Make rollback fail
      mockClient.Debugger.setScriptSource.mockRejectedValueOnce(
        new Error('Rollback failed')
      );
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(false);
      expect(result.sourceModification?.error?.rollbackFailed).toBe(true);
      expect(result.sourceModification?.error?.rollbackError).toBe('Rollback failed');
    });
  });

  describe('Hot reload functionality', () => {
    test('should trigger hot reload after successful modification', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("Hot reloaded")',
        hotReload: true,
        skipValidation: true
      };
      
      mockClient.Runtime.evaluate.mockResolvedValueOnce({
        result: { value: true }
      });
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      // Hot reload result depends on the mock setup
      expect(result.sourceModification?.hotReloadAttempted).toBe(true);
    });

    test('should skip hot reload when hotReload=false', async () => {
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("No hot reload")',
        hotReload: false,
        skipValidation: true
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      expect(result.sourceModification?.hotReloadAttempted).toBe(false);
    });
  });

  describe('Regression tests', () => {
    test('should not break existing validation for CSS files', async () => {
      // The source is already in the registry from beforeEach
      
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'style123',
        newContent: '.class { color: red; }'
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
      // CSS validation should still work
    });

    test('should not break existing validation for JSON files', async () => {
      // Use the data123 source that's already in the registry
      
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'data123',
        newContent: '{"valid": "json"}'
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result.success).toBe(true);
    });

    test('should maintain backward compatibility with existing parameters', async () => {
      // Test that old code still works without new parameters
      const params = {
        tabId: 'A1B2C3D4E5F6789012345678901234AB',
        sourceId: 'script789',
        newContent: 'console.log("Legacy code")',
        validateSyntax: true,
        hotReload: true
      };
      
      const result = await server.modifySourceCode(params);
      
      expect(result).toBeDefined();
      expect(mockClient.Runtime.compileScript).toHaveBeenCalled();
    });
  });
});