import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 9.4: Implement getNetworkActivity Method', () => {
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

  test('getNetworkActivity method exists', () => {
    expect(typeof server.getNetworkActivity).toBe('function');
  });

  test('getNetworkActivity returns a promise', () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const result = server.getNetworkActivity({ tabId: validTabId });
    expect(result).toBeInstanceOf(Promise);
  });

  test('getNetworkActivity validates required tabId parameter', async () => {
    await expect(server.getNetworkActivity({})).rejects.toThrow();
    await expect(server.getNetworkActivity({ tabId: '' })).rejects.toThrow();
    await expect(server.getNetworkActivity({ tabId: 'invalid-id' })).rejects.toThrow();
  });

  test('getNetworkActivity validates optional parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.getNetworkActivity({ tabId: validTabId, limit: 0 })).rejects.toThrow();
    await expect(server.getNetworkActivity({ tabId: validTabId, limit: 501 })).rejects.toThrow();
    await expect(server.getNetworkActivity({ tabId: validTabId, type: 'invalid' })).rejects.toThrow();
    await expect(server.getNetworkActivity({ tabId: validTabId, method: 'INVALID' })).rejects.toThrow();
  });

  test('getNetworkActivity returns proper response format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.getNetworkActivity({ tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('network');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.network).toBe('object');
    expect(Array.isArray(result.network.activity)).toBe(true);
  });

  test('getNetworkActivity returns empty array when no activity exists for tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.getNetworkActivity({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toEqual([]);
    expect(result.network.tabId).toBe(validTabId);
    expect(result.network.totalEntries).toBe(0);
  });

  test('getNetworkActivity returns stored network activity for tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add test network activity
    const testActivity = [
      {
        type: 'request',
        requestId: 'req-1',
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        timestamp: Date.now() / 1000 - 2
      },
      {
        type: 'response',
        requestId: 'req-1',
        url: 'https://api.example.com/users',
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        timestamp: Date.now() / 1000 - 1
      },
      {
        type: 'request',
        requestId: 'req-2',
        url: 'https://api.example.com/posts',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timestamp: Date.now() / 1000
      }
    ];

    testActivity.forEach(activity => {
      server.addStorageEntry('networkLogs', validTabId, activity);
    });

    const result = await server.getNetworkActivity({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toHaveLength(3);
    expect(result.network.totalEntries).toBe(3);
    expect(result.network.tabId).toBe(validTabId);
    
    // Activity should be returned in reverse chronological order (most recent first)
    expect(result.network.activity[0].type).toBe('request');
    expect(result.network.activity[0].url).toBe('https://api.example.com/posts');
    expect(result.network.activity[1].type).toBe('response');
    expect(result.network.activity[2].type).toBe('request');
    expect(result.network.activity[2].url).toBe('https://api.example.com/users');
  });

  test('getNetworkActivity applies limit parameter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add 5 test network entries
    for (let i = 0; i < 5; i++) {
      server.addStorageEntry('networkLogs', validTabId, {
        type: 'request',
        requestId: `req-${i}`,
        url: `https://api.example.com/endpoint${i}`,
        method: 'GET',
        timestamp: Date.now() / 1000 + i
      });
    }

    const result = await server.getNetworkActivity({ tabId: validTabId, limit: 2 });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toHaveLength(2);
    expect(result.network.totalEntries).toBe(5); // Total available
    expect(result.network.returned).toBe(2); // Actually returned
    
    // Should return the 2 most recent entries
    expect(result.network.activity[0].url).toBe('https://api.example.com/endpoint4');
    expect(result.network.activity[1].url).toBe('https://api.example.com/endpoint3');
  });

  test('getNetworkActivity applies type filter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add mixed requests and responses
    const testActivity = [
      {
        type: 'request',
        requestId: 'req-1',
        url: 'https://api.example.com/get',
        method: 'GET',
        timestamp: Date.now() / 1000 - 3
      },
      {
        type: 'response',
        requestId: 'req-1',
        url: 'https://api.example.com/get',
        status: 200,
        statusText: 'OK',
        timestamp: Date.now() / 1000 - 2
      },
      {
        type: 'request',
        requestId: 'req-2',
        url: 'https://api.example.com/post',
        method: 'POST',
        timestamp: Date.now() / 1000 - 1
      },
      {
        type: 'response',
        requestId: 'req-2',
        url: 'https://api.example.com/post',
        status: 201,
        statusText: 'Created',
        timestamp: Date.now() / 1000
      }
    ];

    testActivity.forEach(activity => {
      server.addStorageEntry('networkLogs', validTabId, activity);
    });

    // Test requests filter
    const requestsResult = await server.getNetworkActivity({ tabId: validTabId, type: 'request' });
    expect(requestsResult.success).toBe(true);
    expect(requestsResult.network.activity).toHaveLength(2);
    expect(requestsResult.network.activity.every((entry: any) => entry.type === 'request')).toBe(true);

    // Test responses filter
    const responsesResult = await server.getNetworkActivity({ tabId: validTabId, type: 'response' });
    expect(responsesResult.success).toBe(true);
    expect(responsesResult.network.activity).toHaveLength(2);
    expect(responsesResult.network.activity.every((entry: any) => entry.type === 'response')).toBe(true);
  });

  test('getNetworkActivity applies method filter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add requests with different methods
    const testRequests = [
      { type: 'request', requestId: 'req-1', url: 'https://api.example.com/users', method: 'GET', timestamp: Date.now() / 1000 - 4 },
      { type: 'request', requestId: 'req-2', url: 'https://api.example.com/users', method: 'POST', timestamp: Date.now() / 1000 - 3 },
      { type: 'request', requestId: 'req-3', url: 'https://api.example.com/users/1', method: 'PUT', timestamp: Date.now() / 1000 - 2 },
      { type: 'request', requestId: 'req-4', url: 'https://api.example.com/users/1', method: 'DELETE', timestamp: Date.now() / 1000 - 1 },
      { type: 'request', requestId: 'req-5', url: 'https://api.example.com/users', method: 'GET', timestamp: Date.now() / 1000 }
    ];

    testRequests.forEach(request => {
      server.addStorageEntry('networkLogs', validTabId, request);
    });

    // Test GET filter
    const getResult = await server.getNetworkActivity({ tabId: validTabId, method: 'GET' });
    expect(getResult.success).toBe(true);
    expect(getResult.network.activity).toHaveLength(2);
    expect(getResult.network.activity.every((entry: any) => entry.method === 'GET')).toBe(true);

    // Test POST filter
    const postResult = await server.getNetworkActivity({ tabId: validTabId, method: 'POST' });
    expect(postResult.success).toBe(true);
    expect(postResult.network.activity).toHaveLength(1);
    expect(postResult.network.activity[0].method).toBe('POST');
  });

  test('getNetworkActivity combines type and method filters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add mixed activity
    const testActivity = [
      { type: 'request', requestId: 'req-1', url: 'https://api.example.com/get1', method: 'GET', timestamp: Date.now() / 1000 - 5 },
      { type: 'response', requestId: 'req-1', url: 'https://api.example.com/get1', status: 200, timestamp: Date.now() / 1000 - 4 },
      { type: 'request', requestId: 'req-2', url: 'https://api.example.com/post1', method: 'POST', timestamp: Date.now() / 1000 - 3 },
      { type: 'response', requestId: 'req-2', url: 'https://api.example.com/post1', status: 201, timestamp: Date.now() / 1000 - 2 },
      { type: 'request', requestId: 'req-3', url: 'https://api.example.com/get2', method: 'GET', timestamp: Date.now() / 1000 - 1 }
    ];

    testActivity.forEach(activity => {
      server.addStorageEntry('networkLogs', validTabId, activity);
    });

    // Test request + GET filter
    const result = await server.getNetworkActivity({ 
      tabId: validTabId, 
      type: 'request', 
      method: 'GET' 
    });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toHaveLength(2);
    expect(result.network.activity.every((entry: any) => entry.type === 'request')).toBe(true);
    expect(result.network.activity.every((entry: any) => entry.method === 'GET')).toBe(true);
    expect(result.network.totalEntries).toBe(5); // Total available
    expect(result.network.returned).toBe(2); // Filtered count
  });

  test('getNetworkActivity combines limit with filters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add multiple GET requests
    for (let i = 0; i < 5; i++) {
      server.addStorageEntry('networkLogs', validTabId, {
        type: 'request',
        requestId: `get-req-${i}`,
        url: `https://api.example.com/get${i}`,
        method: 'GET',
        timestamp: Date.now() / 1000 + i
      });
    }

    const result = await server.getNetworkActivity({ 
      tabId: validTabId, 
      method: 'GET',
      limit: 2 
    });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toHaveLength(2);
    expect(result.network.activity.every((entry: any) => entry.method === 'GET')).toBe(true);
    expect(result.network.returned).toBe(2);
    expect(result.network.totalEntries).toBe(5);
    
    // Should return the 2 most recent GET requests
    expect(result.network.activity[0].url).toBe('https://api.example.com/get4');
    expect(result.network.activity[1].url).toBe('https://api.example.com/get3');
  });

  test('getNetworkActivity handles different tabs separately', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    server.addStorageEntry('networkLogs', tabId1, {
      type: 'request',
      requestId: 'tab1-req',
      url: 'https://tab1.example.com/api',
      method: 'GET',
      timestamp: Date.now() / 1000
    });
    
    server.addStorageEntry('networkLogs', tabId2, {
      type: 'request',
      requestId: 'tab2-req',
      url: 'https://tab2.example.com/api',
      method: 'POST',
      timestamp: Date.now() / 1000
    });

    const result1 = await server.getNetworkActivity({ tabId: tabId1 });
    const result2 = await server.getNetworkActivity({ tabId: tabId2 });
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    expect(result1.network.activity).toHaveLength(1);
    expect(result2.network.activity).toHaveLength(1);
    
    expect(result1.network.activity[0].url).toBe('https://tab1.example.com/api');
    expect(result2.network.activity[0].url).toBe('https://tab2.example.com/api');
  });

  test('getNetworkActivity includes metadata in response', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'request',
      requestId: 'test-req',
      url: 'https://example.com/test',
      method: 'GET',
      timestamp: Date.now() / 1000
    });

    const result = await server.getNetworkActivity({ tabId: validTabId });
    
    expect(result.network).toHaveProperty('tabId', validTabId);
    expect(result.network).toHaveProperty('totalEntries');
    expect(result.network).toHaveProperty('returned');
    expect(result.network).toHaveProperty('timestamp');
    expect(result.network).toHaveProperty('filters');
    expect(typeof result.network.timestamp).toBe('string');
    expect(typeof result.network.filters).toBe('object');
  });

  test('getNetworkActivity handles method filter with responses gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add mixed requests and responses
    const testActivity = [
      { type: 'request', requestId: 'req-1', url: 'https://api.example.com/test', method: 'GET', timestamp: Date.now() / 1000 - 1 },
      { type: 'response', requestId: 'req-1', url: 'https://api.example.com/test', status: 200, timestamp: Date.now() / 1000 }
    ];

    testActivity.forEach(activity => {
      server.addStorageEntry('networkLogs', validTabId, activity);
    });

    // Method filter should only apply to requests (responses don't have method)
    const result = await server.getNetworkActivity({ tabId: validTabId, method: 'GET' });
    
    expect(result.success).toBe(true);
    expect(result.network.activity).toHaveLength(1);
    expect(result.network.activity[0].type).toBe('request');
    expect(result.network.activity[0].method).toBe('GET');
  });
});