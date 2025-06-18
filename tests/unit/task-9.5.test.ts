import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 9.5: Wire getNetworkActivity to Handler', () => {
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

  test('callTool supports get_network_activity tool', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock getNetworkActivity to avoid actual data access
    jest.spyOn(server, 'getNetworkActivity').mockResolvedValue({
      success: true,
      message: `Retrieved 0 network entries from tab ${validTabId}`,
      network: {
        tabId: validTabId,
        totalEntries: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { type: null, method: null, limit: 50 },
        activity: []
      }
    });

    const result = await server.callTool('get_network_activity', { tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Retrieved');
    expect(result.network).toBeDefined();
    expect(result.network.tabId).toBe(validTabId);
  });

  test('callTool passes parameters correctly to getNetworkActivity', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, limit: 25, type: 'request', method: 'GET' };
    
    const getNetworkActivitySpy = jest.spyOn(server, 'getNetworkActivity').mockResolvedValue({
      success: true,
      message: 'Mocked response',
      network: {
        tabId: validTabId,
        totalEntries: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { type: 'request', method: 'GET', limit: 25 },
        activity: []
      }
    });

    await server.callTool('get_network_activity', params);
    
    expect(getNetworkActivitySpy).toHaveBeenCalledWith(params);
    expect(getNetworkActivitySpy).toHaveBeenCalledTimes(1);
    
    getNetworkActivitySpy.mockRestore();
  });

  test('callTool validates get_network_activity tool name', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock to avoid actual data access
    jest.spyOn(server, 'getNetworkActivity').mockResolvedValue({
      success: true,
      message: 'Test response',
      network: {
        tabId: validTabId,
        totalEntries: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { type: null, method: null, limit: 50 },
        activity: []
      }
    });

    // Should not throw error for valid tool name
    await expect(server.callTool('get_network_activity', { tabId: validTabId })).resolves.toBeDefined();
  });

  test('callTool propagates getNetworkActivity errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock getNetworkActivity to throw error
    jest.spyOn(server, 'getNetworkActivity').mockRejectedValue(new Error('Tab ID validation failed'));

    await expect(server.callTool('get_network_activity', { tabId: validTabId })).rejects.toThrow('Tab ID validation failed');
  });

  test('callTool handles get_network_activity parameter validation', async () => {
    // Mock getNetworkActivity to handle validation
    const getNetworkActivitySpy = jest.spyOn(server, 'getNetworkActivity').mockImplementation(async (params) => {
      if (!params.tabId) {
        throw new Error('Tab ID is required and must be a non-empty string');
      }
      return {
        success: true,
        message: 'Network activity retrieved',
        network: {
          tabId: params.tabId,
          totalEntries: 0,
          returned: 0,
          timestamp: new Date().toISOString(),
          filters: { type: null, method: null, limit: 50 },
          activity: []
        }
      };
    });

    // Should propagate validation errors
    await expect(server.callTool('get_network_activity', {})).rejects.toThrow('Tab ID is required');
    
    getNetworkActivitySpy.mockRestore();
  });

  test('get_network_activity tool integrates with full MCP flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test complete flow: listTools -> callTool
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    expect(getNetworkActivityTool).toBeDefined();
    
    // Add some test network activity
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'request',
      requestId: 'integration-test-req',
      url: 'https://api.example.com/integration',
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timestamp: Date.now() / 1000
    });

    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'integration-test-req',
      url: 'https://api.example.com/integration',
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      timestamp: Date.now() / 1000 + 0.1
    });

    const result = await server.callTool('get_network_activity', { tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.network.tabId).toBe(validTabId);
    expect(result.network.activity).toHaveLength(2);
    expect(result.network.activity[0].type).toBe('response'); // Most recent first
    expect(result.network.activity[1].type).toBe('request');
  });

  test('callTool error message includes get_network_activity in available tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(/get_network_activity/);
  });

  test('get_network_activity tool works with real data flow and filtering', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add comprehensive network activity
    const networkActivity = [
      { type: 'request', requestId: 'req-1', url: 'https://api.example.com/users', method: 'GET', timestamp: Date.now() / 1000 - 5 },
      { type: 'response', requestId: 'req-1', url: 'https://api.example.com/users', status: 200, timestamp: Date.now() / 1000 - 4 },
      { type: 'request', requestId: 'req-2', url: 'https://api.example.com/users', method: 'POST', timestamp: Date.now() / 1000 - 3 },
      { type: 'response', requestId: 'req-2', url: 'https://api.example.com/users', status: 201, timestamp: Date.now() / 1000 - 2 },
      { type: 'request', requestId: 'req-3', url: 'https://api.example.com/posts', method: 'GET', timestamp: Date.now() / 1000 - 1 },
      { type: 'response', requestId: 'req-3', url: 'https://api.example.com/posts', status: 200, timestamp: Date.now() / 1000 }
    ];

    networkActivity.forEach(activity => {
      server.addStorageEntry('networkLogs', validTabId, activity);
    });

    // Test with no filters
    const allResult = await server.callTool('get_network_activity', { tabId: validTabId });
    expect(allResult.success).toBe(true);
    expect(allResult.network.activity).toHaveLength(6);
    expect(allResult.network.totalEntries).toBe(6);

    // Test with type filter
    const requestResult = await server.callTool('get_network_activity', { 
      tabId: validTabId, 
      type: 'request' 
    });
    expect(requestResult.success).toBe(true);
    expect(requestResult.network.activity).toHaveLength(3);
    expect(requestResult.network.activity.every((entry: any) => entry.type === 'request')).toBe(true);

    // Test with method filter
    const getResult = await server.callTool('get_network_activity', { 
      tabId: validTabId, 
      method: 'GET' 
    });
    expect(getResult.success).toBe(true);
    expect(getResult.network.activity).toHaveLength(2);
    expect(getResult.network.activity.every((entry: any) => entry.method === 'GET')).toBe(true);

    // Test with limit
    const limitedResult = await server.callTool('get_network_activity', { 
      tabId: validTabId, 
      limit: 3 
    });
    expect(limitedResult.success).toBe(true);
    expect(limitedResult.network.activity).toHaveLength(3);
    expect(limitedResult.network.returned).toBe(3);
    expect(limitedResult.network.totalEntries).toBe(6);

    // Test combined filters
    const combinedResult = await server.callTool('get_network_activity', { 
      tabId: validTabId, 
      type: 'request',
      method: 'GET',
      limit: 1 
    });
    expect(combinedResult.success).toBe(true);
    expect(combinedResult.network.activity).toHaveLength(1);
    expect(combinedResult.network.activity[0].type).toBe('request');
    expect(combinedResult.network.activity[0].method).toBe('GET');
  });
});