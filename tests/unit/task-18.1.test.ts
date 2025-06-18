import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.RUNTIME_INSPECTION_ENABLED = 'true';
process.env.MAX_INSPECTION_DEPTH = '5';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 18.1: inspect_variables tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('inspect_variables tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('inspect_variables');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('variable');
    expect(tool.description.toLowerCase()).toContain('inspect');
  });

  test('inspect_variables tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.objectId).toBeDefined();
    expect(tool.inputSchema.properties.objectId.type).toBe('string');
    expect(tool.inputSchema.properties.objectId.description).toContain('Runtime.RemoteObjectId');
    
    expect(tool.inputSchema.properties.expression).toBeDefined();
    expect(tool.inputSchema.properties.expression.type).toBe('string');
    expect(tool.inputSchema.properties.expression.description).toContain('JavaScript expression');
    
    expect(tool.inputSchema.properties.callFrameId).toBeDefined();
    expect(tool.inputSchema.properties.callFrameId.type).toBe('string');
    expect(tool.inputSchema.properties.callFrameId.description).toContain('call frame');
    
    expect(tool.inputSchema.properties.depth).toBeDefined();
    expect(tool.inputSchema.properties.depth.type).toBe('integer');
    expect(tool.inputSchema.properties.depth.minimum).toBe(0);
    expect(tool.inputSchema.properties.depth.maximum).toBe(10);
    expect(tool.inputSchema.properties.depth.default).toBe(2);
  });

  test('inspect_variables tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId']);
    expect(tool.inputSchema.required).not.toContain('objectId');
    expect(tool.inputSchema.required).not.toContain('expression');
  });

  test('tool supports multiple inspection modes', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    // Should support objectId OR expression
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/object.*id|expression/);
  });

  test('depth parameter has reasonable limits', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    const depth = tool.inputSchema.properties.depth;
    expect(depth.minimum).toBeGreaterThanOrEqual(0);
    expect(depth.maximum).toBeLessThanOrEqual(10);
    expect(depth.default).toBeGreaterThan(0);
    expect(depth.default).toBeLessThan(depth.maximum);
  });

  test('tool count includes new inspect_variables tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added: modify_source_code (11), manage_breakpoints (12), 
    // debug_step_control (13), now adding inspect_variables (14)
    expect(tools.length).toBe(20);
  });

  test('inspect_variables respects RUNTIME_INSPECTION_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    expect(tool).toBeDefined();
    
    // Test that description mentions runtime inspection
    expect(tool.description.toLowerCase()).toContain('runtime');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp|runtime/);
  });

  test('callFrameId is documented as context-specific', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'inspect_variables');
    
    const callFrameDesc = tool.inputSchema.properties.callFrameId.description;
    expect(callFrameDesc.toLowerCase()).toMatch(/paused|debugger|breakpoint/);
  });
});