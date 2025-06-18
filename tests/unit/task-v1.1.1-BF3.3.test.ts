import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';
import CDP from 'chrome-remote-interface';
import * as fs from 'fs';

jest.mock('chrome-remote-interface');
jest.mock('fs');

describe('Task v1.1.1-BF3.3: Add Stack Trace Source Mapping', () => {
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
        evaluate: jest.fn().mockResolvedValue({
          result: { value: true }
        }),
        on: jest.fn()
      },
      Console: { 
        enable: jest.fn().mockResolvedValue({})
      },
      Network: {
        enable: jest.fn().mockResolvedValue({}),
        on: jest.fn(),
        getResponseBody: jest.fn()
      },
      Page: {
        enable: jest.fn().mockResolvedValue({})
      },
      DOM: {
        enable: jest.fn().mockResolvedValue({})
      },
      Debugger: {
        enable: jest.fn().mockResolvedValue({}),
        on: jest.fn(),
        getScriptSource: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn()
    };
    
    // Mock CDP to return our mock client
    (CDP as unknown as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    delete process.env.ENABLE_SOURCE_MAPS;
  });

  test('should detect source map URLs in stack traces', async () => {
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    // Start monitoring
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Simulate an error with source map comment
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: Cannot read property',
        lineNumber: 1,
        columnNumber: 1000,
        url: 'http://example.com/app.min.js',
        scriptId: 'script-123',
        stackTrace: {
          callFrames: [{
            functionName: 'n',
            scriptId: 'script-123',
            url: 'http://example.com/app.min.js',
            lineNumber: 1,
            columnNumber: 1000
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    // Mock source map URL detection
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: 'minified code here\n//# sourceMappingURL=app.min.js.map'
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors.length).toBe(1);
    expect(errorHistory.errors[0].metadata.sourceMapUrl).toBe('http://example.com/app.min.js.map');
  });

  test('should map minified stack traces to original source', async () => {
    process.env.ENABLE_SOURCE_MAPS = 'true';
    
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Mock source map file
    const mockSourceMap = {
      version: 3,
      sources: ['src/components/Button.tsx'],
      names: ['handleClick'],
      mappings: 'AAAA',
      sourcesContent: ['export function handleClick() {\n  throw new Error("Test error");\n}']
    };
    
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSourceMap));
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Simulate error with minified stack
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Error: Test error',
        lineNumber: 1,
        columnNumber: 2000,
        url: 'http://example.com/bundle.min.js',
        scriptId: 'script-456',
        stackTrace: {
          callFrames: [{
            functionName: 'a',
            scriptId: 'script-456',
            url: 'http://example.com/bundle.min.js',
            lineNumber: 1,
            columnNumber: 2000
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    // Mock script source for source map URL
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: '//# sourceMappingURL=bundle.min.js.map'
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId,
      mapSourceLocations: true
    });
    
    expect(errorHistory.errors.length).toBe(1);
    const mappedStack = errorHistory.errors[0].mappedStackTrace;
    expect(mappedStack).toBeDefined();
    expect(mappedStack[0].source).toBe('src/components/Button.tsx');
    expect(mappedStack[0].functionName).toBe('a'); // Original minified name is preserved for now
    expect(mappedStack[0].line).toBeGreaterThan(0);
  });

  test('should handle relative source map URLs', async () => {
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'ReferenceError: foo is not defined',
        url: 'http://example.com/js/app.min.js',
        scriptId: 'script-relative',
        lineNumber: 1,
        columnNumber: 500,
        stackTrace: {
          callFrames: [{
            url: 'http://example.com/js/app.min.js',
            lineNumber: 1,
            columnNumber: 500
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    // Mock relative source map URL
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: '//# sourceMappingURL=../maps/app.min.js.map'
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors[0].metadata.sourceMapUrl).toBe('http://example.com/maps/app.min.js.map');
  });

  test('should handle inline source maps', async () => {
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Error: Inline source map test',
        url: 'http://example.com/inline.js',
        scriptId: 'script-inline',
        lineNumber: 5,
        columnNumber: 10,
        stackTrace: {
          callFrames: [{
            url: 'http://example.com/inline.js',
            lineNumber: 5,
            columnNumber: 10
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    // Mock inline source map (base64 encoded)
    const inlineSourceMap = Buffer.from(JSON.stringify({
      version: 3,
      sources: ['original.js'],
      mappings: 'AAAA'
    })).toString('base64');
    
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: `//# sourceMappingURL=data:application/json;base64,${inlineSourceMap}`
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors[0].metadata.hasInlineSourceMap).toBe(true);
  });

  test('should fallback gracefully when source maps are missing', async () => {
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Error: No source map',
        url: 'http://example.com/no-map.js',
        stackTrace: {
          callFrames: [{
            functionName: 'mysteryFunction',
            url: 'http://example.com/no-map.js',
            lineNumber: 42,
            columnNumber: 13
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    // No source map comment
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: 'console.log("no source map here");'
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId,
      mapSourceLocations: true
    });
    
    expect(errorHistory.errors.length).toBe(1);
    expect(errorHistory.errors[0].mappedStackTrace).toBeUndefined();
    expect(errorHistory.errors[0].stackTrace).toBeDefined();
    expect(errorHistory.errors[0].stackTrace.callFrames[0].functionName).toBe('mysteryFunction');
  });

  test('should respect ENABLE_SOURCE_MAPS environment variable', async () => {
    process.env.ENABLE_SOURCE_MAPS = 'false';
    
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Error: Source maps disabled',
        url: 'http://example.com/app.js',
        stackTrace: {
          callFrames: [{
            url: 'http://example.com/app.js',
            lineNumber: 1,
            columnNumber: 1
          }]
        }
      },
      timestamp: Date.now() / 1000
    });
    
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: '//# sourceMappingURL=app.js.map'
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId,
      mapSourceLocations: true
    });
    
    // Should not attempt to map when disabled
    expect(errorHistory.errors[0].mappedStackTrace).toBeUndefined();
    expect(mockClient.Debugger.getScriptSource).not.toHaveBeenCalled();
  });

  test('should cache source map lookups', async () => {
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Set up mock before adding errors
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: '//# sourceMappingURL=cached.js.map'
    });
    
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    // Same script, multiple errors
    for (let i = 0; i < 3; i++) {
      exceptionHandler({
        exceptionDetails: {
          text: `Error ${i}`,
          url: 'http://example.com/cached.js',
          scriptId: 'script-cached',
          stackTrace: {
            callFrames: [{
              url: 'http://example.com/cached.js',
              lineNumber: i + 1,
              columnNumber: 10
            }]
          }
        },
        timestamp: (Date.now() + i * 1000) / 1000
      });
    }
    
    await server.getErrorHistory({
      tabId: mockTabId
    });
    
    // Clear mock to reset call count
    mockClient.Debugger.getScriptSource.mockClear();
    
    // Call again - should use cache
    await server.getErrorHistory({
      tabId: mockTabId
    });
    
    // Should not fetch again due to caching
    expect(mockClient.Debugger.getScriptSource).toHaveBeenCalledTimes(0);
  });
});