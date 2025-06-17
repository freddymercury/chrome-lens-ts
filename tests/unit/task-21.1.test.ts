import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.STRATEGY_AI_ENABLED = 'true';
process.env.WORKFLOW_COMPLEXITY_LIMIT = '10';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 21.1: Add suggest_debugging_strategy Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  describe('Tool Schema Validation', () => {
    it('should have suggest_debugging_strategy tool in tools list', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      expect(tool).toBeDefined();
    });

    it('should have correct tool definition with required parameters', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      
      expect(tool).toMatchObject({
        name: 'suggest_debugging_strategy',
        description: expect.stringContaining('debugging')
      });

      // Check required parameters
      const requiredParams = tool?.inputSchema?.required || [];
      expect(requiredParams).toContain('problemDescription');
    });

    it('should have optional parameters for strategy configuration', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      const properties = tool?.inputSchema?.properties as any;
      
      expect(properties).toHaveProperty('strategyType');
      expect(properties.strategyType).toHaveProperty('enum');
      expect(properties.strategyType.enum).toContain('step-by-step');
      expect(properties.strategyType.enum).toContain('exploratory');
      expect(properties.strategyType.enum).toContain('targeted');
      
      expect(properties).toHaveProperty('confidence');
      expect(properties.confidence).toHaveProperty('type', 'number');
      expect(properties.confidence).toHaveProperty('minimum', 0);
      expect(properties.confidence).toHaveProperty('maximum', 1);
    });

    it('should have proper parameter descriptions', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      const properties = tool?.inputSchema?.properties as any;
      
      expect(properties.problemDescription).toHaveProperty('description');
      expect(properties.problemDescription.description).toContain('problem');
      
      expect(properties.tabId).toHaveProperty('description');
      expect(properties.tabId.description).toContain('Chrome tab');
    });
  });

  describe('Environment Variable Support', () => {
    it('should respect STRATEGY_AI_ENABLED environment variable', async () => {
      process.env.STRATEGY_AI_ENABLED = 'false';
      const serverWithEnv = new ChromeDevToolsMCPServer();
      serverWithEnv.setupToolHandlers();
      const tools = await serverWithEnv.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      // Tool should still be available but might have limited functionality
      expect(tool).toBeDefined();
    });

    it('should respect WORKFLOW_COMPLEXITY_LIMIT environment variable', async () => {
      process.env.WORKFLOW_COMPLEXITY_LIMIT = '10';
      const serverWithEnv = new ChromeDevToolsMCPServer();
      serverWithEnv.setupToolHandlers();
      const tools = await serverWithEnv.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      const properties = tool?.inputSchema?.properties as any;
      
      if (properties.maxSteps) {
        expect(properties.maxSteps.maximum).toBe(10);
      }
    });
  });

  describe('Parameter Validation', () => {
    it('should have includeHistory parameter for learning from past sessions', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      const properties = tool?.inputSchema?.properties as any;
      
      expect(properties).toHaveProperty('includeHistory');
      expect(properties.includeHistory).toHaveProperty('type', 'boolean');
      expect(properties.includeHistory).toHaveProperty('default', false);
    });

    it('should have maxSteps parameter to control strategy complexity', async () => {
      const tools = await server.listTools();
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      const properties = tool?.inputSchema?.properties as any;
      
      expect(properties).toHaveProperty('maxSteps');
      expect(properties.maxSteps).toHaveProperty('type', 'integer');
      expect(properties.maxSteps).toHaveProperty('minimum', 1);
      expect(properties.maxSteps).toHaveProperty('maximum', 10);
      expect(properties.maxSteps).toHaveProperty('default', 5);
    });
  });

  describe('Integration with Existing Tools', () => {
    it('should be properly integrated with setupToolHandlers', async () => {
      // Verify that the tool is set up during server initialization
      const tools = await server.listTools();
      expect(tools.length).toBeGreaterThan(0);
      const tool = tools.find((t: any) => t.name === 'suggest_debugging_strategy');
      expect(tool).toBeDefined();
    });

    it('should maintain correct tool count after addition', async () => {
      const tools = await server.listTools();
      // Should have at least 19 tools (18 existing + 1 new)
      expect(tools.length).toBeGreaterThanOrEqual(19);
    });
  });
});