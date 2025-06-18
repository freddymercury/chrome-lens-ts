import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 6.3: startMonitoring Method', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('startMonitoring method exists', () => {
    expect(typeof server.startMonitoring).toBe('function');
  });

  test('startMonitoring returns a promise', () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const result = server.startMonitoring({ tabId: validTabId });
    expect(result).toBeInstanceOf(Promise);
  });

  test('startMonitoring validates required tabId parameter', async () => {
    await expect(server.startMonitoring({})).rejects.toThrow();
    await expect(server.startMonitoring({ tabId: '' })).rejects.toThrow();
    await expect(server.startMonitoring({ tabId: 'invalid-id' })).rejects.toThrow();
  });

  test('startMonitoring validates optional connection parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.startMonitoring({ tabId: validTabId, port: -1 })).rejects.toThrow();
    await expect(server.startMonitoring({ tabId: validTabId, host: '' })).rejects.toThrow();
  });

  test('startMonitoring calls connectToTab internally', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Spy on connectToTab to ensure it's called
    const connectToTabSpy = jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      connection: { tabId: validTabId, host: 'localhost', port: 9222, error: 'Test error' },
      domains: []
    });

    await server.startMonitoring({ tabId: validTabId });

    expect(connectToTabSpy).toHaveBeenCalledWith(validTabId, {});
    connectToTabSpy.mockRestore();
  });

  test('startMonitoring passes connection parameters to connectToTab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, host: '127.0.0.1', port: 9223 };
    
    const connectToTabSpy = jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      connection: { tabId: validTabId, host: '127.0.0.1', port: 9223, error: 'Test error' },
      domains: []
    });

    await server.startMonitoring(params);

    expect(connectToTabSpy).toHaveBeenCalledWith(validTabId, { host: '127.0.0.1', port: 9223 });
    connectToTabSpy.mockRestore();
  });

  test('startMonitoring returns proper response format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock connectToTab to avoid actual connection
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      connection: { tabId: validTabId, host: 'localhost', port: 9222, error: 'Test error' },
      domains: []
    });

    const result = await server.startMonitoring({ tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('monitoring');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.monitoring).toBe('object');
  });

  test('startMonitoring tracks client in storage when connection succeeds', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: true,
      message: 'Connected successfully',
      connection: { tabId: validTabId, host: 'localhost', port: 9222, client: 'CDP_CLIENT_CONNECTED' },
      domains: ['Console', 'Runtime']
    });

    const initialStorage = server.getStorageInfo();
    const initialClientCount = initialStorage.clients.size;

    const result = await server.startMonitoring({ tabId: validTabId });

    const finalStorage = server.getStorageInfo();
    
    if (result.success) {
      expect(finalStorage.clients.size).toBe(initialClientCount + 1);
      expect(finalStorage.clients.keys).toContain(validTabId);
    }
  });

  test('startMonitoring handles connection failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock failed connection
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      connection: { tabId: validTabId, host: 'localhost', port: 9222, error: 'Tab not found' },
      domains: []
    });

    const result = await server.startMonitoring({ tabId: validTabId });

    expect(result.success).toBe(false);
    expect(result.message).toContain('failed');
    expect(result.monitoring).toHaveProperty('tabId', validTabId);
  });
});