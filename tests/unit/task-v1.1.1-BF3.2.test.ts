import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';
import CDP from 'chrome-remote-interface';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF3.2: Implement Error History Storage', () => {
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
        on: jest.fn()
      },
      Page: {
        enable: jest.fn().mockResolvedValue({})
      },
      DOM: {
        enable: jest.fn().mockResolvedValue({})
      },
      Debugger: {
        enable: jest.fn().mockResolvedValue({}),
        on: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn()
    };
    
    // Mock CDP to return our mock client
    (CDP as unknown as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    // Reset environment variables
    delete process.env.MAX_ERROR_HISTORY;
  });

  test('should store errors with metadata', async () => {
    // Start monitoring to set up error handling
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Simulate an error with metadata
    const errorTimestamp = Date.now();
    mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1]({
        exceptionDetails: {
          text: 'TypeError: Cannot read property "foo" of undefined',
          lineNumber: 42,
          columnNumber: 15,
          url: 'http://example.com/app.js',
          scriptId: 'script-123',
          stackTrace: {
            callFrames: [{
              functionName: 'handleClick',
              scriptId: 'script-123',
              url: 'http://example.com/app.js',
              lineNumber: 42,
              columnNumber: 15
            }]
          },
          executionContextId: 1
        },
        timestamp: errorTimestamp / 1000
      });
    
    // Check error was stored with metadata
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.success).toBe(true);
    expect(errorHistory.errors.length).toBe(1);
    
    const storedError = errorHistory.errors[0];
    expect(storedError.message).toContain('TypeError');
    expect(storedError.timestamp).toBeDefined();
    expect(storedError.metadata).toMatchObject({
      url: 'http://example.com/app.js',
      lineNumber: 42,
      columnNumber: 15,
      scriptId: 'script-123',
      executionContextId: 1
    });
    expect(storedError.stackTrace).toBeDefined();
  });

  test('should enforce error history limit', async () => {
    // Set a small limit for testing
    process.env.MAX_ERROR_HISTORY = '5';
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Add 10 errors
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    for (let i = 0; i < 10; i++) {
      exceptionHandler({
        exceptionDetails: {
          text: `Error ${i}`,
          lineNumber: i,
          columnNumber: 0,
          url: 'http://example.com/test.js',
          scriptId: `script-${i}`
        },
        timestamp: (Date.now() + i * 1000) / 1000
      });
    }
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    // Should only keep the last 5 errors
    expect(errorHistory.errors.length).toBe(5);
    expect(errorHistory.errors[0].message).toContain('Error 5');
    expect(errorHistory.errors[4].message).toContain('Error 9');
  });

  test('should support time-based filtering', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const baseTime = Date.now();
    const exceptionHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'exceptionThrown')?.[1];
    
    // Add errors at different times
    exceptionHandler({
      exceptionDetails: {
        text: 'Old error',
        url: 'http://example.com/old.js'
      },
      timestamp: (baseTime - 3600000) / 1000 // 1 hour ago
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Recent error',
        url: 'http://example.com/recent.js'
      },
      timestamp: (baseTime - 300000) / 1000 // 5 minutes ago
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'Current error',
        url: 'http://example.com/current.js'
      },
      timestamp: baseTime / 1000 // now
    });
    
    // Get errors from last 10 minutes
    const recentErrors = await server.getErrorHistory({
      tabId: mockTabId,
      since: baseTime - 600000 // 10 minutes ago
    });
    
    expect(recentErrors.errors.length).toBe(2);
    expect(recentErrors.errors[0].message).toContain('Recent error');
    expect(recentErrors.errors[1].message).toContain('Current error');
  });

  test('should store console errors in history', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Simulate console error
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Console error message'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1,
      stackTrace: {
        callFrames: [{
          functionName: 'logError',
          url: 'http://example.com/logger.js',
          lineNumber: 10,
          columnNumber: 5
        }]
      }
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors.length).toBeGreaterThan(0);
    const consoleError = errorHistory.errors.find((e: any) => e.source === 'console');
    expect(consoleError).toBeDefined();
    expect(consoleError?.message).toContain('Console error message');
  });

  test('should handle circular buffer correctly', async () => {
    process.env.MAX_ERROR_HISTORY = '3';
    
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
    
    // Add errors sequentially
    for (let i = 1; i <= 5; i++) {
      exceptionHandler({
        exceptionDetails: {
          text: `Error ${i}`,
          url: 'http://example.com/test.js',
          lineNumber: i
        },
        timestamp: (Date.now() + i * 1000) / 1000
      });
      
      const history = await server.getErrorHistory({ tabId: mockTabId });
      const expectedCount = Math.min(i, 3);
      expect(history.errors.length).toBe(expectedCount);
      
      if (i > 3) {
        // Oldest error should be removed
        expect(history.errors[0].message).toContain(`Error ${i - 2}`);
      }
    }
  });

  test('should return empty history for unmonitored tabs', async () => {
    const unknownTabId = 'DEADBEEF12345678901234567890CAFE';
    
    const result = await server.getErrorHistory({
      tabId: unknownTabId
    });
    
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.message).toContain('No errors recorded');
  });

  test('should include error counts and summary', async () => {
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
    
    // Add different types of errors
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: Cannot read property',
        url: 'http://example.com/app.js'
      },
      timestamp: Date.now() / 1000
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'ReferenceError: foo is not defined',
        url: 'http://example.com/app.js'
      },
      timestamp: (Date.now() + 1000) / 1000
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: undefined is not a function',
        url: 'http://example.com/utils.js'
      },
      timestamp: (Date.now() + 2000) / 1000
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.success).toBe(true);
    expect(errorHistory.summary).toBeDefined();
    expect(errorHistory.summary.total).toBe(3);
    expect(errorHistory.summary.byType).toBeDefined();
    expect(errorHistory.summary.byType.TypeError).toBe(2);
    expect(errorHistory.summary.byType.ReferenceError).toBe(1);
  });
});