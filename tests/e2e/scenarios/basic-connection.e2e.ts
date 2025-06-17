/**
 * E2E tests for basic Chrome connection and tab management
 */

import { ChromeInstance, launchChrome } from '../utils/chrome-launcher';
import { MCPTestClient, connectMCP } from '../utils/mcp-client';
import { loadFixture, waitForCondition } from '../utils/test-helpers';

describe('Chrome Connection E2E', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    // Launch Chrome with debugging enabled
    chrome = await launchChrome({
      headless: process.env.HEADLESS !== 'false',
      port: 9222
    });
    
    // Connect MCP server to Chrome
    mcp = await connectMCP({
      host: 'localhost',
      port: 9222
    });
  }, 30000);
  
  afterAll(async () => {
    await mcp?.disconnect();
    await chrome?.close();
  });
  
  describe('Connection Management', () => {
    test('should connect to Chrome DevTools', async () => {
      const result = await mcp.call('connect_to_chrome', {
        host: 'localhost',
        port: 9222
      });
      
      expect(result).toMatchObject({
        success: true,
        message: expect.stringContaining('Connected to Chrome')
      });
    });
    
    test('should handle connection to invalid port', async () => {
      await expect(
        mcp.call('connect_to_chrome', {
          host: 'localhost',
          port: 9999
        })
      ).rejects.toThrow(/ECONNREFUSED/);
    });
  });
  
  describe('Tab Management', () => {
    test('should list all open tabs', async () => {
      // Open multiple tabs
      const tab1 = await chrome.newTab('https://example.com');
      const tab2 = await chrome.newTab('https://google.com');
      
      const result = await mcp.call('list_tabs', {});
      
      expect(result.tabs).toBeInstanceOf(Array);
      expect(result.tabs.length).toBeGreaterThanOrEqual(2);
      expect(result.tabs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^[A-F0-9]{32}$/),
            title: expect.any(String),
            url: expect.any(String)
          })
        ])
      );
      
      // Clean up
      await chrome.closeTab(tab1.id);
      await chrome.closeTab(tab2.id);
    });
    
    test('should start monitoring a specific tab', async () => {
      // Load test fixture
      const { tabId } = await loadFixture(chrome, 'index.html');
      
      const result = await mcp.call('start_monitoring', { tabId });
      
      expect(result).toMatchObject({
        success: true,
        tabId,
        monitoring: true,
        enabledDomains: expect.arrayContaining([
          'Console',
          'Network',
          'Runtime',
          'Debugger'
        ])
      });
      
      // Verify console messages are being captured
      await chrome.evaluate(tabId, 'console.log("Test message")');
      
      await waitForCondition(async () => {
        const messages = await mcp.call('get_console_messages', { tabId });
        return messages.messages.some((m: any) => m.text === 'Test message');
      });
      
      const messages = await mcp.call('get_console_messages', { tabId });
      expect(messages.messages).toContainEqual(
        expect.objectContaining({
          level: 'log',
          text: 'Test message'
        })
      );
    });
    
    test('should handle monitoring non-existent tab', async () => {
      const fakeTabId = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
      
      await expect(
        mcp.call('start_monitoring', { tabId: fakeTabId })
      ).rejects.toThrow(/Tab not found/);
    });
  });
  
  describe('JavaScript Execution', () => {
    let tabId: string;
    
    beforeEach(async () => {
      const tab = await loadFixture(chrome, 'index.html');
      tabId = tab.tabId;
      await mcp.call('start_monitoring', { tabId });
    });
    
    test('should execute JavaScript in tab context', async () => {
      const result = await mcp.call('execute_js', {
        tabId,
        expression: '2 + 2'
      });
      
      expect(result).toMatchObject({
        result: {
          type: 'number',
          value: 4
        }
      });
    });
    
    test('should access DOM elements', async () => {
      const result = await mcp.call('execute_js', {
        tabId,
        expression: 'document.title'
      });
      
      expect(result.result.value).toBe('Chrome Lens Test Page');
    });
    
    test('should handle execution errors', async () => {
      const result = await mcp.call('execute_js', {
        tabId,
        expression: 'nonExistentFunction()'
      });
      
      expect(result).toMatchObject({
        error: expect.objectContaining({
          message: expect.stringContaining('nonExistentFunction is not defined')
        })
      });
    });
    
    test('should support async execution', async () => {
      const result = await mcp.call('execute_js', {
        tabId,
        expression: `
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'async complete';
          })()
        `
      });
      
      expect(result.result.value).toBe('async complete');
    });
  });
  
  describe('Multi-tab Scenarios', () => {
    test('should handle multiple tabs independently', async () => {
      // Create two tabs with different content
      const tab1 = await loadFixture(chrome, 'index.html');
      const tab2 = await loadFixture(chrome, 'errors.html');
      
      // Start monitoring both
      await mcp.call('start_monitoring', { tabId: tab1.tabId });
      await mcp.call('start_monitoring', { tabId: tab2.tabId });
      
      // Execute different code in each
      await mcp.call('execute_js', {
        tabId: tab1.tabId,
        expression: 'console.log("Tab 1 message")'
      });
      
      await mcp.call('execute_js', {
        tabId: tab2.tabId,
        expression: 'console.log("Tab 2 message")'
      });
      
      // Verify messages are separate
      const messages1 = await mcp.call('get_console_messages', {
        tabId: tab1.tabId
      });
      const messages2 = await mcp.call('get_console_messages', {
        tabId: tab2.tabId
      });
      
      expect(messages1.messages).toContainEqual(
        expect.objectContaining({ text: 'Tab 1 message' })
      );
      expect(messages1.messages).not.toContainEqual(
        expect.objectContaining({ text: 'Tab 2 message' })
      );
      
      expect(messages2.messages).toContainEqual(
        expect.objectContaining({ text: 'Tab 2 message' })
      );
      expect(messages2.messages).not.toContainEqual(
        expect.objectContaining({ text: 'Tab 1 message' })
      );
    });
  });
});