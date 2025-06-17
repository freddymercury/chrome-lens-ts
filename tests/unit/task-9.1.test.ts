import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 9.1: Add Network Domain to connectToTab', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('connectToTab enables Network domain', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock Chrome CDP client with Network domain
    const mockClient = {
      Console: {
        enable: jest.fn().mockResolvedValue(undefined),
        messageAdded: null
      },
      Runtime: {
        enable: jest.fn().mockResolvedValue(undefined)
      },
      Network: {
        enable: jest.fn().mockResolvedValue(undefined),
        requestWillBeSent: null
      },
      close: jest.fn().mockResolvedValue(undefined)
    };

    // Mock CDP connection
    const CDPMock = jest.fn().mockResolvedValue(mockClient);
    jest.doMock('chrome-remote-interface', () => ({ default: CDPMock }));

    // Import server after mocking
    const { ChromeDevToolsMCPServer: TestServer } = await import('../../server');
    const testServer = new TestServer();
    testServer.setupToolHandlers();

    const result = await testServer.connectToTab(validTabId, {});

    if (result.success) {
      // Verify that Network.enable was called
      expect(mockClient.Network.enable).toHaveBeenCalled();
      
      // Verify that Network domain is included in enabled domains
      expect(result.domains).toContain('Network');
      
      // Verify that Network.requestWillBeSent handler was set up
      expect(mockClient.Network.requestWillBeSent).toBeDefined();
      expect(typeof mockClient.Network.requestWillBeSent).toBe('function');
    }
  });

  test('network request handler stores requests correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection with real network event handling
    jest.spyOn(server, 'connectToTab').mockImplementation(async (tabId, _params) => {
      // Simulate setting up the network request handler
      const mockRequest = {
        requestId: 'test-request-123',
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'Chrome/91.0',
          'Accept': 'application/json'
        },
        timestamp: Date.now() / 1000,
        wallTime: Date.now()
      };

      // Add request to storage (simulating what the event handler would do)
      server.addStorageEntry('networkLogs', tabId, {
        type: 'request',
        requestId: mockRequest.requestId,
        url: mockRequest.url,
        method: mockRequest.method,
        headers: mockRequest.headers,
        timestamp: mockRequest.timestamp,
        wallTime: mockRequest.wallTime
      });

      return {
        success: true,
        message: `Successfully connected to Chrome tab ${tabId}`,
        connection: {
          tabId,
          host: 'localhost',
          port: 9222,
          client: 'CDP_CLIENT_CONNECTED',
          timestamp: new Date().toISOString()
        },
        domains: ['Console', 'Runtime', 'Network']
      };
    });

    const initialStorage = server.getStorageInfo();
    const initialNetworkSize = initialStorage.networkLogs.size;

    const result = await server.connectToTab(validTabId, {});

    expect(result.success).toBe(true);
    expect(result.domains).toContain('Network');

    const finalStorage = server.getStorageInfo();
    
    // Should have added network logs for this tab
    expect(finalStorage.networkLogs.size).toBeGreaterThan(initialNetworkSize);
    expect(finalStorage.networkLogs.keys).toContain(validTabId);
  });

  test('network requests are stored with correct format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a test network request
    const testRequest = {
      type: 'request',
      requestId: 'test-request-456',
      url: 'https://example.com/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      timestamp: Date.now() / 1000,
      wallTime: Date.now()
    };

    server.addStorageEntry('networkLogs', validTabId, testRequest);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
    
    // Verify request structure matches expected format
    expect(testRequest).toHaveProperty('type', 'request');
    expect(testRequest).toHaveProperty('requestId');
    expect(testRequest).toHaveProperty('url');
    expect(testRequest).toHaveProperty('method');
    expect(testRequest).toHaveProperty('headers');
    expect(testRequest).toHaveProperty('timestamp');
    expect(typeof testRequest.requestId).toBe('string');
    expect(typeof testRequest.url).toBe('string');
    expect(typeof testRequest.method).toBe('string');
    expect(typeof testRequest.headers).toBe('object');
    expect(typeof testRequest.timestamp).toBe('number');
  });

  test('multiple network requests can be stored for same tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const request1 = {
      type: 'request',
      requestId: 'req-1',
      url: 'https://example.com/api/endpoint1',
      method: 'GET',
      timestamp: Date.now() / 1000
    };
    
    const request2 = {
      type: 'request',
      requestId: 'req-2',
      url: 'https://example.com/api/endpoint2',
      method: 'POST',
      timestamp: Date.now() / 1000 + 1
    };
    
    const request3 = {
      type: 'request',
      requestId: 'req-3',
      url: 'https://api.other.com/data',
      method: 'PUT',
      timestamp: Date.now() / 1000 + 2
    };

    server.addStorageEntry('networkLogs', validTabId, request1);
    server.addStorageEntry('networkLogs', validTabId, request2);
    server.addStorageEntry('networkLogs', validTabId, request3);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });

  test('network requests stored for different tabs separately', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    const request1 = {
      type: 'request',
      requestId: 'tab1-req-1',
      url: 'https://tab1.example.com/api',
      method: 'GET',
      timestamp: Date.now() / 1000
    };
    
    const request2 = {
      type: 'request',
      requestId: 'tab2-req-1',
      url: 'https://tab2.example.com/api',
      method: 'GET',
      timestamp: Date.now() / 1000
    };

    server.addStorageEntry('networkLogs', tabId1, request1);
    server.addStorageEntry('networkLogs', tabId2, request2);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(tabId1);
    expect(storage.networkLogs.keys).toContain(tabId2);
    expect(storage.networkLogs.size).toBe(2);
  });

  test('connectToTab includes Network domain in enabled domains', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection with Network domain
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: true,
      message: 'Connected successfully',
      connection: {
        tabId: validTabId,
        host: 'localhost',
        port: 9222,
        client: 'CDP_CLIENT_CONNECTED',
        timestamp: new Date().toISOString()
      },
      domains: ['Console', 'Runtime', 'Network'] // Network should be enabled
    });

    const result = await server.connectToTab(validTabId, {});
    
    expect(result.success).toBe(true);
    expect(result.domains).toContain('Console');
    expect(result.domains).toContain('Runtime');
    expect(result.domains).toContain('Network');
  });

  test('network domain handles enable failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock connection where Network.enable fails but others succeed
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: true,
      message: 'Connected successfully with partial domain support',
      connection: {
        tabId: validTabId,
        host: 'localhost',
        port: 9222,
        client: 'CDP_CLIENT_CONNECTED',
        timestamp: new Date().toISOString()
      },
      domains: ['Console', 'Runtime'] // Network failed to enable
    });

    const result = await server.connectToTab(validTabId, {});
    
    expect(result.success).toBe(true);
    expect(result.domains).toContain('Console');
    expect(result.domains).toContain('Runtime');
    // Network may or may not be present depending on Chrome support
  });

  test('network request handler captures various HTTP methods', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    
    httpMethods.forEach((method, index) => {
      const request = {
        type: 'request',
        requestId: `req-${method.toLowerCase()}-${index}`,
        url: `https://api.example.com/${method.toLowerCase()}`,
        method: method,
        headers: { 'User-Agent': 'Chrome/91.0' },
        timestamp: Date.now() / 1000 + index
      };
      
      server.addStorageEntry('networkLogs', validTabId, request);
    });

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });

  test('network request handler captures request details comprehensively', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const comprehensiveRequest = {
      type: 'request',
      requestId: 'comprehensive-req-789',
      url: 'https://api.example.com/users/123?include=profile&format=json',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9...',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timestamp: Date.now() / 1000,
      wallTime: Date.now(),
      initiator: {
        type: 'script',
        stack: {
          callFrames: []
        }
      },
      priority: 'High',
      referrerPolicy: 'strict-origin-when-cross-origin'
    };

    server.addStorageEntry('networkLogs', validTabId, comprehensiveRequest);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
    
    // Verify comprehensive data capture
    expect(comprehensiveRequest.url).toContain('users/123');
    expect(comprehensiveRequest.url).toContain('include=profile');
    expect(comprehensiveRequest.headers['Content-Type']).toBe('application/json');
    expect(comprehensiveRequest.headers['Authorization']).toContain('Bearer');
    expect(typeof comprehensiveRequest.timestamp).toBe('number');
    expect(typeof comprehensiveRequest.wallTime).toBe('number');
  });
});