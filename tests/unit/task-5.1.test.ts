import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import ChromeDevToolsMCPServer from '../../server';

describe('Task 5.1: list_tabs Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes list_tabs tool', async () => {
    const tools = await server.listTools();
    
    const listTabsTool = tools.find(tool => tool.name === 'list_tabs');
    expect(listTabsTool).toBeDefined();
    expect(listTabsTool.name).toBe('list_tabs');
    expect(listTabsTool.description).toBeDefined();
    expect(typeof listTabsTool.description).toBe('string');
  });

  test('list_tabs tool has correct schema', async () => {
    const tools = await server.listTools();
    const listTabsTool = tools.find(tool => tool.name === 'list_tabs');
    
    expect(listTabsTool).toBeDefined();
    expect(listTabsTool.inputSchema).toBeDefined();
    expect(listTabsTool.inputSchema.type).toBe('object');
    expect(listTabsTool.inputSchema.properties).toBeDefined();
    
    // Should have optional host and port parameters for connection override
    expect(listTabsTool.inputSchema.properties.port).toBeDefined();
    expect(listTabsTool.inputSchema.properties.host).toBeDefined();
    
    // Both parameters should be optional (not in required array)
    expect(listTabsTool.inputSchema.required).toEqual([]);
  });

  test('list_tabs tool parameters have correct types and defaults', async () => {
    const tools = await server.listTools();
    const listTabsTool = tools.find(tool => tool.name === 'list_tabs');
    
    expect(listTabsTool.inputSchema.properties.port.type).toBe('integer');
    expect(listTabsTool.inputSchema.properties.host.type).toBe('string');
    
    // Should have default values
    expect(listTabsTool.inputSchema.properties.port.default).toBe(9222);
    expect(listTabsTool.inputSchema.properties.host.default).toBe('localhost');
  });

  test('list_tabs tool has proper metadata', async () => {
    const tools = await server.listTools();
    const listTabsTool = tools.find(tool => tool.name === 'list_tabs');
    
    expect(listTabsTool.description).toContain('tab');
    expect(listTabsTool.description.toLowerCase()).toMatch(/list|tabs|chrome/);
    
    // Should describe that it lists Chrome tabs
    expect(listTabsTool.description.toLowerCase()).toMatch(/list.*tab|tab.*list/);
  });

  test('list_tabs tool exists with other tools', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(2);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
  });

  test('list_tabs tool uses same connection parameter format as connect_to_chrome', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    const listTabsTool = tools.find(tool => tool.name === 'list_tabs');
    
    // Both tools should have similar parameter structures for consistency
    expect(listTabsTool.inputSchema.properties.port).toEqual(connectTool.inputSchema.properties.port);
    expect(listTabsTool.inputSchema.properties.host).toEqual(connectTool.inputSchema.properties.host);
  });
});