import 'dotenv/config';
import { ChromeDevToolsMCPServer } from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF2.2: Implement File Type Detection', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const mockTabId = 'A1B2C3D4E5F67890123456789012345F';
  
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
          scriptSource: 'console.log("original");'
        }),
        setScriptSource: jest.fn().mockResolvedValue({
          status: 'Ok'
        })
      },
      send: jest.fn().mockImplementation((method) => {
        if (method === 'Debugger.getScriptSource') {
          return Promise.resolve({ scriptSource: 'console.log("original");' });
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
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should detect .ts file and use TypeScript validation', async () => {
    // Add TypeScript source file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-ts', {
      scriptId: 'script-ts',
      url: 'http://example.com/app.ts',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const tsCode = `
      interface User {
        name: string;
      }
      const user: User = { name: "John" };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-ts',
      newContent: tsCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('typescript');
  });

  test('should detect .tsx file and use TypeScript validation with JSX', async () => {
    // Add TSX source file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-tsx', {
      scriptId: 'script-tsx',
      url: 'http://example.com/Component.tsx',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const tsxCode = `
      export const Button = ({ label }: { label: string }) => {
        return <button>{label}</button>;
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-tsx',
      newContent: tsxCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('typescript');
  });

  test('should handle mixed file types in same session', async () => {
    // Add multiple source files with different types
    const sourceRegistry = new Map();
    sourceRegistry.set('script-js', {
      scriptId: 'script-js',
      url: 'http://example.com/app.js',
      hasSourceMap: false,
      length: 100
    });
    sourceRegistry.set('script-ts', {
      scriptId: 'script-ts',
      url: 'http://example.com/types.ts',
      hasSourceMap: false,
      length: 100
    });
    sourceRegistry.set('script-tsx', {
      scriptId: 'script-tsx',
      url: 'http://example.com/Component.tsx',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    // Test JavaScript file
    const jsResult = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-js',
      newContent: 'console.log("JavaScript");',
      validateSyntax: true
    });
    
    expect(jsResult.success).toBe(true);
    expect(jsResult.sourceModification.fileType).toBe('javascript');
    
    // Test TypeScript file
    const tsResult = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-ts',
      newContent: 'const value: string = "TypeScript";',
      validateSyntax: true
    });
    
    expect(tsResult.success).toBe(true);
    expect(tsResult.sourceModification.fileType).toBe('typescript');
    
    // Test TSX file
    const tsxResult = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-tsx',
      newContent: 'const element = <div>TSX</div>;',
      validateSyntax: true
    });
    
    expect(tsxResult.success).toBe(true);
    expect(tsxResult.sourceModification.fileType).toBe('typescript');
  });

  test('should use correct validator based on file extension', async () => {
    // Add a TypeScript file with invalid TypeScript syntax
    const sourceRegistry = new Map();
    sourceRegistry.set('script-ts', {
      scriptId: 'script-ts',
      url: 'http://example.com/app.ts',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    // This is invalid TypeScript (missing type)
    const invalidTsCode = `
      interface User {
        name: // missing type
      }
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-ts',
      newContent: invalidTsCode,
      validateSyntax: true
    });
    
    // Should fail validation
    expect(result.success).toBe(false);
    expect(result.sourceModification.error.type).toBe('SyntaxError');
  });

  test('should detect .jsx files', async () => {
    // Add JSX source file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-jsx', {
      scriptId: 'script-jsx',
      url: 'http://example.com/Component.jsx',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const jsxCode = `
      const Button = ({ label }) => {
        return <button>{label}</button>;
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-jsx',
      newContent: jsxCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('javascript'); // JSX is treated as JS
  });

  test('should detect .mjs files as JavaScript', async () => {
    // Add ES module file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-mjs', {
      scriptId: 'script-mjs',
      url: 'http://example.com/module.mjs',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const mjsCode = `
      export const greet = (name) => {
        return \`Hello, \${name}!\`;
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-mjs',
      newContent: mjsCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('javascript');
  });

  test('should handle files without extensions', async () => {
    // Add file without extension
    const sourceRegistry = new Map();
    sourceRegistry.set('script-none', {
      scriptId: 'script-none',
      url: 'http://example.com/script',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const code = 'console.log("No extension");';
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-none',
      newContent: code,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('unknown');
  });

  test('should handle query parameters in URLs', async () => {
    // Add file with query parameters
    const sourceRegistry = new Map();
    sourceRegistry.set('script-query', {
      scriptId: 'script-query',
      url: 'http://example.com/app.ts?version=1.2.3&cache=false',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
    
    const tsCode = 'const version: string = "1.2.3";';
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-query',
      newContent: tsCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.fileType).toBe('typescript');
  });
});