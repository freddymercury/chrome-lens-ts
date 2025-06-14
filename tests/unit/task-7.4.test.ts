import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 7.4: Wire getConsoleMessages to Handler', () => {
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

  test('callTool supports get_console_messages tool', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock getConsoleMessages to avoid actual data access
    jest.spyOn(server, 'getConsoleMessages').mockResolvedValue({
      success: true,
      message: `Retrieved 0 console messages from tab ${validTabId}`,
      console: {
        tabId: validTabId,
        totalMessages: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { level: null, limit: 100 },
        messages: []
      }
    });

    const result = await server.callTool('get_console_messages', { tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Retrieved');
    expect(result.console).toBeDefined();
    expect(result.console.tabId).toBe(validTabId);
  });

  test('callTool passes parameters correctly to getConsoleMessages', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, limit: 50, level: 'error' };
    
    const getConsoleMessagesSpy = jest.spyOn(server, 'getConsoleMessages').mockResolvedValue({
      success: true,
      message: 'Mocked response',
      console: {
        tabId: validTabId,
        totalMessages: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { level: 'error', limit: 50 },
        messages: []
      }
    });

    await server.callTool('get_console_messages', params);
    
    expect(getConsoleMessagesSpy).toHaveBeenCalledWith(params);
    expect(getConsoleMessagesSpy).toHaveBeenCalledTimes(1);
    
    getConsoleMessagesSpy.mockRestore();
  });

  test('callTool validates get_console_messages tool name', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock to avoid actual data access
    jest.spyOn(server, 'getConsoleMessages').mockResolvedValue({
      success: true,
      message: 'Test response',
      console: {
        tabId: validTabId,
        totalMessages: 0,
        returned: 0,
        timestamp: new Date().toISOString(),
        filters: { level: null, limit: 100 },
        messages: []
      }
    });

    // Should not throw error for valid tool name
    await expect(server.callTool('get_console_messages', { tabId: validTabId })).resolves.toBeDefined();
  });

  test('callTool propagates getConsoleMessages errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock getConsoleMessages to throw error
    jest.spyOn(server, 'getConsoleMessages').mockRejectedValue(new Error('Tab ID validation failed'));

    await expect(server.callTool('get_console_messages', { tabId: validTabId })).rejects.toThrow('Tab ID validation failed');
  });

  test('callTool handles get_console_messages parameter validation', async () => {
    // Mock getConsoleMessages to handle validation
    const getConsoleMessagesSpy = jest.spyOn(server, 'getConsoleMessages').mockImplementation(async (params) => {
      if (!params.tabId) {
        throw new Error('Tab ID is required and must be a non-empty string');
      }
      return {
        success: true,
        message: 'Console messages retrieved',
        console: {
          tabId: params.tabId,
          totalMessages: 0,
          returned: 0,
          timestamp: new Date().toISOString(),
          filters: { level: null, limit: 100 },
          messages: []
        }
      };
    });

    // Should propagate validation errors
    await expect(server.callTool('get_console_messages', {})).rejects.toThrow('Tab ID is required');
    
    getConsoleMessagesSpy.mockRestore();
  });

  test('get_console_messages tool integrates with full MCP flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test complete flow: listTools -> callTool
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    expect(getConsoleMessagesTool).toBeDefined();
    
    // Add some test console messages
    server.addStorageEntry('consoleMessages', validTabId, {
      level: 'log',
      text: 'Integration test message',
      timestamp: Date.now(),
      url: 'https://test.com',
      line: 10,
      column: 5
    });

    const result = await server.callTool('get_console_messages', { tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.console.tabId).toBe(validTabId);
    expect(result.console.messages).toHaveLength(1);
    expect(result.console.messages[0].text).toBe('Integration test message');
  });

  test('callTool error message includes get_console_messages in available tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(/get_console_messages/);
  });

  test('get_console_messages tool works with real data flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add multiple console messages with different levels
    const testMessages = [
      { level: 'log', text: 'Log message', timestamp: Date.now() - 3000, url: 'https://test.com' },
      { level: 'warn', text: 'Warning message', timestamp: Date.now() - 2000, url: 'https://test.com' },
      { level: 'error', text: 'Error message', timestamp: Date.now() - 1000, url: 'https://test.com' },
      { level: 'info', text: 'Info message', timestamp: Date.now(), url: 'https://test.com' }
    ];

    testMessages.forEach(msg => {
      server.addStorageEntry('consoleMessages', validTabId, msg);
    });

    // Test with no filters
    const allResult = await server.callTool('get_console_messages', { tabId: validTabId });
    expect(allResult.success).toBe(true);
    expect(allResult.console.messages).toHaveLength(4);
    expect(allResult.console.totalMessages).toBe(4);

    // Test with level filter
    const errorResult = await server.callTool('get_console_messages', { 
      tabId: validTabId, 
      level: 'error' 
    });
    expect(errorResult.success).toBe(true);
    expect(errorResult.console.messages).toHaveLength(1);
    expect(errorResult.console.messages[0].level).toBe('error');

    // Test with limit
    const limitedResult = await server.callTool('get_console_messages', { 
      tabId: validTabId, 
      limit: 2 
    });
    expect(limitedResult.success).toBe(true);
    expect(limitedResult.console.messages).toHaveLength(2);
    expect(limitedResult.console.returned).toBe(2);
    expect(limitedResult.console.totalMessages).toBe(4);
  });
});