import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 4.3: connectToChrome CallTool Handler', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('callTool executes connect_to_chrome tool', async () => {
    const result = await server.callTool('connect_to_chrome', {
      port: 9222,
      host: 'localhost'
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
  });

  test('callTool connect_to_chrome uses default parameters', async () => {
    const result = await server.callTool('connect_to_chrome', {});

    expect(result).toBeDefined();
    expect(result.connection).toHaveProperty('host');
    expect(result.connection).toHaveProperty('port');
    expect(result.connection.host).toBe('localhost');
    expect(result.connection.port).toBe(9222);
  });

  test('callTool connect_to_chrome validates parameters', async () => {
    await expect(server.callTool('connect_to_chrome', {
      port: -1
    })).rejects.toThrow();

    await expect(server.callTool('connect_to_chrome', {
      host: ''
    })).rejects.toThrow();
  });

  test('callTool connect_to_chrome passes parameters correctly', async () => {
    const customPort = 9223;
    const customHost = '127.0.0.1';
    
    const result = await server.callTool('connect_to_chrome', {
      port: customPort,
      host: customHost
    });

    // Whether connection succeeds or fails, the parameters should be reflected in the response
    expect(result.connection.port).toBe(customPort);
    expect(result.connection.host).toBe(customHost);
  });

  test('callTool still throws error for unknown tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Unknown tool')
      })
    );
  });

  test('callTool connect_to_chrome returns proper tool response format', async () => {
    const result = await server.callTool('connect_to_chrome', {});

    // Should return the same format as direct connectToChrome call
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.connection).toBe('object');
  });
});