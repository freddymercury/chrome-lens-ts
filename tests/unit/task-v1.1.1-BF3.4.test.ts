import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';
import CDP from 'chrome-remote-interface';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF3.4: Implement Error Categorization', () => {
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
    
    // Add the mock client to storage
    server.addStorageEntry('clients', mockTabId, mockClient);
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should categorize runtime errors correctly', async () => {
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
    
    // Add various runtime errors
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: Cannot read property "foo" of undefined',
        url: 'http://example.com/app.js',
        lineNumber: 42
      },
      timestamp: Date.now() / 1000
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'ReferenceError: someVariable is not defined',
        url: 'http://example.com/app.js',
        lineNumber: 50
      },
      timestamp: Date.now() / 1000
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'SyntaxError: Unexpected token {',
        url: 'http://example.com/app.js',
        lineNumber: 10
      },
      timestamp: Date.now() / 1000
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors.length).toBe(3);
    expect(errorHistory.errors[0].category).toBe('runtime');
    expect(errorHistory.errors[0].errorType).toBe('TypeError');
    expect(errorHistory.errors[1].category).toBe('runtime');
    expect(errorHistory.errors[1].errorType).toBe('ReferenceError');
    expect(errorHistory.errors[2].category).toBe('runtime');
    expect(errorHistory.errors[2].errorType).toBe('SyntaxError');
  });

  test('should categorize network errors correctly', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: true,
        errors: true
      }
    });
    
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // Simulate network error via console
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Failed to load resource: net::ERR_CONNECTION_REFUSED'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Failed to fetch: NetworkError when attempting to fetch resource.'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    const networkErrors = errorHistory.errors.filter((e: any) => e.category === 'network');
    expect(networkErrors.length).toBe(2);
    expect(networkErrors[0].errorType).toBe('NetworkError');
    expect(networkErrors[1].errorType).toBe('NetworkError');
  });

  test('should categorize security errors correctly', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // CORS error
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Access to fetch at "https://api.example.com" from origin "http://localhost:3000" has been blocked by CORS policy'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    // CSP error
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: "Refused to execute inline script because it violates the following Content Security Policy directive"
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    // Mixed content error
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: "Mixed Content: The page at 'https://example.com' was loaded over HTTPS, but requested an insecure resource"
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    const securityErrors = errorHistory.errors.filter((e: any) => e.category === 'security');
    expect(securityErrors.length).toBe(3);
    expect(securityErrors[0].errorType).toBe('CORSError');
    expect(securityErrors[1].errorType).toBe('CSPError');
    expect(securityErrors[2].errorType).toBe('MixedContentError');
  });

  test('should detect custom error types', async () => {
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
    
    // Custom error
    exceptionHandler({
      exceptionDetails: {
        text: 'ValidationError: Email format is invalid',
        url: 'http://example.com/validators.js',
        lineNumber: 15
      },
      timestamp: Date.now() / 1000
    });
    
    exceptionHandler({
      exceptionDetails: {
        text: 'APIError: Rate limit exceeded',
        url: 'http://example.com/api-client.js',
        lineNumber: 200
      },
      timestamp: Date.now() / 1000
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    const customErrors = errorHistory.errors.filter((e: any) => e.category === 'custom');
    expect(customErrors.length).toBe(2);
    expect(customErrors[0].errorType).toBe('ValidationError');
    expect(customErrors[1].errorType).toBe('APIError');
  });

  test('should include error categorization in summary', async () => {
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
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // Add mix of errors
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: foo is not a function',
        url: 'http://example.com/app.js'
      },
      timestamp: Date.now() / 1000
    });
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Failed to load resource: net::ERR_NETWORK_CHANGED'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Blocked by CORS policy: No "Access-Control-Allow-Origin" header'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.summary.byCategory).toBeDefined();
    expect(errorHistory.summary.byCategory.runtime).toBe(1);
    expect(errorHistory.summary.byCategory.network).toBe(1);
    expect(errorHistory.summary.byCategory.security).toBe(1);
  });

  test('should handle uncategorized errors', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // Unknown error format
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Something went wrong!'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors.length).toBe(1);
    expect(errorHistory.errors[0].category).toBe('unknown');
    expect(errorHistory.errors[0].errorType).toBe('Error');
  });

  test('should support filtering by category', async () => {
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
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // Add different categories
    exceptionHandler({
      exceptionDetails: {
        text: 'TypeError: undefined is not a function',
        url: 'http://example.com/app.js'
      },
      timestamp: Date.now() / 1000
    });
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Failed to fetch: net::ERR_INTERNET_DISCONNECTED'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: 'Content Security Policy violation'
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    // Filter by category
    const runtimeErrors = await server.getErrorHistory({
      tabId: mockTabId,
      category: 'runtime'
    });
    
    expect(runtimeErrors.errors.length).toBe(1);
    expect(runtimeErrors.errors[0].category).toBe('runtime');
    
    const networkErrors = await server.getErrorHistory({
      tabId: mockTabId,
      category: 'network'
    });
    
    expect(networkErrors.errors.length).toBe(1);
    expect(networkErrors.errors[0].category).toBe('network');
  });

  test('should detect promise rejection errors', async () => {
    await server.startMonitoring({
      tabId: mockTabId,
      options: {
        console: true,
        network: false,
        errors: true
      }
    });
    
    const consoleHandler = mockClient.Runtime.on.mock.calls
      .find((call: any[]) => call[0] === 'consoleAPICalled')?.[1];
    
    // Unhandled promise rejection
    consoleHandler({
      type: 'error',
      args: [{
        type: 'string',
        value: '[Unhandled Promise Rejection]'
      }, {
        type: 'object',
        value: {
          reason: 'Error: API call failed',
          promise: {}
        }
      }],
      timestamp: Date.now() / 1000,
      executionContextId: 1
    });
    
    const errorHistory = await server.getErrorHistory({
      tabId: mockTabId
    });
    
    expect(errorHistory.errors.length).toBe(1);
    expect(errorHistory.errors[0].category).toBe('async');
    expect(errorHistory.errors[0].errorType).toBe('UnhandledPromiseRejection');
  });
});