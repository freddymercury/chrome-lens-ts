import 'dotenv/config';
import { ChromeDevToolsMCPServer } from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF2.4: Integrate with Hot Module Reload', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const mockTabId = 'A1B2C3D4E5F67890123456789012345F';
  
  beforeEach(() => {
    jest.clearAllMocks();
    server = new ChromeDevToolsMCPServer();
    
    // Mock Chrome client with HMR support
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
    
    // Add source file
    const sourceRegistry = new Map();
    sourceRegistry.set('script-1', {
      scriptId: 'script-1',
      url: 'http://localhost:3000/src/app.js',
      hasSourceMap: false,
      length: 100
    });
    (server as any).sourceFiles.set(mockTabId, sourceRegistry);
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should trigger Vite HMR when available', async () => {
    // Mock Vite HMR detection
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ // Check for Vite
        result: {
          type: 'boolean',
          value: true
        }
      })
      .mockResolvedValueOnce({ // Trigger HMR
        result: {
          type: 'object',
          value: { success: true, reloadedModules: ['/src/app.js'] }
        }
      });
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("hot reloaded");',
      validateSyntax: false,
      hotReload: true
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(false);
    expect(result.affectedModules).toContain('http://localhost:3000/src/app.js');
    
    // Should check for Vite and trigger HMR
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.stringContaining('import.meta.hot')
      })
    );
  });

  test('should trigger Webpack HMR when available', async () => {
    // Mock Webpack HMR detection
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ // No Vite
        result: {
          type: 'boolean',
          value: false
        }
      })
      .mockResolvedValueOnce({ // Check for Webpack
        result: {
          type: 'boolean',
          value: true
        }
      })
      .mockResolvedValueOnce({ // Trigger HMR
        result: {
          type: 'object',
          value: { success: true, accepted: true }
        }
      });
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("webpack hot reloaded");',
      validateSyntax: false,
      hotReload: true
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(false);
    
    // Should check for Webpack module.hot
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.stringContaining('module.hot')
      })
    );
  });

  test('should fallback to page reload when HMR fails', async () => {
    // Mock HMR failure
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ // Check for Vite
        result: {
          type: 'boolean',
          value: true
        }
      })
      .mockRejectedValueOnce(new Error('HMR failed')); // HMR attempt fails
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("fallback reload");',
      validateSyntax: false,
      hotReload: true
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(true);
    
    // Should have attempted page reload
    expect(mockClient.Page.enable).toHaveBeenCalled();
    expect(mockClient.Page.reload).toHaveBeenCalled();
  });

  test('should skip HMR when hotReload is false', async () => {
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("no hot reload");',
      validateSyntax: false,
      hotReload: false
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.hotReloadAttempted).toBe(false);
    
    // Should not check for HMR
    expect(mockClient.Runtime.evaluate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.stringContaining('import.meta.hot')
      })
    );
    
    // Should not reload page
    expect(mockClient.Page.reload).not.toHaveBeenCalled();
  });

  test('should detect and use appropriate HMR system', async () => {
    // Add multiple source files
    const sourceRegistry = (server as any).sourceFiles.get(mockTabId);
    sourceRegistry.set('script-vite', {
      scriptId: 'script-vite',
      url: 'http://localhost:5173/src/components/Button.tsx',
      hasSourceMap: true,
      length: 200
    });
    
    // Mock Vite project (port 5173)
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ // Check for Vite
        result: {
          type: 'boolean',
          value: true
        }
      })
      .mockResolvedValueOnce({ // Trigger HMR
        result: {
          type: 'object',
          value: { 
            success: true, 
            reloadedModules: ['/src/components/Button.tsx'],
            hmrPayload: { type: 'update', path: '/src/components/Button.tsx' }
          }
        }
      });
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-vite',
      newContent: 'export const Button = () => <button>Updated</button>;',
      validateSyntax: false,
      hotReload: true
    });
    
    expect(result.success).toBe(true);
    expect(result.reloadRequired).toBe(false);
    expect(result.sourceModification.hotReloadSystem).toBe('vite');
  });

  test('should handle HMR boundary updates', async () => {
    // Mock HMR with boundary updates
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ // Check for Vite
        result: {
          type: 'boolean',
          value: true
        }
      })
      .mockResolvedValueOnce({ // Trigger HMR with boundaries
        result: {
          type: 'object',
          value: { 
            success: true,
            reloadedModules: ['/src/app.js'],
            boundaries: ['/src/index.js', '/src/App.tsx'],
            propagated: true
          }
        }
      });
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("boundary update");',
      validateSyntax: false,
      hotReload: true
    });
    
    expect(result.success).toBe(true);
    expect(result.affectedModules).toHaveLength(3); // Original + 2 boundaries
    expect(result.sourceModification.hmrBoundaries).toBeDefined();
    expect(result.sourceModification.hmrBoundaries).toContain('/src/index.js');
    expect(result.sourceModification.hmrBoundaries).toContain('/src/App.tsx');
  });

  test('should respect HMR environment variables', async () => {
    // Set environment to disable HMR
    process.env.DISABLE_HMR = 'true';
    
    const result = await server.modifySourceCode({
      tabId: mockTabId,
      sourceId: 'script-1',
      newContent: 'console.log("hmr disabled");',
      validateSyntax: false,
      hotReload: true // Even though requested, should be disabled
    });
    
    expect(result.success).toBe(true);
    expect(result.sourceModification.hotReloadAttempted).toBe(false);
    expect(result.sourceModification.hmrDisabledReason).toBe('Environment variable DISABLE_HMR is set');
    
    // Should not attempt HMR
    expect(mockClient.Runtime.evaluate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        expression: expect.stringContaining('import.meta.hot')
      })
    );
    
    delete process.env.DISABLE_HMR;
  });
});