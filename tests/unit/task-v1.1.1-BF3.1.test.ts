import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';
import CDP from 'chrome-remote-interface';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF3.1: Install Global Error Handlers', () => {
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
  });

  test('should install window.onerror handler on start_monitoring', async () => {
    // Start monitoring should install error handlers
    const result = await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    expect(result.success).toBe(true);
    
    // Check that Runtime.evaluate was called to install window.onerror handler
    const onErrorCall = mockClient.Runtime.evaluate.mock.calls.find((call: any[]) => 
      call[0].expression.includes('window.onerror')
    );
    
    expect(onErrorCall).toBeDefined();
    expect(onErrorCall[0].expression).toContain('window.onerror');
    expect(onErrorCall[0].expression).toContain('function');
  });

  test('should install unhandledrejection handler on start_monitoring', async () => {
    const result = await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    expect(result.success).toBe(true);
    
    // Check that Runtime.evaluate was called to install unhandledrejection handler
    const unhandledRejectionCall = mockClient.Runtime.evaluate.mock.calls.find((call: any[]) => 
      call[0].expression.includes('unhandledrejection')
    );
    
    expect(unhandledRejectionCall).toBeDefined();
    expect(unhandledRejectionCall[0].expression).toContain('addEventListener');
    expect(unhandledRejectionCall[0].expression).toContain('unhandledrejection');
  });

  test('should preserve existing error handlers', async () => {
    // Configure mock to return existing handler info
    mockClient.Runtime.evaluate.mockImplementation((params: any) => {
      if (params.expression.includes('typeof window.onerror')) {
        return Promise.resolve({
          result: { 
            type: 'string',
            value: 'function' 
          }
        });
      }
      return Promise.resolve({ result: { value: true } });
    });
    
    const result = await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    expect(result.success).toBe(true);
    
    // Check that the handler installation preserves existing handler
    const onErrorCall = mockClient.Runtime.evaluate.mock.calls.find((call: any[]) => 
      call[0].expression.includes('window.onerror') && 
      call[0].expression.includes('function')
    );
    
    expect(onErrorCall).toBeDefined();
    expect(onErrorCall[0].expression).toContain('_originalOnError');
  });

  test('should capture window.onerror events', async () => {
    // Mock Runtime.consoleAPICalled event
    mockClient.Runtime.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (event === 'consoleAPICalled') {
        // Simulate an error being captured
        setTimeout(() => {
          handler({
            type: 'error',
            args: [{
              type: 'string',
              value: '[Global Error]'
            }, {
              type: 'object',
              value: {
                message: 'Uncaught ReferenceError: foo is not defined',
                source: 'http://example.com/app.js',
                line: 42,
                column: 10,
                stack: 'ReferenceError: foo is not defined\n    at testFunction (http://example.com/app.js:42:10)'
              }
            }],
            timestamp: Date.now() / 1000,
            executionContextId: 1
          });
        }, 10);
      }
    });
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Wait for simulated error
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Check that error was captured in errors storage
    const errorStorage = (server as any).errors.get(mockTabId);
    expect(errorStorage).toBeDefined();
    expect(errorStorage.length).toBeGreaterThan(0);
    expect(errorStorage[0].message).toContain('[Global Error]');
  });

  test('should capture unhandledrejection events', async () => {
    // Mock unhandled rejection capture via console
    mockClient.Runtime.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (event === 'consoleAPICalled') {
        // Simulate unhandled rejection
        setTimeout(() => {
          handler({
            type: 'error',
            args: [{
              type: 'string',
              value: '[Unhandled Promise Rejection]'
            }, {
              type: 'object',
              value: {
                reason: 'Error: Promise rejected',
                promise: {},
                stack: 'Error: Promise rejected\n    at asyncFunction (http://example.com/async.js:100:5)'
              }
            }],
            timestamp: Date.now() / 1000,
            executionContextId: 1
          });
        }, 10);
      }
    });
    
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Wait for simulated error
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // Check that promise rejection was captured in errors storage
    const errorStorage = (server as any).errors.get(mockTabId);
    expect(errorStorage).toBeDefined();
    expect(errorStorage.length).toBeGreaterThan(0);
    expect(errorStorage[0].message).toContain('[Unhandled Promise Rejection]');
  });

  test('should skip handler installation when errors option is false', async () => {
    const result = await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: false // Explicitly disable error monitoring
      }
    });
    
    expect(result.success).toBe(true);
    
    // Check that no error handlers were installed
    const errorHandlerCalls = mockClient.Runtime.evaluate.mock.calls.filter((call: any[]) => 
      call[0].expression.includes('window.onerror') || 
      call[0].expression.includes('unhandledrejection')
    );
    
    expect(errorHandlerCalls.length).toBe(0);
  });

  test('should handle handler installation failure gracefully', async () => {
    // Make Runtime.evaluate fail for error handler installation
    mockClient.Runtime.evaluate.mockImplementation((params: any) => {
      if (params.expression.includes('window.onerror') || 
          params.expression.includes('unhandledrejection')) {
        return Promise.reject(new Error('Failed to install handler'));
      }
      return Promise.resolve({ result: { value: true } });
    });
    
    const result = await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    // Should still succeed but with warnings
    expect(result.success).toBe(true);
    expect(result.monitoring.warnings).toBeDefined();
    expect(result.monitoring.warnings[0]).toContain('error handler');
  });
});