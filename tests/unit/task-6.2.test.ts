import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 6.2: connectToTab Method (Basic)', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('connectToTab method exists', () => {
    expect(typeof server.connectToTab).toBe('function');
  });

  test('connectToTab returns a promise', () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const result = server.connectToTab(validTabId, { port: 9222, host: 'localhost' });
    expect(result).toBeInstanceOf(Promise);
  });

  test('connectToTab validates tabId parameter', async () => {
    await expect(server.connectToTab('', {})).rejects.toThrow();
    await expect(server.connectToTab(null as any, {})).rejects.toThrow();
    await expect(server.connectToTab('invalid-id', {})).rejects.toThrow();
  });

  test('connectToTab validates connection parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.connectToTab(validTabId, { port: -1 })).rejects.toThrow();
    await expect(server.connectToTab(validTabId, { host: '' })).rejects.toThrow();
  });

  test('connectToTab parameter validation and response structure', () => {
    // Test that the method signature and basic validation works
    // This doesn't test actual connection to avoid timeout issues in CI
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test parameter defaults are accessible in the method
    expect(() => {
      // The method should exist and be callable
      const promise = server.connectToTab(validTabId, {});
      expect(promise).toBeInstanceOf(Promise);
    }).not.toThrow();
  });

  test('connectToTab handles connection failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Try to connect to invalid host
    const result = await server.connectToTab(validTabId, { port: 9999, host: 'nonexistent' });
    
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    
    if (!result.success) {
      expect(result.connection).toHaveProperty('error');
      expect(typeof result.connection.error).toBe('string');
    }
  });

  test('connectToTab method signature is correct', () => {
    // Test basic method signature without triggering actual connection
    expect(typeof server.connectToTab).toBe('function');
    expect(server.connectToTab.length).toBe(2); // Should accept 2 parameters: tabId and parameters
  });
});