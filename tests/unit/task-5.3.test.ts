import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 5.3: listTabs CallTool Handler', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('callTool executes list_tabs tool', async () => {
    const result = await server.callTool('list_tabs', {
      port: 9222,
      host: 'localhost'
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
    expect(result).toHaveProperty('tabs');
    expect(Array.isArray(result.tabs)).toBe(true);
  });

  test('callTool list_tabs uses default parameters', async () => {
    const result = await server.callTool('list_tabs', {});

    expect(result).toBeDefined();
    expect(result.connection).toHaveProperty('host');
    expect(result.connection).toHaveProperty('port');
    expect(result.connection.host).toBe('localhost');
    expect(result.connection.port).toBe(9222);
  });

  test('callTool list_tabs validates parameters', async () => {
    await expect(server.callTool('list_tabs', {
      port: -1
    })).rejects.toThrow();

    await expect(server.callTool('list_tabs', {
      host: ''
    })).rejects.toThrow();
  });

  test('callTool list_tabs passes parameters correctly', async () => {
    const customPort = 9223;
    const customHost = '127.0.0.1';
    
    const result = await server.callTool('list_tabs', {
      port: customPort,
      host: customHost
    });

    // Whether connection succeeds or fails, the parameters should be reflected in the response
    expect(result.connection.port).toBe(customPort);
    expect(result.connection.host).toBe(customHost);
  });

  test('callTool list_tabs returns tab data when Chrome is available', async () => {
    const result = await server.callTool('list_tabs', {});

    if (result.success) {
      expect(result.tabs).toBeDefined();
      expect(Array.isArray(result.tabs)).toBe(true);
      
      // If tabs are available, check their structure
      if (result.tabs.length > 0) {
        const tab = result.tabs[0];
        expect(tab).toHaveProperty('id');
        expect(tab).toHaveProperty('title');
        expect(tab).toHaveProperty('url');
        expect(tab).toHaveProperty('type');
      }
    }
  });

  test('callTool list_tabs returns proper tool response format', async () => {
    const result = await server.callTool('list_tabs', {});

    // Should return the same format as direct listTabs call
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
    expect(result).toHaveProperty('tabs');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.connection).toBe('object');
    expect(Array.isArray(result.tabs)).toBe(true);
  });

  test('both connect_to_chrome and list_tabs tools work via callTool', async () => {
    // Test connect_to_chrome
    const connectResult = await server.callTool('connect_to_chrome', {});
    expect(connectResult).toHaveProperty('success');
    expect(connectResult).toHaveProperty('connection');

    // Test list_tabs  
    const listResult = await server.callTool('list_tabs', {});
    expect(listResult).toHaveProperty('success');
    expect(listResult).toHaveProperty('tabs');
  });

  test('callTool still throws error for unknown tools after adding list_tabs', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Unknown tool')
      })
    );
  });
});