import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF2.1: Add TypeScript/JSX Syntax Validation', () => {
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
    
    // Add source file to registry
    const sourceRegistry = new Map();
    sourceRegistry.set('script-1', {
      scriptId: 'script-1',
      url: 'http://example.com/app.ts',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should validate TypeScript interface syntax', async () => {
    const tsCode = `
      interface User {
        id: number;
        name: string;
        email: string;
      }
      
      const user: User = {
        id: 1,
        name: "John",
        email: "john@example.com"
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: tsCode,
      validateSyntax: true
    });
    
    // Should pass validation for TypeScript
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully modified');
  });

  test('should validate JSX component syntax', async () => {
    // Update source URL to .tsx
    const sourceRegistry = (server as any).sourceFiles.get(mockTabId);
    sourceRegistry.set('script-2', {
      scriptId: 'script-2',
      url: 'http://example.com/Component.tsx',
      hasSourceMap: false,
      length: 100
    });
    
    const jsxCode = `
      import React from 'react';
      
      interface Props {
        title: string;
        count: number;
      }
      
      export const Counter: React.FC<Props> = ({ title, count }) => {
        return (
          <div className="counter">
            <h1>{title}</h1>
            <span>Count: {count}</span>
          </div>
        );
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-2',
      newContent: jsxCode,
      validateSyntax: true
    });
    
    // Should pass validation for JSX
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully modified');
  });

  test('should validate async/await syntax', async () => {
    const asyncCode = `
      async function fetchData(): Promise<any> {
        try {
          const response = await fetch('/api/data');
          const data = await response.json();
          return data;
        } catch (error) {
          console.error('Failed to fetch:', error);
          throw error;
        }
      }
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: asyncCode,
      validateSyntax: true
    });
    
    // Should pass validation
    expect(result.success).toBe(true);
  });

  test('should validate decorators and generics', async () => {
    const advancedTsCode = `
      function Logger(target: any, propertyKey: string) {
        console.log(\`Property \${propertyKey} accessed\`);
      }
      
      class Container<T> {
        private items: T[] = [];
        
        @Logger
        add(item: T): void {
          this.items.push(item);
        }
        
        get<K extends keyof T>(index: number, key: K): T[K] {
          return this.items[index][key];
        }
      }
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: advancedTsCode,
      validateSyntax: true
    });
    
    // Should pass validation
    expect(result.success).toBe(true);
  });

  test('should use TypeScript compiler options from environment', async () => {
    // Set custom TS compiler options
    process.env.TS_COMPILER_OPTIONS = '{"jsx": "react", "target": "es2020", "strictNullChecks": true}';
    
    const strictTsCode = `
      let value: string | null = null;
      // This would fail with strictNullChecks
      // let length: number = value.length; // Error!
      let length: number = value?.length ?? 0; // OK
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: strictTsCode,
      validateSyntax: true
    });
    
    expect(result.success).toBe(true);
    
    // Reset env
    delete process.env.TS_COMPILER_OPTIONS;
  });

  test('should detect TypeScript syntax errors', async () => {
    const invalidTsCode = `
      interface User {
        name: string;
        // Missing closing brace
      
      const user: User = { name: "John" };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: invalidTsCode,
      validateSyntax: true
    });
    
    // Should fail validation
    expect(result.success).toBe(false);
    expect(result.error).toContain(';'); // TypeScript expects a semicolon
    expect(result.sourceModification.error.type).toBe('SyntaxError');
  });

  test('should detect JSX syntax errors', async () => {
    // Update source URL to .tsx
    const sourceRegistry = (server as any).sourceFiles.get(mockTabId);
    sourceRegistry.set('script-3', {
      scriptId: 'script-3',
      url: 'http://example.com/BadComponent.tsx',
      hasSourceMap: false,
      length: 100
    });
    
    const invalidJsxCode = `
      export const BadComponent = () => {
        return (
          <div>
            <span>Unclosed tag
          </div>
        );
      };
    `;
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-3',
      newContent: invalidJsxCode,
      validateSyntax: true
    });
    
    // Should fail validation
    expect(result.success).toBe(false);
    expect(result.error).toContain('JSX element');
    expect(result.sourceModification.error.type).toBe('SyntaxError');
  });
});