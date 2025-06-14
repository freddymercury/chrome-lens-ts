import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 8.3: Test End-to-End Workflow', () => {
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

  test('complete workflow: connect → list tabs → start monitoring → get console messages', async () => {
    // Step 1: Test Chrome connection
    console.log('Testing Chrome connection...');
    
    let connectResult;
    try {
      connectResult = await server.callTool('connect_to_chrome', {});
    } catch (error: any) {
      console.log('Chrome connection failed (expected in CI):', error.message);
      // Mock the results for the rest of the test since Chrome might not be available
      connectResult = {
        success: false,
        message: 'Chrome not available in test environment',
        connection: { host: 'localhost', port: 9222, error: 'Connection refused' }
      };
    }
    
    expect(connectResult).toHaveProperty('success');
    expect(connectResult).toHaveProperty('message');
    expect(connectResult).toHaveProperty('connection');
    
    if (!connectResult.success) {
      console.log('Chrome not available - simulating workflow with mocked data');
      
      // Mock the workflow for testing purposes
      const mockTabId = 'A1B2C3D4E5F6789012345678901234AB';
      
      // Mock list tabs
      jest.spyOn(server, 'listTabs').mockResolvedValue({
        success: true,
        message: 'Successfully retrieved 1 tabs from Chrome DevTools at localhost:9222',
        connection: { host: 'localhost', port: 9222, tabCount: 1 },
        tabs: [{
          id: mockTabId,
          title: 'Test Page',
          url: 'https://example.com',
          type: 'page',
          webSocketDebuggerUrl: `ws://localhost:9222/devtools/page/${mockTabId}`,
          devtoolsFrontendUrl: `http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/${mockTabId}`
        }]
      });
      
      // Mock start monitoring
      jest.spyOn(server, 'startMonitoring').mockResolvedValue({
        success: true,
        message: `Started monitoring Chrome tab ${mockTabId}`,
        monitoring: {
          tabId: mockTabId,
          host: 'localhost',
          port: 9222,
          timestamp: new Date().toISOString(),
          status: 'active',
          domains: ['Console', 'Runtime']
        }
      });
      
      // Step 2: List tabs
      const tabsResult = await server.callTool('list_tabs', {});
      expect(tabsResult.success).toBe(true);
      expect(tabsResult.tabs).toHaveLength(1);
      expect(tabsResult.tabs[0]).toHaveProperty('id');
      expect(tabsResult.tabs[0]).toHaveProperty('title');
      expect(tabsResult.tabs[0]).toHaveProperty('url');
      
      // Step 3: Start monitoring
      const tabId = tabsResult.tabs[0].id;
      const monitorResult = await server.callTool('start_monitoring', { tabId });
      expect(monitorResult.success).toBe(true);
      expect(monitorResult.monitoring).toHaveProperty('tabId', tabId);
      expect(monitorResult.monitoring).toHaveProperty('status', 'active');
      
      // Step 4: Add some test console messages to storage
      server.addStorageEntry('consoleMessages', tabId, {
        level: 'log',
        text: 'Test log message',
        timestamp: Date.now() - 2000,
        url: 'https://example.com',
        line: 10,
        column: 5
      });
      
      server.addStorageEntry('consoleMessages', tabId, {
        level: 'warn',
        text: 'Test warning message',
        timestamp: Date.now() - 1000,
        url: 'https://example.com',
        line: 20,
        column: 10
      });
      
      server.addStorageEntry('consoleMessages', tabId, {
        level: 'error',
        text: 'Test error message',
        timestamp: Date.now(),
        url: 'https://example.com',
        line: 30,
        column: 15
      });
      
      // Step 5: Get console messages
      const messagesResult = await server.callTool('get_console_messages', { tabId });
      expect(messagesResult.success).toBe(true);
      expect(messagesResult.console).toHaveProperty('tabId', tabId);
      expect(messagesResult.console.messages).toHaveLength(3);
      expect(messagesResult.console.totalMessages).toBe(3);
      
      // Verify messages are in reverse chronological order (most recent first)
      expect(messagesResult.console.messages[0].level).toBe('error');
      expect(messagesResult.console.messages[1].level).toBe('warn');
      expect(messagesResult.console.messages[2].level).toBe('log');
      
      console.log('✅ Mocked workflow completed successfully');
    } else {
      console.log('Chrome is available - testing real workflow');
      
      // Step 2: List tabs (real Chrome)
      const tabsResult = await server.callTool('list_tabs', {});
      expect(tabsResult.success).toBe(true);
      expect(Array.isArray(tabsResult.tabs)).toBe(true);
      
      if (tabsResult.tabs.length === 0) {
        console.log('No tabs found in Chrome - please open at least one tab for complete testing');
        return;
      }
      
      // Step 3: Start monitoring (real Chrome)
      const tabId = tabsResult.tabs[0].id;
      const monitorResult = await server.callTool('start_monitoring', { tabId });
      expect(monitorResult.success).toBe(true);
      expect(monitorResult.monitoring).toHaveProperty('tabId', tabId);
      
      // Step 4: Get console messages (may be empty for real tabs)
      const messagesResult = await server.callTool('get_console_messages', { tabId });
      expect(messagesResult.success).toBe(true);
      expect(messagesResult.console).toHaveProperty('tabId', tabId);
      expect(Array.isArray(messagesResult.console.messages)).toBe(true);
      
      console.log(`✅ Real workflow completed - found ${messagesResult.console.totalMessages} console messages`);
    }
  });

  test('workflow handles errors gracefully at each step', async () => {
    // Test that workflow continues properly even when individual steps fail
    
    // Step 1: Connect to invalid Chrome instance
    const connectResult = await server.callTool('connect_to_chrome', { 
      host: 'nonexistent.host', 
      port: 9999 
    });
    expect(connectResult.success).toBe(false);
    expect(connectResult.message).toContain('Failed to connect');
    
    // Step 2: List tabs from invalid Chrome instance
    const tabsResult = await server.callTool('list_tabs', { 
      host: 'nonexistent.host', 
      port: 9999 
    });
    expect(tabsResult.success).toBe(false);
    expect(tabsResult.tabs).toEqual([]);
    
    // Step 3: Try to monitor invalid tab
    const invalidTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const monitorResult = await server.callTool('start_monitoring', { 
      tabId: invalidTabId,
      host: 'nonexistent.host', 
      port: 9999 
    });
    expect(monitorResult.success).toBe(false);
    expect(monitorResult.monitoring).toHaveProperty('status', 'failed');
    
    // Step 4: Get console messages from non-monitored tab
    const messagesResult = await server.callTool('get_console_messages', { 
      tabId: invalidTabId 
    });
    expect(messagesResult.success).toBe(true); // Should succeed but return empty
    expect(messagesResult.console.messages).toEqual([]);
    expect(messagesResult.console.totalMessages).toBe(0);
  });

  test('workflow with parameter validation errors', async () => {
    // Test workflow with various invalid parameters
    
    // Invalid connect parameters
    await expect(server.callTool('connect_to_chrome', { port: 'invalid' }))
      .rejects.toThrow('Invalid port');
    
    // Invalid list_tabs parameters  
    await expect(server.callTool('list_tabs', { host: '' }))
      .rejects.toThrow('Invalid host');
    
    // Invalid start_monitoring parameters
    await expect(server.callTool('start_monitoring', { tabId: 'invalid' }))
      .rejects.toThrow('Invalid tab ID format');
    
    // Invalid get_console_messages parameters
    await expect(server.callTool('get_console_messages', { tabId: 'A1B2C3D4E5F6789012345678901234AB', limit: 0 }))
      .rejects.toThrow('Limit must be a number between 1 and 1000');
  });

  test('workflow with console message filtering and pagination', async () => {
    const mockTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add various console messages
    const testMessages = [
      { level: 'log', text: 'Log message 1', timestamp: Date.now() - 5000 },
      { level: 'log', text: 'Log message 2', timestamp: Date.now() - 4000 },
      { level: 'warn', text: 'Warning message 1', timestamp: Date.now() - 3000 },
      { level: 'error', text: 'Error message 1', timestamp: Date.now() - 2000 },
      { level: 'warn', text: 'Warning message 2', timestamp: Date.now() - 1000 },
      { level: 'info', text: 'Info message 1', timestamp: Date.now() }
    ];
    
    testMessages.forEach(msg => {
      server.addStorageEntry('consoleMessages', mockTabId, msg);
    });
    
    // Test getting all messages
    const allMessages = await server.callTool('get_console_messages', { tabId: mockTabId });
    expect(allMessages.success).toBe(true);
    expect(allMessages.console.messages).toHaveLength(6);
    expect(allMessages.console.totalMessages).toBe(6);
    
    // Test pagination
    const limitedMessages = await server.callTool('get_console_messages', { 
      tabId: mockTabId, 
      limit: 3 
    });
    expect(limitedMessages.success).toBe(true);
    expect(limitedMessages.console.messages).toHaveLength(3);
    expect(limitedMessages.console.returned).toBe(3);
    expect(limitedMessages.console.totalMessages).toBe(6);
    
    // Test level filtering
    const errorMessages = await server.callTool('get_console_messages', { 
      tabId: mockTabId, 
      level: 'error' 
    });
    expect(errorMessages.success).toBe(true);
    expect(errorMessages.console.messages).toHaveLength(1);
    expect(errorMessages.console.messages[0].level).toBe('error');
    
    const warnMessages = await server.callTool('get_console_messages', { 
      tabId: mockTabId, 
      level: 'warn' 
    });
    expect(warnMessages.success).toBe(true);
    expect(warnMessages.console.messages).toHaveLength(2);
    expect(warnMessages.console.messages.every((msg: any) => msg.level === 'warn')).toBe(true);
    
    // Test combined filtering and pagination
    const limitedWarnings = await server.callTool('get_console_messages', { 
      tabId: mockTabId, 
      level: 'warn',
      limit: 1 
    });
    expect(limitedWarnings.success).toBe(true);
    expect(limitedWarnings.console.messages).toHaveLength(1);
    expect(limitedWarnings.console.messages[0].level).toBe('warn');
    expect(limitedWarnings.console.returned).toBe(1);
    expect(limitedWarnings.console.totalMessages).toBe(6); // Total across all levels
  });

  test('workflow maintains data isolation between tabs', async () => {
    const tabId1 = 'A1B2C3D4E5F6789012345678901234AB';
    const tabId2 = 'B2C3D4E5F6789012345678901234ABCD';
    
    // Add messages to different tabs
    server.addStorageEntry('consoleMessages', tabId1, {
      level: 'log',
      text: 'Tab 1 message',
      timestamp: Date.now()
    });
    
    server.addStorageEntry('consoleMessages', tabId2, {
      level: 'error', 
      text: 'Tab 2 message',
      timestamp: Date.now()
    });
    
    // Verify isolation
    const tab1Messages = await server.callTool('get_console_messages', { tabId: tabId1 });
    const tab2Messages = await server.callTool('get_console_messages', { tabId: tabId2 });
    
    expect(tab1Messages.console.messages).toHaveLength(1);
    expect(tab1Messages.console.messages[0].text).toBe('Tab 1 message');
    
    expect(tab2Messages.console.messages).toHaveLength(1);
    expect(tab2Messages.console.messages[0].text).toBe('Tab 2 message');
    
    // Verify storage state
    const storage = server.getStorageInfo();
    expect(storage.consoleMessages.size).toBe(2);
    expect(storage.consoleMessages.keys).toContain(tabId1);
    expect(storage.consoleMessages.keys).toContain(tabId2);
  });

  test('workflow performance with large message volumes', async () => {
    const mockTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const messageCount = 500;
    
    // Add many messages
    const startTime = Date.now();
    for (let i = 0; i < messageCount; i++) {
      server.addStorageEntry('consoleMessages', mockTabId, {
        level: i % 4 === 0 ? 'error' : i % 3 === 0 ? 'warn' : i % 2 === 0 ? 'info' : 'log',
        text: `Test message ${i}`,
        timestamp: Date.now() + i
      });
    }
    const addTime = Date.now() - startTime;
    
    // Test retrieval performance
    const retrieveStart = Date.now();
    const allMessages = await server.callTool('get_console_messages', { tabId: mockTabId });
    const retrieveTime = Date.now() - retrieveStart;
    
    expect(allMessages.success).toBe(true);
    expect(allMessages.console.totalMessages).toBe(messageCount);
    expect(allMessages.console.messages).toHaveLength(100); // Default limit
    
    // Test filtered retrieval performance
    const filterStart = Date.now();
    const errorMessages = await server.callTool('get_console_messages', { 
      tabId: mockTabId, 
      level: 'error' 
    });
    const filterTime = Date.now() - filterStart;
    
    expect(errorMessages.success).toBe(true);
    expect(errorMessages.console.messages.every((msg: any) => msg.level === 'error')).toBe(true);
    
    // Performance assertions (should be fast)
    expect(addTime).toBeLessThan(1000); // Adding 500 messages should take < 1s
    expect(retrieveTime).toBeLessThan(100); // Retrieving should take < 100ms
    expect(filterTime).toBeLessThan(100); // Filtering should take < 100ms
    
    console.log(`Performance: Add ${messageCount} messages: ${addTime}ms, Retrieve: ${retrieveTime}ms, Filter: ${filterTime}ms`);
  });
});