import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 8.2: Add Error Handling to All Methods', () => {
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

  test('callTool handles invalid tool names gracefully', async () => {
    await expect(server.callTool('invalid_tool', {})).rejects.toThrow('Unknown tool: invalid_tool');
  });

  test('callTool validates input parameters', async () => {
    await expect(server.callTool('', {})).rejects.toThrow('Tool name is required');
    await expect(server.callTool('connect_to_chrome', null)).rejects.toThrow('Tool parameters cannot be null');
  });

  test('connectToChrome handles connection failures gracefully', async () => {
    // Test with invalid host
    const result = await server.connectToChrome({ host: 'nonexistent.host', port: 9999 });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to connect');
    expect(result.connection).toHaveProperty('error');
  });

  test('connectToChrome validates input parameters', async () => {
    await expect(server.connectToChrome({ port: 999 })).rejects.toThrow('Invalid port');
    await expect(server.connectToChrome({ host: '' })).rejects.toThrow('Invalid host');
    await expect(server.connectToChrome({ host: 'invalid@host' })).rejects.toThrow('Invalid host format');
  });

  test('listTabs handles connection failures gracefully', async () => {
    // Test with invalid connection
    const result = await server.listTabs({ host: 'nonexistent.host', port: 9999 });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to list tabs');
    expect(result.connection).toHaveProperty('error');
    expect(result.tabs).toEqual([]);
  });

  test('listTabs validates input parameters', async () => {
    await expect(server.listTabs({ port: 999 })).rejects.toThrow('Invalid port');
    await expect(server.listTabs({ host: '' })).rejects.toThrow('Invalid host');
  });

  test('connectToTab handles invalid tab IDs', async () => {
    await expect(server.connectToTab('', {})).rejects.toThrow('Tab ID is required');
    await expect(server.connectToTab('invalid-id', {})).rejects.toThrow('Invalid tab ID format');
    await expect(server.connectToTab(null as any, {})).rejects.toThrow('Tab ID is required');
  });

  test('connectToTab validates connection parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.connectToTab(validTabId, { port: 999 })).rejects.toThrow('Invalid port');
    await expect(server.connectToTab(validTabId, { host: '' })).rejects.toThrow('Invalid host');
  });

  test('connectToTab handles connection failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.connectToTab(validTabId, { host: 'nonexistent.host', port: 9999 });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to connect');
    expect(result.connection).toHaveProperty('error');
    expect(result.domains).toEqual([]);
  });

  test('startMonitoring handles invalid parameters', async () => {
    await expect(server.startMonitoring({})).rejects.toThrow('Tab ID is required');
    await expect(server.startMonitoring({ tabId: '' })).rejects.toThrow('Tab ID is required');
    await expect(server.startMonitoring({ tabId: 'invalid' })).rejects.toThrow('Invalid tab ID format');
  });

  test('startMonitoring validates connection parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.startMonitoring({ tabId: validTabId, port: 999 })).rejects.toThrow('Invalid port');
    await expect(server.startMonitoring({ tabId: validTabId, host: '' })).rejects.toThrow('Invalid host');
  });

  test('startMonitoring handles connectToTab failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock connectToTab to fail
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      connection: { tabId: validTabId, host: 'localhost', port: 9222, error: 'Tab not found' },
      domains: []
    });

    const result = await server.startMonitoring({ tabId: validTabId });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to start monitoring');
    expect(result.monitoring).toHaveProperty('status', 'failed');
    expect(result.monitoring).toHaveProperty('error');
  });

  test('getConsoleMessages handles invalid parameters', async () => {
    await expect(server.getConsoleMessages({})).rejects.toThrow('Tab ID is required');
    await expect(server.getConsoleMessages({ tabId: '' })).rejects.toThrow('Tab ID is required');
    await expect(server.getConsoleMessages({ tabId: 'invalid' })).rejects.toThrow('Invalid tab ID format');
  });

  test('getConsoleMessages validates optional parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.getConsoleMessages({ tabId: validTabId, limit: 0 })).rejects.toThrow('Limit must be a number between 1 and 1000');
    await expect(server.getConsoleMessages({ tabId: validTabId, limit: 1001 })).rejects.toThrow('Limit must be a number between 1 and 1000');
    await expect(server.getConsoleMessages({ tabId: validTabId, level: 'invalid' })).rejects.toThrow('Level must be one of: log, info, warn, error, debug');
  });

  test('getConsoleMessages handles missing tab data gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.getConsoleMessages({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toEqual([]);
    expect(result.console.totalMessages).toBe(0);
  });

  test('all MCP tool methods return consistent error format', async () => {
    const invalidParams = [
      ['connect_to_chrome', { port: 999 }],
      ['list_tabs', { port: 999 }],
      ['start_monitoring', { tabId: 'invalid' }],
      ['get_console_messages', { tabId: 'invalid' }]
    ];

    for (const [toolName, params] of invalidParams) {
      try {
        await server.callTool(toolName as string, params);
        fail(`Expected ${toolName} to throw error`);
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    }
  });

  test('error messages are descriptive and helpful', async () => {
    const testCases = [
      { tool: 'connect_to_chrome', params: { port: 999 }, expectedKeywords: ['port', 'invalid'] },
      { tool: 'list_tabs', params: { host: '' }, expectedKeywords: ['host', 'invalid'] },
      { tool: 'start_monitoring', params: { tabId: '' }, expectedKeywords: ['tab', 'required'] },
      { tool: 'get_console_messages', params: { tabId: 'invalid' }, expectedKeywords: ['tab', 'format'] }
    ];

    for (const testCase of testCases) {
      try {
        await server.callTool(testCase.tool, testCase.params);
        fail(`Expected ${testCase.tool} to throw error`);
      } catch (error: any) {
        const message = error.message.toLowerCase();
        for (const keyword of testCase.expectedKeywords) {
          expect(message).toContain(keyword.toLowerCase());
        }
      }
    }
  });

  test('methods handle null and undefined inputs consistently', async () => {
    const nullTests = [
      () => server.callTool('connect_to_chrome', null as any),
      () => server.callTool('list_tabs', undefined as any),
      () => server.connectToTab(null as any, {}),
      () => server.connectToTab('A1B2C3D4E5F6789012345678901234AB', null as any)
    ];

    for (const test of nullTests) {
      await expect(test()).rejects.toThrow();
    }
  });

  test('server methods are defensive against malformed input', async () => {
    const malformedInputs = [
      { method: 'connectToChrome', input: { port: 'not-a-number' }, shouldFail: true },
      { method: 'connectToChrome', input: { host: 123 }, shouldFail: true },
      { method: 'listTabs', input: { port: 'not-a-number' }, shouldFail: true },
      { method: 'getConsoleMessages', input: { tabId: 'A1B2C3D4E5F6789012345678901234AB', limit: 'not-a-number' }, shouldFail: true }
    ];

    for (const testCase of malformedInputs) {
      if (testCase.shouldFail) {
        await expect((server as any)[testCase.method](testCase.input)).rejects.toThrow();
      } else {
        try {
          await (server as any)[testCase.method](testCase.input);
          // Some methods might handle type coercion gracefully
        } catch (error: any) {
          expect(error).toBeInstanceOf(Error);
          expect(typeof error.message).toBe('string');
        }
      }
    }
  });

  test('concurrent method calls handle errors independently', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Run multiple operations concurrently, some valid, some invalid
    const promises = [
      server.connectToChrome({}), // Should work (or fail gracefully)
      server.connectToChrome({ port: 999 }), // Should fail with validation error
      server.getConsoleMessages({ tabId: validTabId }), // Should work
      server.getConsoleMessages({ tabId: 'invalid' }), // Should fail with validation error
    ];

    const results = await Promise.allSettled(promises);
    
    // Check that errors are isolated and don't affect other operations
    expect(results).toHaveLength(4);
    expect(results[1].status).toBe('rejected'); // Invalid port
    expect(results[3].status).toBe('rejected'); // Invalid tab ID
  });
});