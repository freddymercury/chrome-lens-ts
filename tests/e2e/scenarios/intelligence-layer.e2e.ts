/**
 * E2E tests for intelligence layer features
 */

import { ChromeInstance, launchChrome } from '../utils/chrome-launcher';
import { MCPTestClient, connectMCP } from '../utils/mcp-client';
import { loadFixture, generateTestFixtures } from '../utils/test-helpers';

describe('Intelligence Layer E2E', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    // Generate test fixtures
    generateTestFixtures();
    
    // Launch Chrome with debugging enabled
    chrome = await launchChrome({
      headless: process.env.HEADLESS !== 'false',
      port: 9226
    });
    
    // Connect MCP server to Chrome
    mcp = await connectMCP({
      host: 'localhost',
      port: 9226
    });
  }, 30000);
  
  afterAll(async () => {
    await mcp?.disconnect();
    await chrome?.close();
  });
  
  describe('Problem Categorization', () => {
    test('should categorize different types of errors', async () => {
      const testCases = [
        {
          description: 'TypeError: Cannot read property "name" of undefined',
          expectedCategory: 'null-reference'
        },
        {
          description: 'ReferenceError: myFunction is not defined',
          expectedCategory: 'undefined-variable'
        },
        {
          description: 'SyntaxError: Unexpected token }',
          expectedCategory: 'syntax-error'
        },
        {
          description: 'Failed to fetch API endpoint /api/users - 404 Not Found',
          expectedCategory: 'network-error'
        },
        {
          description: 'Page is loading very slowly with high memory usage',
          expectedCategory: 'performance-issue'
        },
        {
          description: 'Button click handler not working on form submit',
          expectedCategory: 'ui-interaction'
        },
        {
          description: 'Application crashes when loading large dataset',
          expectedCategory: 'application-crash'
        }
      ];
      
      for (const testCase of testCases) {
        const strategy = await mcp.call('suggest_debugging_strategy', {
          problemDescription: testCase.description
        });
        
        expect(strategy.problemCategory).toBe(testCase.expectedCategory);
      }
    });
  });
  
  describe('Strategy Generation', () => {
    test('should generate step-by-step strategy', async () => {
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Getting undefined errors when clicking buttons',
        tabId,
        strategyType: 'step-by-step',
        maxSteps: 5
      });
      
      expect(strategy).toMatchObject({
        strategy: expect.stringContaining('step-by-step'),
        steps: expect.any(Array),
        confidence: expect.any(Number)
      });
      
      // Verify steps have dependencies
      const stepsWithDependencies = strategy.steps.filter(
        (s: any) => s.dependsOn !== undefined
      );
      expect(stepsWithDependencies.length).toBeGreaterThan(0);
      
      // Verify steps don't exceed maxSteps
      expect(strategy.steps.length).toBeLessThanOrEqual(5);
    });
    
    test('should generate exploratory strategy', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Something is wrong with the application',
        strategyType: 'exploratory'
      });
      
      expect(strategy.strategy).toContain('exploratory');
      
      // Should start with broad information gathering
      expect(strategy.steps[0]).toMatchObject({
        action: expect.stringContaining('console messages'),
        tool: 'get_console_messages'
      });
      
      // Should include various monitoring tools
      const tools = strategy.steps.map((s: any) => s.tool);
      expect(tools).toEqual(
        expect.arrayContaining([
          'get_console_messages',
          'analyze_errors',
          'get_network_activity'
        ])
      );
    });
    
    test('should generate targeted strategy', async () => {
      const { tabId } = await loadFixture(chrome, 'network.html');
      
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'API call to /api/users returns 404',
        tabId,
        strategyType: 'targeted'
      });
      
      expect(strategy.strategy).toContain('targeted');
      expect(strategy.problemCategory).toBe('network-error');
      
      // Should focus on network-specific tools
      expect(strategy.steps[0]).toMatchObject({
        tool: 'get_network_activity'
      });
    });
  });
  
  describe('Confidence Scoring', () => {
    test('should have high confidence for specific errors', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'TypeError: Cannot read property "length" of undefined at app.js:42:15'
      });
      
      expect(strategy.confidence).toBeGreaterThan(0.7);
    });
    
    test('should have lower confidence for vague descriptions', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'something is wrong'
      });
      
      expect(strategy.confidence).toBeLessThan(0.5);
    });
    
    test('should respect minimum confidence threshold', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'error occurs sometimes',
        confidence: 0.8
      });
      
      // Should use requested confidence even if calculated is lower
      expect(strategy.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });
  
  describe('Context-Aware Strategies', () => {
    test('should use tab context when provided', async () => {
      const { tabId } = await loadFixture(chrome, 'errors.html');
      
      await mcp.call('start_monitoring', { tabId });
      
      // Generate some errors
      await mcp.call('execute_js', {
        tabId,
        expression: 'console.error("Custom error for testing")'
      });
      
      const strategyWithContext = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Errors appearing in console',
        tabId
      });
      
      const strategyWithoutContext = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Errors appearing in console'
      });
      
      expect(strategyWithContext.contextUsed).toBe(true);
      expect(strategyWithoutContext.contextUsed).toBe(false);
      
      // Context-aware strategy should have tab-specific parameters
      const tabSpecificSteps = strategyWithContext.steps.filter(
        (s: any) => s.parameters?.tabId === tabId
      );
      expect(tabSpecificSteps.length).toBeGreaterThan(0);
    });
  });
  
  describe('Alternative Strategies', () => {
    test('should provide alternative approaches', async () => {
      const strategy = await mcp.call('suggest_debugging_strategy', {
        problemDescription: 'Performance issues with large data rendering'
      });
      
      expect(strategy.alternativeStrategies).toBeDefined();
      expect(strategy.alternativeStrategies.length).toBeGreaterThan(0);
      
      // Should suggest relevant alternatives
      expect(strategy.alternativeStrategies).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Profile'),
          expect.stringContaining('code splitting'),
          expect.stringContaining('optimize')
        ])
      );
    });
  });
});