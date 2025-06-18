/**
 * E2E tests for error debugging features
 */

import { ChromeInstance, launchChrome } from '../utils/chrome-launcher';
import { MCPTestClient, connectMCP } from '../utils/mcp-client';
import { loadFixture, generateTestFixtures } from '../utils/test-helpers';

describe('Error Debugging E2E', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    // Generate test fixtures
    generateTestFixtures();
    
    // Launch Chrome with debugging enabled
    chrome = await launchChrome({
      headless: process.env.HEADLESS !== 'false',
      port: 9223
    });
    
    // Connect MCP server to Chrome
    mcp = await connectMCP({
      host: 'localhost',
      port: 9223
    });
  }, 30000);
  
  afterAll(async () => {
    await mcp?.disconnect();
    await chrome?.close();
  });
  
  describe('Console Error Capture', () => {
    test('should capture JavaScript errors', async () => {
      // Load page with errors
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      // Start monitoring
      await mcp.call('start_monitoring', { tabId });
      
      // Wait for errors to be captured
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get console messages
      const messages = await mcp.call('get_console_messages', {
        tabId,
        level: 'error'
      });
      
      expect(messages.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'error',
            text: expect.stringContaining('Test error message')
          })
        ])
      );
    });
    
    test('should capture runtime errors with stack traces', async () => {
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Analyze errors
      const errors = await mcp.call('analyze_errors', {
        tabId,
        errorType: 'runtime'
      });
      
      expect(errors).toMatchObject({
        errors: expect.arrayContaining([
          expect.objectContaining({
            type: 'runtime',
            message: expect.stringContaining('nonExistentFunction'),
            stack: expect.any(String)
          })
        ])
      });
    });
  });
  
  describe('Error Analysis', () => {
    test('should analyze errors with context', async () => {
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      const analysis = await mcp.call('analyze_errors', {
        tabId,
        includeSourceContext: true,
        includeStackTrace: true
      });
      
      expect(analysis).toMatchObject({
        errors: expect.any(Array),
        summary: expect.objectContaining({
          totalErrors: expect.any(Number),
          errorTypes: expect.any(Object)
        })
      });
    });
  });
  
  describe('Debugging Strategy', () => {
    test('should suggest debugging strategy for runtime errors', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'TypeError: Cannot read property of undefined',
        strategyType: 'step-by-step'
      });
      
      expect(strategy).toMatchObject({
        strategy: expect.stringContaining('debugging strategy'),
        problemCategory: 'null-reference',
        steps: expect.arrayContaining([
          expect.objectContaining({
            action: expect.any(String),
            tool: expect.any(String)
          })
        ]),
        confidence: expect.any(Number)
      });
    });
    
    test('should provide targeted strategy for specific errors', async () => {
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'ReferenceError: nonExistentFunction is not defined at errors.html:10',
        tabId,
        strategyType: 'targeted'
      });
      
      expect(strategy.problemCategory).toBe('undefined-variable');
      expect(strategy.steps.length).toBeGreaterThan(0);
      expect(strategy.contextUsed).toBe(true);
    });
  });
});