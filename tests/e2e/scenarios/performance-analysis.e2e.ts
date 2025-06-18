/**
 * E2E tests for performance analysis features
 */

import { ChromeInstance, launchChrome } from '../utils/chrome-launcher';
import { MCPTestClient, connectMCP } from '../utils/mcp-client';
import { loadFixture, generateTestFixtures } from '../utils/test-helpers';

describe('Performance Analysis E2E', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    // Generate test fixtures
    generateTestFixtures();
    
    // Launch Chrome with debugging enabled
    chrome = await launchChrome({
      headless: process.env.HEADLESS !== 'false',
      port: 9225
    });
    
    // Connect MCP server to Chrome
    mcp = await connectMCP({
      host: 'localhost',
      port: 9225
    });
  }, 30000);
  
  afterAll(async () => {
    await mcp?.disconnect();
    await chrome?.close();
  });
  
  describe('Performance Metrics', () => {
    test('should capture Core Web Vitals', async () => {
      const { tabId } = await loadFixture(chrome, 'performance.html');
      
      // Start monitoring
      await mcp.call('start_monitoring', { tabId });
      
      // Wait for page to load and metrics to be available
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get performance metrics
      const metrics = await mcp.call('get_performance_metrics', {
        tabId,
        includeDetails: true
      });
      
      expect(metrics).toMatchObject({
        metrics: expect.objectContaining({
          // Core Web Vitals
          LCP: expect.any(Number),
          FID: expect.any(Number),
          CLS: expect.any(Number),
          
          // Additional metrics
          TTFB: expect.any(Number),
          FCP: expect.any(Number),
          TTI: expect.any(Number)
        }),
        details: expect.any(Object),
        recommendations: expect.any(Array)
      });
    });
    
    test('should identify performance issues', async () => {
      const { tabId } = await loadFixture(chrome, 'performance.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Wait for slow operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const metrics = await mcp.call('get_performance_metrics', {
        tabId,
        includeDetails: true
      });
      
      // Should have recommendations for slow page
      expect(metrics.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            severity: expect.stringMatching(/high|medium|low/),
            message: expect.any(String)
          })
        ])
      );
    });
  });
  
  describe('Runtime Performance', () => {
    test('should analyze JavaScript execution time', async () => {
      const { tabId } = await loadFixture(chrome, 'performance.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Execute performance-intensive code
      await mcp.call('execute_js', {
        tabId,
        expression: `
          performance.mark('heavy-operation-start');
          let sum = 0;
          for (let i = 0; i < 10000000; i++) {
            sum += Math.sqrt(i);
          }
          performance.mark('heavy-operation-end');
          performance.measure('heavy-operation', 'heavy-operation-start', 'heavy-operation-end');
        `
      });
      
      // Get runtime state
      const state = await mcp.call('analyze_runtime_state', {
        tabId,
        scope: 'global'
      });
      
      expect(state).toMatchObject({
        performance: expect.objectContaining({
          marks: expect.any(Array),
          measures: expect.arrayContaining([
            expect.objectContaining({
              name: 'heavy-operation',
              duration: expect.any(Number)
            })
          ])
        })
      });
    });
    
    test('should detect memory leaks', async () => {
      const { tabId } = await loadFixture(chrome, 'performance.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Create potential memory leak
      await mcp.call('execute_js', {
        tabId,
        expression: `
          window.leakyArray = [];
          for (let i = 0; i < 100000; i++) {
            window.leakyArray.push({
              data: new Array(100).fill('x'.repeat(100)),
              id: i
            });
          }
        `
      });
      
      // Analyze runtime state
      const state = await mcp.call('analyze_runtime_state', {
        tabId,
        scope: 'all'
      });
      
      expect(state.memory).toBeDefined();
      expect(state.memory.usedJSHeapSize).toBeGreaterThan(0);
    });
  });
  
  describe('Performance Debugging Strategy', () => {
    test('should suggest optimization strategy', async () => {
      const { tabId } = await loadFixture(chrome, 'performance.html');
      
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Page is loading slowly and has poor performance scores',
        tabId,
        strategyType: 'exploratory'
      });
      
      expect(strategy).toMatchObject({
        problemCategory: 'performance-issue',
        steps: expect.arrayContaining([
          expect.objectContaining({
            action: expect.stringContaining('performance'),
            tool: expect.stringMatching(/get_performance_metrics|analyze_runtime_state/)
          })
        ]),
        alternativeStrategies: expect.arrayContaining([
          expect.stringContaining('Performance tab'),
          expect.stringContaining('code splitting'),
          expect.stringContaining('asset loading')
        ])
      });
    });
  });
});