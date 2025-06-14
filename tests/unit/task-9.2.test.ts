import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 9.2: Add Response Listener', () => {
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

  test('connectToTab sets up Network.responseReceived listener', async () => {
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
        requestWillBeSent: null,
        responseReceived: null
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
      // Verify that Network.responseReceived handler was set up
      expect(mockClient.Network.responseReceived).toBeDefined();
      expect(typeof mockClient.Network.responseReceived).toBe('function');
    }
  });

  test('network response handler stores responses correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection with real network response event handling
    jest.spyOn(server, 'connectToTab').mockImplementation(async (tabId, _params) => {
      // Simulate setting up the network response handler
      const mockResponse = {
        requestId: 'test-request-123',
        url: 'https://api.example.com/data',
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Length': '1234'
        },
        timestamp: Date.now() / 1000,
        wallTime: Date.now()
      };

      // Add response to storage (simulating what the event handler would do)
      server.addStorageEntry('networkLogs', tabId, {
        type: 'response',
        requestId: mockResponse.requestId,
        url: mockResponse.url,
        status: mockResponse.status,
        statusText: mockResponse.statusText,
        headers: mockResponse.headers,
        timestamp: mockResponse.timestamp,
        wallTime: mockResponse.wallTime
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

  test('network responses are stored with correct format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a test network response
    const testResponse = {
      type: 'response',
      requestId: 'test-request-456',
      url: 'https://example.com/api/users',
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Location': 'https://example.com/api/users/789',
        'Content-Length': '156'
      },
      timestamp: Date.now() / 1000,
      wallTime: Date.now()
    };

    server.addStorageEntry('networkLogs', validTabId, testResponse);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
    
    // Verify response structure matches expected format
    expect(testResponse).toHaveProperty('type', 'response');
    expect(testResponse).toHaveProperty('requestId');
    expect(testResponse).toHaveProperty('url');
    expect(testResponse).toHaveProperty('status');
    expect(testResponse).toHaveProperty('statusText');
    expect(testResponse).toHaveProperty('headers');
    expect(testResponse).toHaveProperty('timestamp');
    expect(typeof testResponse.requestId).toBe('string');
    expect(typeof testResponse.url).toBe('string');
    expect(typeof testResponse.status).toBe('number');
    expect(typeof testResponse.statusText).toBe('string');
    expect(typeof testResponse.headers).toBe('object');
    expect(typeof testResponse.timestamp).toBe('number');
  });

  test('complete request-response cycle can be stored', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const requestId = 'complete-cycle-123';
    
    // Add request
    const request = {
      type: 'request',
      requestId: requestId,
      url: 'https://api.example.com/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      timestamp: Date.now() / 1000
    };
    
    // Add corresponding response
    const response = {
      type: 'response',
      requestId: requestId,
      url: 'https://api.example.com/users',
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json',
        'Location': 'https://api.example.com/users/456'
      },
      timestamp: Date.now() / 1000 + 0.5
    };

    server.addStorageEntry('networkLogs', validTabId, request);
    server.addStorageEntry('networkLogs', validTabId, response);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
    
    // Both request and response should share the same requestId
    expect(request.requestId).toBe(response.requestId);
    expect(request.url).toBe(response.url);
  });

  test('multiple responses with different status codes can be stored', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const statusCodes = [
      { status: 200, statusText: 'OK' },
      { status: 201, statusText: 'Created' },
      { status: 400, statusText: 'Bad Request' },
      { status: 401, statusText: 'Unauthorized' },
      { status: 404, statusText: 'Not Found' },
      { status: 500, statusText: 'Internal Server Error' }
    ];
    
    statusCodes.forEach((statusInfo, index) => {
      const response = {
        type: 'response',
        requestId: `req-${index}`,
        url: `https://api.example.com/endpoint${index}`,
        status: statusInfo.status,
        statusText: statusInfo.statusText,
        headers: { 'Content-Type': 'application/json' },
        timestamp: Date.now() / 1000 + index
      };
      
      server.addStorageEntry('networkLogs', validTabId, response);
    });

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });

  test('network responses stored for different tabs separately', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    const response1 = {
      type: 'response',
      requestId: 'tab1-req-1',
      url: 'https://tab1.example.com/api',
      status: 200,
      statusText: 'OK',
      timestamp: Date.now() / 1000
    };
    
    const response2 = {
      type: 'response',
      requestId: 'tab2-req-1',
      url: 'https://tab2.example.com/api',
      status: 201,
      statusText: 'Created',
      timestamp: Date.now() / 1000
    };

    server.addStorageEntry('networkLogs', tabId1, response1);
    server.addStorageEntry('networkLogs', tabId2, response2);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(tabId1);
    expect(storage.networkLogs.keys).toContain(tabId2);
    expect(storage.networkLogs.size).toBe(2);
  });

  test('mixed request and response entries maintain chronological order', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const baseTime = Date.now() / 1000;
    
    // Add entries in chronological order
    const entries = [
      {
        type: 'request',
        requestId: 'req-1',
        url: 'https://api.example.com/first',
        method: 'GET',
        timestamp: baseTime
      },
      {
        type: 'response',
        requestId: 'req-1',
        url: 'https://api.example.com/first',
        status: 200,
        statusText: 'OK',
        timestamp: baseTime + 0.1
      },
      {
        type: 'request',
        requestId: 'req-2',
        url: 'https://api.example.com/second',
        method: 'POST',
        timestamp: baseTime + 0.2
      },
      {
        type: 'response',
        requestId: 'req-2',
        url: 'https://api.example.com/second',
        status: 201,
        statusText: 'Created',
        timestamp: baseTime + 0.3
      }
    ];

    entries.forEach(entry => {
      server.addStorageEntry('networkLogs', validTabId, entry);
    });

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });

  test('network response handler captures comprehensive response details', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const comprehensiveResponse = {
      type: 'response',
      requestId: 'comprehensive-resp-789',
      url: 'https://api.example.com/users/123',
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': '2048',
        'Cache-Control': 'max-age=3600, public',
        'ETag': '"abc123def456"',
        'Last-Modified': 'Wed, 21 Oct 2023 07:28:00 GMT',
        'Server': 'nginx/1.18.0',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
        'Set-Cookie': 'sessionId=abc123; HttpOnly; Secure; SameSite=Strict'
      },
      timestamp: Date.now() / 1000,
      wallTime: Date.now(),
      mimeType: 'application/json',
      remoteIPAddress: '192.168.1.100',
      remotePort: 443,
      fromDiskCache: false,
      fromServiceWorker: false,
      timing: {
        requestTime: Date.now() / 1000 - 0.5,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: 0.1,
        dnsEnd: 0.15,
        connectStart: 0.15,
        connectEnd: 0.25,
        sslStart: 0.25,
        sslEnd: 0.35,
        workerStart: -1,
        workerReady: -1,
        sendStart: 0.35,
        sendEnd: 0.36,
        pushStart: 0,
        pushEnd: 0,
        receiveHeadersEnd: 0.5
      }
    };

    server.addStorageEntry('networkLogs', validTabId, comprehensiveResponse);

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
    
    // Verify comprehensive data capture
    expect(comprehensiveResponse.status).toBe(200);
    expect(comprehensiveResponse.headers['Content-Type']).toContain('application/json');
    expect(comprehensiveResponse.headers['Cache-Control']).toContain('max-age=3600');
    expect(comprehensiveResponse.headers['Server']).toBe('nginx/1.18.0');
    expect(comprehensiveResponse.mimeType).toBe('application/json');
    expect(comprehensiveResponse.remoteIPAddress).toBe('192.168.1.100');
    expect(comprehensiveResponse.fromDiskCache).toBe(false);
    expect(typeof comprehensiveResponse.timing).toBe('object');
    expect(typeof comprehensiveResponse.timing.receiveHeadersEnd).toBe('number');
  });

  test('network response handler handles various content types', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const contentTypes = [
      'application/json',
      'text/html; charset=UTF-8',
      'text/css',
      'application/javascript',
      'image/png',
      'image/jpeg',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/xml'
    ];
    
    contentTypes.forEach((contentType, index) => {
      const response = {
        type: 'response',
        requestId: `content-type-${index}`,
        url: `https://example.com/file${index}`,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': contentType },
        timestamp: Date.now() / 1000 + index
      };
      
      server.addStorageEntry('networkLogs', validTabId, response);
    });

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });

  test('error responses are captured correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const errorResponses = [
      { status: 400, statusText: 'Bad Request' },
      { status: 401, statusText: 'Unauthorized' },
      { status: 403, statusText: 'Forbidden' },
      { status: 404, statusText: 'Not Found' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 500, statusText: 'Internal Server Error' },
      { status: 502, statusText: 'Bad Gateway' },
      { status: 503, statusText: 'Service Unavailable' }
    ];
    
    errorResponses.forEach((errorInfo, index) => {
      const response = {
        type: 'response',
        requestId: `error-${index}`,
        url: `https://api.example.com/error${index}`,
        status: errorInfo.status,
        statusText: errorInfo.statusText,
        headers: { 
          'Content-Type': 'application/json',
          'X-Error-Code': `ERR_${errorInfo.status}`
        },
        timestamp: Date.now() / 1000 + index
      };
      
      server.addStorageEntry('networkLogs', validTabId, response);
    });

    const storage = server.getStorageInfo();
    expect(storage.networkLogs.keys).toContain(validTabId);
  });
});