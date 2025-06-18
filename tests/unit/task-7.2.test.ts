import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import ChromeDevToolsMCPServer from '../../server';

describe('Task 7.2: get_console_messages Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes get_console_messages tool', async () => {
    const tools = await server.listTools();
    
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    expect(getConsoleMessagesTool).toBeDefined();
    expect(getConsoleMessagesTool.name).toBe('get_console_messages');
    expect(getConsoleMessagesTool.description).toBeDefined();
    expect(typeof getConsoleMessagesTool.description).toBe('string');
  });

  test('get_console_messages tool has correct schema', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    expect(getConsoleMessagesTool).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.type).toBe('object');
    expect(getConsoleMessagesTool.inputSchema.properties).toBeDefined();
    
    // Should have required tabId parameter
    expect(getConsoleMessagesTool.inputSchema.properties.tabId).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.required).toContain('tabId');
  });

  test('get_console_messages tool tabId parameter has correct type and validation', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.type).toBe('string');
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.description).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.description).toContain('tab');
    
    // Should have pattern for tab ID validation
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.pattern).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
  });

  test('get_console_messages tool has optional limit parameter', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    // Should include optional limit parameter
    expect(getConsoleMessagesTool.inputSchema.properties.limit).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.limit.type).toBe('integer');
    expect(getConsoleMessagesTool.inputSchema.properties.limit.description).toBeDefined();
    
    // Should have reasonable default and bounds
    expect(getConsoleMessagesTool.inputSchema.properties.limit.default).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.limit.minimum).toBe(1);
    expect(getConsoleMessagesTool.inputSchema.properties.limit.maximum).toBeDefined();
    
    // Limit should not be required (only tabId is required)
    expect(getConsoleMessagesTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_console_messages tool has optional level parameter', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    // Should include optional level filter parameter
    expect(getConsoleMessagesTool.inputSchema.properties.level).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.level.type).toBe('string');
    expect(getConsoleMessagesTool.inputSchema.properties.level.description).toBeDefined();
    
    // Should have enum values for console levels
    expect(getConsoleMessagesTool.inputSchema.properties.level.enum).toBeDefined();
    expect(getConsoleMessagesTool.inputSchema.properties.level.enum).toContain('log');
    expect(getConsoleMessagesTool.inputSchema.properties.level.enum).toContain('warn');
    expect(getConsoleMessagesTool.inputSchema.properties.level.enum).toContain('error');
    expect(getConsoleMessagesTool.inputSchema.properties.level.enum).toContain('info');
    
    // Level should not be required
    expect(getConsoleMessagesTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_console_messages tool has proper metadata', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    expect(getConsoleMessagesTool.description).toContain('console');
    expect(getConsoleMessagesTool.description.toLowerCase()).toMatch(/console|message|retrieve|get/);
    
    // Should describe console message retrieval functionality
    expect(getConsoleMessagesTool.description.toLowerCase()).toMatch(/retrieve.*console|get.*console|console.*message/);
  });

  test('get_console_messages tool exists with other tools', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
    expect(toolNames).toContain('get_console_messages');
  });

  test('get_console_messages tool schema has all expected properties', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    const expectedProperties = ['tabId', 'limit', 'level'];
    
    for (const prop of expectedProperties) {
      expect(getConsoleMessagesTool.inputSchema.properties[prop]).toBeDefined();
    }
    
    // Only tabId should be required
    expect(getConsoleMessagesTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_console_messages tool parameter types are correct', async () => {
    const tools = await server.listTools();
    const getConsoleMessagesTool = tools.find(tool => tool.name === 'get_console_messages');
    
    expect(getConsoleMessagesTool.inputSchema.properties.tabId.type).toBe('string');
    expect(getConsoleMessagesTool.inputSchema.properties.limit.type).toBe('integer');
    expect(getConsoleMessagesTool.inputSchema.properties.level.type).toBe('string');
  });
});