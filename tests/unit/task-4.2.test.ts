import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 4.2: connectToChrome Method (Basic)', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('connectToChrome method exists', () => {
    expect(typeof server.connectToChrome).toBe('function');
  });

  test('connectToChrome returns a promise', () => {
    const result = server.connectToChrome({ port: 9222, host: 'localhost' });
    expect(result).toBeInstanceOf(Promise);
  });

  test('connectToChrome handles valid parameters', async () => {
    const params = { port: 9222, host: 'localhost' };
    
    // Mock the actual Chrome connection since Chrome may not be running
    const result = await server.connectToChrome(params);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('connectToChrome uses default parameters when not provided', async () => {
    const result = await server.connectToChrome({});
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('connectToChrome validates port parameter', async () => {
    await expect(server.connectToChrome({ port: -1 })).rejects.toThrow();
    await expect(server.connectToChrome({ port: 70000 })).rejects.toThrow();
  });

  test('connectToChrome validates host parameter', async () => {
    await expect(server.connectToChrome({ host: '' })).rejects.toThrow();
    await expect(server.connectToChrome({ host: 'invalid host!' })).rejects.toThrow();
  });

  test('connectToChrome returns formatted response with success status', async () => {
    const result = await server.connectToChrome({ port: 9222, host: 'localhost' });
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.connection).toBe('object');
  });

  test('connectToChrome includes connection details in response', async () => {
    const params = { port: 9222, host: 'localhost' };
    const result = await server.connectToChrome(params);
    
    expect(result.connection).toHaveProperty('host');
    expect(result.connection).toHaveProperty('port');
    expect(result.connection.host).toBe(params.host);
    expect(result.connection.port).toBe(params.port);
  });
});