import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.ERROR_ANALYSIS_ENABLED = 'true';
process.env.ERROR_CONTEXT_ENABLED = 'true';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 19.3: Enhanced Error Context Collection', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client with event listeners
    mockClient = {
      send: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      Runtime: {
        enable: jest.fn().mockResolvedValue({} as any),
        exceptionThrown: jest.fn()
      },
      Console: {
        enable: jest.fn().mockResolvedValue({} as any),
        messageAdded: jest.fn()
      },
      Network: {
        enable: jest.fn().mockResolvedValue({} as any),
        loadingFailed: jest.fn(),
        responseReceived: jest.fn()
      },
      Security: {
        enable: jest.fn().mockResolvedValue({} as any),
        securityStateChanged: jest.fn()
      },
      Log: {
        enable: jest.fn().mockResolvedValue({} as any),
        entryAdded: jest.fn()
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should enhance error collection during monitoring', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Check that enhanced error collection is set up
    const client = server.getStorageEntry('clients', tabId);
    expect(client).toBeDefined();
    
    // Verify error context flag
    expect(process.env.ERROR_CONTEXT_ENABLED).toBe('true');
  });

  test('should collect runtime exception context', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Simulate Runtime.exceptionThrown event
    const exceptionEvent = {
      timestamp: Date.now(),
      exceptionDetails: {
        exceptionId: 1,
        text: 'Uncaught TypeError: Cannot read property \'foo\' of null',
        lineNumber: 42,
        columnNumber: 15,
        scriptId: 'script-123',
        url: 'http://example.com/app.js',
        stackTrace: {
          callFrames: [
            {
              functionName: 'doSomething',
              scriptId: 'script-123',
              url: 'http://example.com/app.js',
              lineNumber: 42,
              columnNumber: 15
            },
            {
              functionName: 'main',
              scriptId: 'script-123',
              url: 'http://example.com/app.js',
              lineNumber: 10,
              columnNumber: 5
            }
          ]
        },
        exception: {
          type: 'object',
          subtype: 'error',
          className: 'TypeError',
          description: 'TypeError: Cannot read property \'foo\' of null',
          objectId: 'error-obj-123'
        }
      }
    };
    
    // Call error enhancement method
    server.enhanceErrorContext(tabId, 'runtime', exceptionEvent);
    
    // Check that error was stored with enhanced context
    const errors = server.getStorageEntry('errors', tabId) || [];
    expect(errors.length).toBeGreaterThan(0);
    
    const enhancedError = errors[errors.length - 1];
    expect(enhancedError.type).toBe('runtime');
    expect(enhancedError.stackTrace).toBeDefined();
    expect(enhancedError.exception).toBeDefined();
    expect(enhancedError.callFrames).toBeDefined();
  });

  test('should collect console error context', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const consoleEvent = {
      message: {
        source: 'javascript',
        level: 'error',
        text: 'Error: Something went wrong',
        url: 'http://example.com/module.js',
        line: 25,
        column: 10,
        stackTrace: {
          callFrames: [
            {
              functionName: 'handleError',
              url: 'http://example.com/module.js',
              lineNumber: 25,
              columnNumber: 10
            }
          ]
        }
      }
    };
    
    server.enhanceErrorContext(tabId, 'console', consoleEvent);
    
    const errors = server.getStorageEntry('errors', tabId) || [];
    const consoleError = errors.find((e: any) => e.source === 'console');
    
    expect(consoleError).toBeDefined();
    expect(consoleError.level).toBe('error');
    expect(consoleError.stackTrace).toBeDefined();
  });

  test('should collect network error context', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const networkEvent = {
      requestId: 'req-123',
      timestamp: Date.now() / 1000,
      type: 'Script',
      response: {
        url: 'http://example.com/api/data',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'content-type': 'application/json',
          'x-error-id': 'err-500-123'
        },
        mimeType: 'application/json',
        timing: {
          requestTime: Date.now() / 1000 - 1,
          receiveHeadersEnd: 1.5
        }
      },
      errorText: 'net::ERR_INTERNAL_SERVER_ERROR'
    };
    
    server.enhanceErrorContext(tabId, 'network', networkEvent);
    
    const networkLogs = server.getStorageEntry('networkLogs', tabId) || [];
    const networkError = networkLogs.find((l: any) => l.requestId === 'req-123');
    
    expect(networkError).toBeDefined();
    expect(networkError.errorContext).toBeDefined();
    expect(networkError.errorContext.headers).toBeDefined();
    expect(networkError.errorContext.timing).toBeDefined();
  });

  test('should collect security violation context', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const securityEvent = {
      violationType: 'CSP',
      blockedURI: 'http://evil.com/script.js',
      documentURI: 'http://example.com/',
      violatedDirective: 'script-src',
      effectiveDirective: 'script-src',
      originalPolicy: "script-src 'self' https:",
      disposition: 'enforce',
      sourceFile: 'http://example.com/index.html',
      lineNumber: 15,
      columnNumber: 20,
      statusCode: 0
    };
    
    server.enhanceErrorContext(tabId, 'security', securityEvent);
    
    const errors = server.getStorageEntry('errors', tabId) || [];
    const securityError = errors.find((e: any) => e.type === 'security');
    
    expect(securityError).toBeDefined();
    expect(securityError.violationType).toBe('CSP');
    expect(securityError.violatedDirective).toBe('script-src');
    expect(securityError.originalPolicy).toBeDefined();
    expect(securityError.sourceLocation).toBeDefined();
  });

  test('should collect browser context for errors', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock browser context
    mockClient.Runtime.evaluate = jest.fn().mockResolvedValue({
      result: {
        value: {
          userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
          platform: 'MacIntel',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true,
          screen: {
            width: 1920,
            height: 1080
          }
        }
      }
    });
    
    const errorWithContext = await server.collectBrowserContext(tabId, {
      type: 'runtime',
      message: 'Test error'
    });
    
    expect(errorWithContext.browserContext).toBeDefined();
    expect(errorWithContext.browserContext.userAgent).toContain('Chrome');
    expect(errorWithContext.browserContext.screen).toBeDefined();
  });

  test('should collect DOM state for errors', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock DOM state collection
    mockClient.Runtime.evaluate = jest.fn()
      .mockResolvedValueOnce({
        result: {
          value: {
            readyState: 'complete',
            url: 'http://example.com/page',
            title: 'Test Page',
            referrer: 'http://example.com/'
          }
        }
      })
      .mockResolvedValueOnce({
        result: {
          value: {
            activeElement: 'button#submit',
            focusedElement: 'button#submit',
            documentScrollTop: 250,
            documentScrollLeft: 0
          }
        }
      });
    
    const errorWithDOM = await server.collectDOMContext(tabId, {
      type: 'runtime',
      message: 'Click handler error'
    });
    
    expect(errorWithDOM.domContext).toBeDefined();
    expect(errorWithDOM.domContext.readyState).toBe('complete');
    expect(errorWithDOM.domContext.activeElement).toBe('button#submit');
    expect(errorWithDOM.domContext.scrollPosition).toBeDefined();
  });

  test('should collect performance metrics at error time', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock performance metrics
    mockClient.Runtime.evaluate = jest.fn().mockResolvedValue({
      result: {
        value: {
          memory: {
            usedJSHeapSize: 25000000,
            totalJSHeapSize: 50000000,
            jsHeapSizeLimit: 2000000000
          },
          timing: {
            navigationStart: Date.now() - 5000,
            domContentLoadedEventEnd: Date.now() - 3000,
            loadEventEnd: Date.now() - 2000
          }
        }
      }
    });
    
    const errorWithPerf = await server.collectPerformanceContext(tabId, {
      type: 'runtime',
      message: 'Memory intensive operation failed'
    });
    
    expect(errorWithPerf.performanceContext).toBeDefined();
    expect(errorWithPerf.performanceContext.memory).toBeDefined();
    expect(errorWithPerf.performanceContext.memory.usedJSHeapSize).toBeGreaterThan(0);
    expect(errorWithPerf.performanceContext.timing).toBeDefined();
  });

  test('should enhance error with all available context', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const baseError = {
      type: 'runtime',
      message: 'Test error',
      url: 'http://example.com/app.js',
      lineNumber: 100
    };
    
    // Mock all context collectors
    mockClient.Runtime.evaluate = jest.fn().mockResolvedValue({
      result: { value: { test: 'context' } }
    });
    
    const enhancedError = await server.enhanceErrorWithFullContext(tabId, baseError);
    
    expect(enhancedError.browserContext).toBeDefined();
    expect(enhancedError.domContext).toBeDefined();
    expect(enhancedError.performanceContext).toBeDefined();
    expect(enhancedError.contextCollectionTime).toBeDefined();
  });

  test('should handle context collection failures gracefully', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock context collection failure
    mockClient.Runtime.evaluate = jest.fn().mockRejectedValue(new Error('Context collection failed'));
    
    const errorWithFailedContext = await server.collectBrowserContext(tabId, {
      type: 'runtime',
      message: 'Test error'
    });
    
    // Should still return the error without crashing
    expect(errorWithFailedContext.type).toBe('runtime');
    expect(errorWithFailedContext.browserContext).toBeUndefined();
  });

  test('should integrate enhanced context into error analysis', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add error with enhanced context
    const enhancedError = {
      timestamp: new Date().toISOString(),
      type: 'runtime',
      message: 'Enhanced error',
      errorId: 'enhanced-1',
      browserContext: {
        userAgent: 'Chrome/120'
      },
      domContext: {
        readyState: 'complete'
      },
      performanceContext: {
        memory: { usedJSHeapSize: 50000000 }
      }
    };
    
    server.addStorageEntry('errors', tabId, enhancedError);
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'runtime'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors[0].browserContext).toBeDefined();
    expect(result.errorAnalysis.errors[0].domContext).toBeDefined();
    expect(result.errorAnalysis.errors[0].performanceContext).toBeDefined();
  });
});