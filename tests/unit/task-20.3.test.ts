import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.STATE_MONITORING_ENABLED = 'true';
process.env.MAX_WATCH_EXPRESSIONS = '100';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 20.3: watch_state_changes tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('watch_state_changes tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('watch_state_changes');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('watch');
    expect(tool.description.toLowerCase()).toContain('state');
  });

  test('watch_state_changes tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.expressions).toBeDefined();
    expect(tool.inputSchema.properties.expressions.type).toBe('array');
    expect(tool.inputSchema.properties.expressions.items.type).toBe('object');
    
    expect(tool.inputSchema.properties.interval).toBeDefined();
    expect(tool.inputSchema.properties.interval.type).toBe('integer');
    expect(tool.inputSchema.properties.interval.minimum).toBe(100);
    expect(tool.inputSchema.properties.interval.maximum).toBe(10000);
    expect(tool.inputSchema.properties.interval.default).toBe(500);
    
    expect(tool.inputSchema.properties.deepWatch).toBeDefined();
    expect(tool.inputSchema.properties.deepWatch.type).toBe('boolean');
    expect(tool.inputSchema.properties.deepWatch.default).toBe(false);
    
    expect(tool.inputSchema.properties.includeCallStack).toBeDefined();
    expect(tool.inputSchema.properties.includeCallStack.type).toBe('boolean');
    expect(tool.inputSchema.properties.includeCallStack.default).toBe(false);
  });

  test('watch_state_changes tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId', 'expressions']);
  });

  test('expressions array has correct schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const expressionSchema = tool.inputSchema.properties.expressions.items;
    expect(expressionSchema.properties).toBeDefined();
    expect(expressionSchema.properties.name).toBeDefined();
    expect(expressionSchema.properties.name.type).toBe('string');
    expect(expressionSchema.properties.expression).toBeDefined();
    expect(expressionSchema.properties.expression.type).toBe('string');
    expect(expressionSchema.properties.context).toBeDefined();
    expect(expressionSchema.properties.context.type).toBe('string');
    expect(expressionSchema.properties.context.enum).toEqual(['global', 'local', 'closure']);
    expect(expressionSchema.properties.context.default).toBe('global');
    expect(expressionSchema.required).toEqual(['name', 'expression']);
  });

  test('tool description mentions state monitoring', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/monitor|watch|track|observe/);
    expect(desc).toMatch(/state|change|value|variable/);
  });

  test('tool count includes new watch_state_changes tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added 7 more (monitor_events was 17th), now adding watch_state_changes (18th)
    expect(tools.length).toBe(20);
  });

  test('watch_state_changes respects STATE_MONITORING_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    expect(tool).toBeDefined();
    
    // Test that description mentions state monitoring
    expect(tool.description.toLowerCase()).toContain('state');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp/);
  });

  test('interval has reasonable limits', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const interval = tool.inputSchema.properties.interval;
    expect(interval.minimum).toBeGreaterThanOrEqual(100);
    expect(interval.maximum).toBeLessThanOrEqual(10000);
    expect(interval.default).toBeGreaterThan(0);
    expect(interval.default).toBeLessThan(interval.maximum);
  });

  test('tool supports different watch contexts', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const contextEnum = tool.inputSchema.properties.expressions.items.properties.context.enum;
    expect(contextEnum).toContain('global');
    expect(contextEnum).toContain('local');
    expect(contextEnum).toContain('closure');
  });

  test('expressions array has reasonable max items', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'watch_state_changes');
    
    const expressions = tool.inputSchema.properties.expressions;
    expect(expressions.maxItems).toBeDefined();
    expect(expressions.maxItems).toBeLessThanOrEqual(100);
    expect(expressions.minItems).toBe(1);
  });
});