import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import ChromeDevToolsMCPServer from '../../server';

describe('Task 10.1: execute_js Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes execute_js tool', async () => {
    const tools = await server.listTools();
    
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    expect(executeJSTool).toBeDefined();
    expect(executeJSTool.name).toBe('execute_js');
    expect(executeJSTool.description).toBeDefined();
    expect(typeof executeJSTool.description).toBe('string');
  });

  test('execute_js tool has correct schema', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool).toBeDefined();
    expect(executeJSTool.inputSchema).toBeDefined();
    expect(executeJSTool.inputSchema.type).toBe('object');
    expect(executeJSTool.inputSchema.properties).toBeDefined();
    
    // Should have required tabId and expression parameters
    expect(executeJSTool.inputSchema.properties.tabId).toBeDefined();
    expect(executeJSTool.inputSchema.properties.expression).toBeDefined();
    expect(executeJSTool.inputSchema.required).toContain('tabId');
    expect(executeJSTool.inputSchema.required).toContain('expression');
  });

  test('execute_js tool tabId parameter has correct type and validation', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool.inputSchema.properties.tabId.type).toBe('string');
    expect(executeJSTool.inputSchema.properties.tabId.description).toBeDefined();
    expect(executeJSTool.inputSchema.properties.tabId.description).toContain('tab');
    
    // Should have pattern for tab ID validation
    expect(executeJSTool.inputSchema.properties.tabId.pattern).toBeDefined();
    expect(executeJSTool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
  });

  test('execute_js tool expression parameter has correct type', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool.inputSchema.properties.expression.type).toBe('string');
    expect(executeJSTool.inputSchema.properties.expression.description).toBeDefined();
    expect(executeJSTool.inputSchema.properties.expression.description.toLowerCase()).toMatch(/javascript|typescript|js|ts|expression|code/);
  });

  test('execute_js tool has optional timeout parameter', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    // Should include optional timeout parameter
    expect(executeJSTool.inputSchema.properties.timeout).toBeDefined();
    expect(executeJSTool.inputSchema.properties.timeout.type).toBe('integer');
    expect(executeJSTool.inputSchema.properties.timeout.description).toBeDefined();
    
    // Should have reasonable default and bounds
    expect(executeJSTool.inputSchema.properties.timeout.default).toBeDefined();
    expect(executeJSTool.inputSchema.properties.timeout.minimum).toBe(100);
    expect(executeJSTool.inputSchema.properties.timeout.maximum).toBeDefined();
    
    // Timeout should not be required
    expect(executeJSTool.inputSchema.required).toEqual(['tabId', 'expression']);
  });

  test('execute_js tool has optional includeCommandLineAPI parameter', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    // Should include optional flag for command line API access
    expect(executeJSTool.inputSchema.properties.includeCommandLineAPI).toBeDefined();
    expect(executeJSTool.inputSchema.properties.includeCommandLineAPI.type).toBe('boolean');
    expect(executeJSTool.inputSchema.properties.includeCommandLineAPI.description).toBeDefined();
    expect(executeJSTool.inputSchema.properties.includeCommandLineAPI.default).toBe(false);
    
    // Should not be required
    expect(executeJSTool.inputSchema.required).toEqual(['tabId', 'expression']);
  });

  test('execute_js tool has proper metadata', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool.description).toContain('JavaScript');
    expect(executeJSTool.description.toLowerCase()).toMatch(/javascript|typescript|execute|eval|run/);
    
    // Should describe JavaScript/TypeScript execution functionality
    expect(executeJSTool.description.toLowerCase()).toMatch(/execute.*javascript|run.*javascript|javascript.*expression/);
  });

  test('six or more tools exist now (connect_to_chrome, list_tabs, start_monitoring, get_console_messages, get_network_activity, execute_js)', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(6);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
    expect(toolNames).toContain('get_console_messages');
    expect(toolNames).toContain('get_network_activity');
    expect(toolNames).toContain('execute_js');
  });

  test('execute_js tool schema has all expected properties', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const expectedProperties = ['tabId', 'expression', 'timeout', 'includeCommandLineAPI'];
    
    for (const prop of expectedProperties) {
      expect(executeJSTool.inputSchema.properties[prop]).toBeDefined();
    }
    
    // Only tabId and expression should be required
    expect(executeJSTool.inputSchema.required).toEqual(['tabId', 'expression']);
  });

  test('execute_js tool parameter types are correct', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool.inputSchema.properties.tabId.type).toBe('string');
    expect(executeJSTool.inputSchema.properties.expression.type).toBe('string');
    expect(executeJSTool.inputSchema.properties.timeout.type).toBe('integer');
    expect(executeJSTool.inputSchema.properties.includeCommandLineAPI.type).toBe('boolean');
  });

  test('execute_js tool has reasonable timeout limits and defaults', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const timeoutParam = executeJSTool.inputSchema.properties.timeout;
    expect(timeoutParam.minimum).toBe(100);
    expect(timeoutParam.maximum).toBeGreaterThan(1000);
    expect(timeoutParam.default).toBeGreaterThan(100);
    expect(timeoutParam.default).toBeLessThanOrEqual(timeoutParam.maximum);
  });

  test('execute_js tool mentions JavaScript and TypeScript in description', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const description = executeJSTool.description.toLowerCase();
    
    // Should mention JavaScript execution
    expect(description).toMatch(/javascript|js/);
    
    // Should mention execution capabilities
    expect(description).toMatch(/execute|eval|run/);
    
    // Should mention context
    expect(description).toMatch(/tab|context|page/);
  });

  test('execute_js tool expression parameter describes code execution', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const expressionDesc = executeJSTool.inputSchema.properties.expression.description.toLowerCase();
    
    // Should describe what the expression parameter is for
    expect(expressionDesc).toMatch(/javascript|js|code|expression|statement/);
    expect(expressionDesc).toMatch(/execute|eval|run/);
  });

  test('execute_js tool timeout parameter describes execution timeout', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const timeoutDesc = executeJSTool.inputSchema.properties.timeout.description.toLowerCase();
    
    // Should describe timeout functionality
    expect(timeoutDesc).toMatch(/timeout|time|millisecond|execution/);
  });

  test('execute_js tool includeCommandLineAPI parameter describes API access', async () => {
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    const apiDesc = executeJSTool.inputSchema.properties.includeCommandLineAPI.description.toLowerCase();
    
    // Should describe command line API access
    expect(apiDesc).toMatch(/command.*line.*api|console.*api|devtools.*api|api/);
  });
});