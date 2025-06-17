import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 7.3: Implement getConsoleMessages Method', () => {
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

  test('getConsoleMessages method exists', () => {
    expect(typeof server.getConsoleMessages).toBe('function');
  });

  test('getConsoleMessages returns a promise', () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const result = server.getConsoleMessages({ tabId: validTabId });
    expect(result).toBeInstanceOf(Promise);
  });

  test('getConsoleMessages validates required tabId parameter', async () => {
    await expect(server.getConsoleMessages({})).rejects.toThrow();
    await expect(server.getConsoleMessages({ tabId: '' })).rejects.toThrow();
    await expect(server.getConsoleMessages({ tabId: 'invalid-id' })).rejects.toThrow();
  });

  test('getConsoleMessages validates optional parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.getConsoleMessages({ tabId: validTabId, limit: 0 })).rejects.toThrow();
    await expect(server.getConsoleMessages({ tabId: validTabId, limit: 1001 })).rejects.toThrow();
    await expect(server.getConsoleMessages({ tabId: validTabId, level: 'invalid' })).rejects.toThrow();
  });

  test('getConsoleMessages returns proper response format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.getConsoleMessages({ tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('console');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
    expect(typeof result.console).toBe('object');
    expect(Array.isArray(result.console.messages)).toBe(true);
  });

  test('getConsoleMessages returns empty array when no messages exist for tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.getConsoleMessages({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toEqual([]);
    expect(result.console.tabId).toBe(validTabId);
    expect(result.console.totalMessages).toBe(0);
  });

  test('getConsoleMessages returns stored messages for tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add test console messages
    const testMessages = [
      { level: 'log', text: 'First message', timestamp: Date.now() - 2000, url: 'https://test.com', line: 10, column: 5 },
      { level: 'warn', text: 'Second message', timestamp: Date.now() - 1000, url: 'https://test.com', line: 20, column: 10 },
      { level: 'error', text: 'Third message', timestamp: Date.now(), url: 'https://test.com', line: 30, column: 15 }
    ];

    testMessages.forEach(msg => {
      server.addStorageEntry('consoleMessages', validTabId, msg);
    });

    const result = await server.getConsoleMessages({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toHaveLength(3);
    expect(result.console.totalMessages).toBe(3);
    expect(result.console.tabId).toBe(validTabId);
    
    // Messages should be returned in reverse chronological order (most recent first)
    expect(result.console.messages[0].text).toBe('Third message');
    expect(result.console.messages[1].text).toBe('Second message');
    expect(result.console.messages[2].text).toBe('First message');
  });

  test('getConsoleMessages applies limit parameter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add 5 test messages
    for (let i = 0; i < 5; i++) {
      server.addStorageEntry('consoleMessages', validTabId, {
        level: 'log',
        text: `Message ${i + 1}`,
        timestamp: Date.now() + i * 1000
      });
    }

    const result = await server.getConsoleMessages({ tabId: validTabId, limit: 2 });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toHaveLength(2);
    expect(result.console.totalMessages).toBe(5); // Total available
    expect(result.console.returned).toBe(2); // Actually returned
    
    // Should return the 2 most recent messages
    expect(result.console.messages[0].text).toBe('Message 5');
    expect(result.console.messages[1].text).toBe('Message 4');
  });

  test('getConsoleMessages applies level filter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add messages with different levels
    const testMessages = [
      { level: 'log', text: 'Log message', timestamp: Date.now() - 3000 },
      { level: 'warn', text: 'Warning message', timestamp: Date.now() - 2000 },
      { level: 'error', text: 'Error message', timestamp: Date.now() - 1000 },
      { level: 'info', text: 'Info message', timestamp: Date.now() }
    ];

    testMessages.forEach(msg => {
      server.addStorageEntry('consoleMessages', validTabId, msg);
    });

    const result = await server.getConsoleMessages({ tabId: validTabId, level: 'error' });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toHaveLength(1);
    expect(result.console.messages[0].text).toBe('Error message');
    expect(result.console.messages[0].level).toBe('error');
    expect(result.console.totalMessages).toBe(4); // Total available
    expect(result.console.returned).toBe(1); // Filtered count
  });

  test('getConsoleMessages combines limit and level filter', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add multiple warn messages and other levels
    const testMessages = [
      { level: 'warn', text: 'First warning', timestamp: Date.now() - 4000 },
      { level: 'log', text: 'Log message', timestamp: Date.now() - 3000 },
      { level: 'warn', text: 'Second warning', timestamp: Date.now() - 2000 },
      { level: 'error', text: 'Error message', timestamp: Date.now() - 1000 },
      { level: 'warn', text: 'Third warning', timestamp: Date.now() }
    ];

    testMessages.forEach(msg => {
      server.addStorageEntry('consoleMessages', validTabId, msg);
    });

    const result = await server.getConsoleMessages({ tabId: validTabId, level: 'warn', limit: 2 });
    
    expect(result.success).toBe(true);
    expect(result.console.messages).toHaveLength(2);
    expect(result.console.messages[0].text).toBe('Third warning');
    expect(result.console.messages[1].text).toBe('Second warning');
    expect(result.console.totalMessages).toBe(5); // Total available
    expect(result.console.returned).toBe(2); // Filtered and limited
  });

  test('getConsoleMessages handles different tabs separately', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    server.addStorageEntry('consoleMessages', tabId1, { level: 'log', text: 'Tab 1 message', timestamp: Date.now() });
    server.addStorageEntry('consoleMessages', tabId2, { level: 'log', text: 'Tab 2 message', timestamp: Date.now() });

    const result1 = await server.getConsoleMessages({ tabId: tabId1 });
    const result2 = await server.getConsoleMessages({ tabId: tabId2 });
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    
    expect(result1.console.messages).toHaveLength(1);
    expect(result2.console.messages).toHaveLength(1);
    
    expect(result1.console.messages[0].text).toBe('Tab 1 message');
    expect(result2.console.messages[0].text).toBe('Tab 2 message');
  });

  test('getConsoleMessages includes metadata in response', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    server.addStorageEntry('consoleMessages', validTabId, { level: 'log', text: 'Test message', timestamp: Date.now() });

    const result = await server.getConsoleMessages({ tabId: validTabId });
    
    expect(result.console).toHaveProperty('tabId', validTabId);
    expect(result.console).toHaveProperty('totalMessages');
    expect(result.console).toHaveProperty('returned');
    expect(result.console).toHaveProperty('timestamp');
    expect(typeof result.console.timestamp).toBe('string');
  });
});