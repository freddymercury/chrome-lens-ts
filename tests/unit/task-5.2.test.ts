import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 5.2: listTabs Method', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('listTabs method exists', () => {
    expect(typeof server.listTabs).toBe('function');
  });

  test('listTabs returns a promise', () => {
    const result = server.listTabs({ port: 9222, host: 'localhost' });
    expect(result).toBeInstanceOf(Promise);
  });

  test('listTabs returns formatted tab data', async () => {
    const result = await server.listTabs({ port: 9222, host: 'localhost' });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('tabs');
    expect(Array.isArray(result.tabs)).toBe(true);
  });

  test('listTabs uses default parameters when not provided', async () => {
    const result = await server.listTabs({});
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('tabs');
  });

  test('listTabs validates parameters like connectToChrome', async () => {
    await expect(server.listTabs({ port: -1 })).rejects.toThrow();
    await expect(server.listTabs({ host: '' })).rejects.toThrow();
  });

  test('listTabs includes required tab fields', async () => {
    const result = await server.listTabs({ port: 9222, host: 'localhost' });
    
    if (result.success && result.tabs.length > 0) {
      const tab = result.tabs[0];
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('title');
      expect(tab).toHaveProperty('url');
      expect(tab).toHaveProperty('type');
      
      expect(typeof tab.id).toBe('string');
      expect(typeof tab.title).toBe('string');
      expect(typeof tab.url).toBe('string');
      expect(typeof tab.type).toBe('string');
    }
  });

  test('listTabs includes connection information', async () => {
    const params = { port: 9222, host: 'localhost' };
    const result = await server.listTabs(params);
    
    expect(result).toHaveProperty('connection');
    expect(result.connection).toHaveProperty('host');
    expect(result.connection).toHaveProperty('port');
    expect(result.connection.host).toBe(params.host);
    expect(result.connection.port).toBe(params.port);
  });

  test('listTabs handles connection failures gracefully', async () => {
    // Try to connect to a port where Chrome is not running
    const result = await server.listTabs({ port: 9999, host: 'localhost' });
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    
    if (!result.success) {
      expect(result).toHaveProperty('connection');
      expect(result.connection).toHaveProperty('error');
    }
  });

  test('listTabs returns proper response format', async () => {
    const result = await server.listTabs({});
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('connection');
    expect(result).toHaveProperty('tabs');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.connection).toBe('object');
    expect(Array.isArray(result.tabs)).toBe(true);
  });
});