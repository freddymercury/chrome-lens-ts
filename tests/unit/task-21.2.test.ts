import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.PROBLEM_ANALYSIS_DEPTH = '3';
process.env.STRATEGY_AI_ENABLED = 'true';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 21.2: Implement Problem Analysis Engine', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  describe('Problem Analysis Implementation', () => {
    it('should successfully call suggest_debugging_strategy with valid parameters', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Application crashes when clicking submit button'
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('confidence');
    });

    it('should generate appropriate strategy for runtime errors', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Uncaught TypeError: Cannot read property of undefined',
        strategyType: 'targeted'
      });

      expect(result.strategy).toContain('null-reference');
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toHaveProperty('action');
      expect(result.steps[0]).toHaveProperty('tool');
      expect(result.steps[0]).toHaveProperty('description');
    });

    it('should generate exploratory strategy for vague problems', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Something is wrong with the page',
        strategyType: 'exploratory'
      });

      expect(result.strategy).toContain('exploratory');
      expect(result.steps.length).toBeGreaterThan(2);
      // Should suggest multiple diagnostic tools
      const tools = result.steps.map((s: any) => s.tool);
      expect(tools).toContain('get_console_messages');
      expect(tools).toContain('analyze_errors');
    });

    it('should respect maxSteps parameter', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Complex performance issue',
        maxSteps: 3
      });

      expect(result.steps.length).toBeLessThanOrEqual(3);
    });

    it('should provide higher confidence for well-defined problems', async () => {
      const vagueResult = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Something is slow'
      });

      const specificResult = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'API call to /users endpoint takes 5 seconds to complete'
      });

      expect(specificResult.confidence).toBeGreaterThan(vagueResult.confidence);
    });
  });

  describe('Error Pattern Recognition', () => {
    it('should recognize common JavaScript error patterns', async () => {
      const patterns = [
        { desc: 'TypeError: Cannot read property of undefined', category: 'null-reference' },
        { desc: 'ReferenceError: x is not defined', category: 'undefined-variable' },
        { desc: 'SyntaxError: Unexpected token', category: 'syntax-error' },
        { desc: 'Network request failed with 404', category: 'network-error' }
      ];

      for (const pattern of patterns) {
        const result = await server.callTool('suggest_debugging_strategy', {
          problemDescription: pattern.desc
        });

        expect(result.problemCategory).toBe(pattern.category);
        expect(result.strategy).toContain(pattern.category);
      }
    });

    it('should suggest appropriate tools based on problem type', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Memory leak causing browser to slow down'
      });

      const tools = result.steps.map((s: any) => s.tool);
      expect(tools).toContain('analyze_runtime_state');
      expect(tools).toContain('get_performance_metrics');
    });
  });

  describe('Strategy Customization', () => {
    it('should provide step-by-step strategy when requested', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Form validation not working',
        strategyType: 'step-by-step'
      });

      expect(result.strategy).toContain('step-by-step');
      // Each step should depend on previous step
      for (let i = 1; i < result.steps.length; i++) {
        expect(result.steps[i]).toHaveProperty('dependsOn');
      }
    });

    it('should filter strategies by confidence threshold', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Vague issue with UI',
        confidence: 0.8
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.alternativeStrategies).toBeDefined();
    });
  });

  describe('Tab Context Integration', () => {
    it('should use tab context when provided', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Page not loading correctly',
        tabId: 'AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB'
      });

      expect(result.contextUsed).toBe(true);
      expect(result.steps[0]).toHaveProperty('parameters');
      expect(result.steps[0].parameters.tabId).toBe('AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB');
    });
  });

  describe('Environment Variable Support', () => {
    it('should respect PROBLEM_ANALYSIS_DEPTH setting', async () => {
      const result = await server.callTool('suggest_debugging_strategy', {
        problemDescription: 'Deep nested object error'
      });

      expect(result.analysisDepth).toBe(3);
    });
  });
});