/**
 * E2E tests for network monitoring features
 */

import { ChromeInstance, launchChrome } from '../utils/chrome-launcher';
import { MCPTestClient, connectMCP } from '../utils/mcp-client';
import { loadFixture, generateTestFixtures } from '../utils/test-helpers';

describe('Network Monitoring E2E', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    // Generate test fixtures
    generateTestFixtures();
    
    // Launch Chrome with debugging enabled
    chrome = await launchChrome({
      headless: process.env.HEADLESS !== 'false',
      port: 9224
    });
    
    // Connect MCP server to Chrome
    mcp = await connectMCP({
      host: 'localhost',
      port: 9224
    });
  }, 30000);
  
  afterAll(async () => {
    await mcp?.disconnect();
    await chrome?.close();
  });
  
  describe('Network Request Capture', () => {
    test('should capture HTTP requests', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      // Start monitoring
      await mcp.call('start_monitoring', { tabId });
      
      // Wait for network activity
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get network activity
      const activity = await mcp.call('get_network_activity', {
        tabId,
        type: 'request'
      });
      
      expect(activity.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('/api/test'),
            method: 'GET'
          })
        ])
      );
    });
    
    test('should capture failed requests', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Wait for network activity
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const activity = await mcp.call('get_network_activity', {
        tabId,
        type: 'response'
      });
      
      // Should have failed requests (404)
      const failedRequests = activity.responses?.filter(
        (r: any) => r.status >= 400
      ) || [];
      
      expect(failedRequests.length).toBeGreaterThan(0);
    });
  });
  
  describe('Network Filtering', () => {
    test('should filter by HTTP method', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Execute POST request
      await mcp.call('execute_js', {
        tabId,
        expression: `
          fetch('/api/test', { 
            method: 'POST', 
            body: JSON.stringify({ test: true }) 
          })
        `
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const activity = await mcp.call('get_network_activity', {
        tabId,
        method: 'POST'
      });
      
      expect(activity.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST'
          })
        ])
      );
    });
    
    test('should limit number of results', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await mcp.call('execute_js', {
          tabId,
          expression: `fetch('/api/test?q=${i}')`
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const activity = await mcp.call('get_network_activity', {
        tabId,
        limit: 3
      });
      
      expect(activity.requests?.length).toBeLessThanOrEqual(3);
    });
  });
  
  describe('Request Details', () => {
    test('should include request headers', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Make request with custom headers
      await mcp.call('execute_js', {
        tabId,
        expression: `
          fetch('/api/test', {
            headers: {
              'X-Custom-Header': 'test-value',
              'Authorization': 'Bearer token123'
            }
          })
        `
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const activity = await mcp.call('get_network_activity', {
        tabId,
        limit: 1
      });
      
      const request = activity.requests?.[0];
      expect(request).toBeDefined();
      expect(request.headers).toMatchObject({
        'X-Custom-Header': 'test-value'
      });
    });
  });
});