import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.SOURCE_DISCOVERY_TIMEOUT = '5000';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 16.2: Source Code Discovery and Targeting', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      on: jest.fn(),
      Runtime: {
        enable: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn()
      },
      Debugger: {
        enable: jest.fn().mockResolvedValue({}),
        setBreakpointsActive: jest.fn().mockResolvedValue({})
      },
      Page: {
        enable: jest.fn().mockResolvedValue({}),
        getResourceTree: jest.fn()
      },
      Network: {
        enable: jest.fn().mockResolvedValue({})
      },
      Console: {
        enable: jest.fn().mockResolvedValue({})
      }
    };
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should have source file registry in server', () => {
    // The server should have a way to store discovered source files
    expect(server).toHaveProperty('sourceFiles');
    expect(server.sourceFiles).toBeInstanceOf(Map);
  });

  test('should discover JavaScript source files via Debugger.scriptParsed', async () => {
    const tabId = 'TAB123';
    const scriptId = '123';
    const url = 'http://example.com/app.js';
    
    // Mock the scriptParsed event
    const scriptParsedHandler = jest.fn();
    mockClient.on.mockImplementation((event: string, handler: any) => {
      if (event === 'Debugger.scriptParsed') {
        scriptParsedHandler.mockImplementation(handler);
      }
    });
    
    // Initialize source discovery
    await server.initializeSourceDiscovery(tabId, mockClient);
    
    // Verify Debugger domain was enabled
    expect(mockClient.Debugger.enable).toHaveBeenCalled();
    
    // Simulate a scriptParsed event
    scriptParsedHandler({
      scriptId,
      url,
      startLine: 0,
      startColumn: 0,
      endLine: 100,
      endColumn: 0,
      executionContextId: 1,
      hash: 'abc123',
      isLiveEdit: false,
      sourceMapURL: '',
      hasSourceURL: false,
      length: 1000
    });
    
    // Check that the source file was registered
    const sourceRegistry = server.getSourceRegistry(tabId);
    expect(sourceRegistry).toBeDefined();
    expect(sourceRegistry.has(scriptId)).toBe(true);
    expect(sourceRegistry.get(scriptId)).toMatchObject({
      scriptId,
      url,
      hasSourceMap: false
    });
  });

  test('should resolve source maps for TypeScript files', async () => {
    const tabId = 'TAB123';
    const scriptId = '456';
    const url = 'http://example.com/app.js';
    const sourceMapURL = 'http://example.com/app.js.map';
    
    // Mock scriptParsed with source map
    const scriptParsedHandler = jest.fn();
    mockClient.on.mockImplementation((event: string, handler: any) => {
      if (event === 'Debugger.scriptParsed') {
        scriptParsedHandler.mockImplementation(handler);
      }
    });
    
    await server.initializeSourceDiscovery(tabId, mockClient);
    
    // Simulate scriptParsed with source map
    scriptParsedHandler({
      scriptId,
      url,
      sourceMapURL,
      startLine: 0,
      startColumn: 0,
      endLine: 100,
      endColumn: 0,
      executionContextId: 1,
      hash: 'def456',
      isLiveEdit: false,
      hasSourceURL: false,
      length: 2000
    });
    
    const sourceRegistry = server.getSourceRegistry(tabId);
    const source = sourceRegistry.get(scriptId);
    expect(source.hasSourceMap).toBe(true);
    expect(source.sourceMapURL).toBe(sourceMapURL);
  });

  test('should target source files by URL pattern', async () => {
    const tabId = 'TAB123';
    
    // Set up multiple source files
    const sources = [
      { scriptId: '1', url: 'http://example.com/app.js' },
      { scriptId: '2', url: 'http://example.com/utils.js' },
      { scriptId: '3', url: 'http://example.com/components/header.js' }
    ];
    
    // Initialize and add sources
    await server.initializeSourceDiscovery(tabId, mockClient);
    const registry = server.getSourceRegistry(tabId);
    sources.forEach(source => {
      registry.set(source.scriptId, { ...source, hasSourceMap: false });
    });
    
    // Test URL pattern targeting
    const target1 = await server.resolveSourceTarget(tabId, 'app.js');
    expect(target1).toBeDefined();
    expect(target1.scriptId).toBe('1');
    
    const target2 = await server.resolveSourceTarget(tabId, 'components/header.js');
    expect(target2).toBeDefined();
    expect(target2.scriptId).toBe('3');
    
    const target3 = await server.resolveSourceTarget(tabId, 'nonexistent.js');
    expect(target3).toBeNull();
  });

  test('should target source files by script ID', async () => {
    const tabId = 'TAB123';
    const scriptId = '789';
    const url = 'http://example.com/main.js';
    
    await server.initializeSourceDiscovery(tabId, mockClient);
    const registry = server.getSourceRegistry(tabId);
    registry.set(scriptId, { scriptId, url, hasSourceMap: false });
    
    // Target by script ID (should work if ID is numeric)
    const target = await server.resolveSourceTarget(tabId, scriptId);
    expect(target).toBeDefined();
    expect(target.scriptId).toBe(scriptId);
    expect(target.url).toBe(url);
  });

  test('should handle original source resolution with source maps', async () => {
    const tabId = 'TAB123';
    const scriptId = '999';
    const generatedUrl = 'http://example.com/dist/bundle.js';
    const originalUrl = 'http://example.com/src/app.ts';
    const sourceMapURL = 'http://example.com/dist/bundle.js.map';
    
    await server.initializeSourceDiscovery(tabId, mockClient);
    const registry = server.getSourceRegistry(tabId);
    
    // Add source with source map
    registry.set(scriptId, {
      scriptId,
      url: generatedUrl,
      hasSourceMap: true,
      sourceMapURL,
      originalSource: originalUrl
    });
    
    // Resolve should return original source info
    const target = await server.resolveSourceTarget(tabId, 'app.ts');
    expect(target).toBeDefined();
    expect(target.originalSource).toBe(true);
    expect(target.originalUrl).toBe(originalUrl);
  });

  test('should clean up source registry on tab close', async () => {
    const tabId = 'TAB123';
    
    await server.initializeSourceDiscovery(tabId, mockClient);
    const registry = server.getSourceRegistry(tabId);
    registry.set('1', { scriptId: '1', url: 'test.js', hasSourceMap: false });
    
    expect(server.sourceFiles.has(tabId)).toBe(true);
    
    // Clean up
    server.cleanupSourceRegistry(tabId);
    expect(server.sourceFiles.has(tabId)).toBe(false);
  });
});