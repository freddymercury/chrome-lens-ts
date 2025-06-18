import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import ChromeDevToolsMCPServer from '../../server.js';

describe('Chrome Lens v1.2 Integration', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
  });
  
  afterEach(() => {
    // Clean up the cleanup interval to prevent hanging tests
    const cleanupInterval = (server as any).cleanupInterval;
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });

  test('should include suggest_debugging_strategy in available tools', async () => {
    const tools = await server.listTools();
    
    // Should have 20 tools now (19 + get_version)
    expect(tools.length).toBe(20);
    
    // Find the suggest_debugging_strategy tool
    const strategyTool = tools.find(t => t.name === 'suggest_debugging_strategy');
    expect(strategyTool).toBeDefined();
    expect(strategyTool!.description).toContain('AI-driven debugging workflow');
    
    // Verify tool schema
    expect(strategyTool!.inputSchema.type).toBe('object');
    expect(strategyTool!.inputSchema.required).toContain('problemDescription');
    expect(strategyTool!.inputSchema.properties.problemDescription).toBeDefined();
    expect(strategyTool!.inputSchema.properties.strategyType).toBeDefined();
    expect(strategyTool!.inputSchema.properties.confidence).toBeDefined();
  });

  test('should handle suggest_debugging_strategy tool call', async () => {
    const parameters = {
      problemDescription: 'TypeError: Cannot read property "name" of undefined'
    };

    const response = await server.callTool('suggest_debugging_strategy', parameters);

    expect(response.success).toBe(true);
    expect(response.strategies).toBeDefined();
    expect(response.strategies.length).toBeGreaterThan(0);
    expect(response.problemCategory).toBeDefined();
    expect(response.problemCategory.type).toBe('runtime-error');
    expect(response.problemCategory.subtype).toBe('null-reference');
  });

  test('should integrate with state management', async () => {
    // Connect to a tab first
    const connectResult = await server.callTool('connect_to_chrome', {
      host: 'localhost',
      port: 9222
    });

    // If connection fails (likely in test environment), skip this test
    if (!connectResult.connected) {
      console.log('Skipping integration test - Chrome not available');
      return;
    }

    const tabId = connectResult.tabs?.[0]?.id;
    if (!tabId) {
      console.log('No tabs available for testing');
      return;
    }

    // Call strategy tool with tabId
    const response = await server.callTool('suggest_debugging_strategy', {
      problemDescription: 'Page loading slowly',
      tabId,
      includeHistory: true
    });

    expect(response.success).toBe(true);
    expect(response.metadata?.contextUsed).toContain('tab-metrics');
  });

  test('should validate tool parameters', async () => {
    // Test with invalid parameters
    const invalidCalls = [
      { problemDescription: '' }, // Empty description
      { problemDescription: 'Test', confidence: 2 }, // Invalid confidence
      { problemDescription: 'Test', maxSteps: 20 } // Too many steps
    ];

    for (const params of invalidCalls) {
      const response = await server.callTool('suggest_debugging_strategy', params);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error.type).toBe('INVALID_REQUEST');
    }
  });

  test('should provide contextual strategies based on problem type', async () => {
    const testCases = [
      {
        problem: 'CORS error when calling API',
        expectedType: 'network',
        expectedSubtype: 'cors'
      },
      {
        problem: 'Memory usage keeps increasing',
        expectedType: 'performance',
        expectedSubtype: 'memory-leak'
      },
      {
        problem: 'Content Security Policy violation',
        expectedType: 'security',
        expectedSubtype: 'csp-violation'
      }
    ];

    for (const testCase of testCases) {
      const response = await server.callTool('suggest_debugging_strategy', {
        problemDescription: testCase.problem
      });

      expect(response.success).toBe(true);
      expect(response.problemCategory.type).toBe(testCase.expectedType);
      expect(response.problemCategory.subtype).toBe(testCase.expectedSubtype);
      
      // Verify strategy is appropriate for problem type
      const strategy = response.strategies[0];
      expect(strategy.problemCategory.type).toBe(testCase.expectedType);
    }
  });

  test('state manager is properly initialized', async () => {
    // Access state manager through server
    const stateManager = (server as any).stateManager;
    
    // State manager should be initialized
    expect(stateManager).toBeDefined();
    expect(stateManager.getState()).toBeDefined();
    expect(stateManager.getState().tabs).toBeDefined();
    expect(stateManager.getState().sessions).toBeDefined();
    
    // Global metrics should be initialized
    const metrics = stateManager.getGlobalMetrics();
    expect(metrics.totalEvents).toBeDefined();
    expect(metrics.errors).toBe(0);
    expect(metrics.startTime).toBeGreaterThan(0);
  });

  test('maintains backward compatibility with existing tools', async () => {
    // Verify existing tools still work
    const tools = await server.listTools();
    const existingTools = [
      'connect_to_chrome',
      'list_tabs',
      'start_monitoring',
      'get_console_messages',
      'get_network_activity',
      'execute_js',
      'security_audit',
      'check_vulnerabilities',
      'get_performance_metrics',
      'list_source_files',
      'modify_source_code',
      'manage_breakpoints',
      'debug_step_control',
      'inspect_variables',
      'analyze_runtime_state',
      'analyze_errors',
      'monitor_events',
      'watch_state_changes'
    ];

    for (const toolName of existingTools) {
      const tool = tools.find(t => t.name === toolName);
      expect(tool).toBeDefined();
    }

    // Total should be 20 tools
    expect(tools.length).toBe(20);
  });
});