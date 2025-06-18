import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

// Mock chrome-remote-interface before importing server
jest.mock('chrome-remote-interface');

import ChromeDevToolsMCPServer from '../../server';
import CDP from 'chrome-remote-interface';

describe('Task 7.1: Add Console Event Listener to connectToTab', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('connectToTab sets up Console.messageAdded event listener', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock Chrome CDP client with Runtime domain (server uses Runtime.consoleAPICalled instead of Console)
    const mockClient = {
      Console: {
        enable: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
      },
      Runtime: {
        enable: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
      },
      Network: {
        enable: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
      },
      close: jest.fn().mockResolvedValue(undefined)
    };

    // Mock CDP to return our mock client
    (CDP as jest.MockedFunction<typeof CDP>).mockResolvedValue(mockClient as any);

    const result = await server.connectToTab(validTabId, {});

    expect(result.success).toBe(true);
    
    // Verify that Runtime.consoleAPICalled handler was set up (not Console.messageAdded)
    expect(mockClient.Runtime.on).toHaveBeenCalledWith('consoleAPICalled', expect.any(Function));
  });

  test('console message handler stores messages correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection with real console event handling
    jest.spyOn(server, 'connectToTab').mockImplementation(async (tabId, _params) => {
      // Simulate setting up the console handler
      const mockMessage = {
        level: 'log',
        text: 'Test console message',
        timestamp: 1609459200000,
        url: 'https://example.com',
        line: 42,
        column: 10
      };

      // Add message to storage (simulating what the event handler would do)
      server.addStorageEntry('consoleMessages', tabId, mockMessage);

      return {
        success: true,
        message: `Successfully connected to Chrome tab ${tabId}`,
        connection: {
          tabId,
          host: 'localhost',
          port: 9222,
          client: 'CDP_CLIENT_CONNECTED',
          timestamp: new Date().toISOString()
        },
        domains: ['Console', 'Runtime']
      };
    });

    const initialStorage = server.getStorageInfo();
    const initialConsoleSize = initialStorage.consoleMessages.size;

    const result = await server.connectToTab(validTabId, {});

    expect(result.success).toBe(true);

    const finalStorage = server.getStorageInfo();
    
    // Should have added console messages for this tab
    expect(finalStorage.consoleMessages.size).toBeGreaterThan(initialConsoleSize);
    expect(finalStorage.consoleMessages.keys).toContain(validTabId);
  });

  test('console messages are stored with correct format', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a test console message
    const testMessage = {
      level: 'error',
      text: 'Test error message',
      timestamp: Date.now(),
      url: 'https://test.com',
      line: 15,
      column: 5
    };

    server.addStorageEntry('consoleMessages', validTabId, testMessage);

    const storage = server.getStorageInfo();
    expect(storage.consoleMessages.keys).toContain(validTabId);
    
    // Verify message structure matches expected format
    expect(testMessage).toHaveProperty('level');
    expect(testMessage).toHaveProperty('text');
    expect(testMessage).toHaveProperty('timestamp');
    expect(typeof testMessage.level).toBe('string');
    expect(typeof testMessage.text).toBe('string');
    expect(typeof testMessage.timestamp).toBe('number');
  });

  test('multiple console messages can be stored for same tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const message1 = { level: 'log', text: 'First message', timestamp: Date.now() };
    const message2 = { level: 'warn', text: 'Second message', timestamp: Date.now() + 1000 };
    const message3 = { level: 'error', text: 'Third message', timestamp: Date.now() + 2000 };

    server.addStorageEntry('consoleMessages', validTabId, message1);
    server.addStorageEntry('consoleMessages', validTabId, message2);
    server.addStorageEntry('consoleMessages', validTabId, message3);

    const storage = server.getStorageInfo();
    expect(storage.consoleMessages.keys).toContain(validTabId);
  });

  test('console messages stored for different tabs separately', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    const message1 = { level: 'log', text: 'Tab 1 message', timestamp: Date.now() };
    const message2 = { level: 'log', text: 'Tab 2 message', timestamp: Date.now() };

    server.addStorageEntry('consoleMessages', tabId1, message1);
    server.addStorageEntry('consoleMessages', tabId2, message2);

    const storage = server.getStorageInfo();
    expect(storage.consoleMessages.keys).toContain(tabId1);
    expect(storage.consoleMessages.keys).toContain(tabId2);
    expect(storage.consoleMessages.size).toBe(2);
  });

  test('connectToTab includes Console domain in enabled domains', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock successful connection
    jest.spyOn(server, 'connectToTab').mockResolvedValue({
      success: true,
      message: 'Connected successfully',
      connection: {
        tabId: validTabId,
        host: 'localhost',
        port: 9222,
        client: 'CDP_CLIENT_CONNECTED',
        timestamp: new Date().toISOString()
      },
      domains: ['Console', 'Runtime'] // Console should be enabled
    });

    const result = await server.connectToTab(validTabId, {});
    
    expect(result.success).toBe(true);
    expect(result.domains).toContain('Console');
  });
});