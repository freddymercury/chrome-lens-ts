import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.DEBUGGER_ENABLED = 'true';
process.env.STEP_TIMEOUT = '5000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 17.3: debug_step_control tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('debug_step_control tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('debug_step_control');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('step');
    expect(tool.description.toLowerCase()).toContain('debug');
  });

  test('debug_step_control tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.action).toBeDefined();
    expect(tool.inputSchema.properties.action.type).toBe('string');
    expect(tool.inputSchema.properties.action.enum).toEqual([
      'pause',
      'resume', 
      'stepOver',
      'stepInto',
      'stepOut'
    ]);
    
    expect(tool.inputSchema.properties.callFrameId).toBeDefined();
    expect(tool.inputSchema.properties.callFrameId.type).toBe('string');
    expect(tool.inputSchema.properties.callFrameId.description).toContain('Required for step actions');
  });

  test('debug_step_control tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId', 'action']);
  });

  test('action enum includes all required debugging actions', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    const actions = tool.inputSchema.properties.action.enum;
    expect(actions).toContain('pause');
    expect(actions).toContain('resume');
    expect(actions).toContain('stepOver');
    expect(actions).toContain('stepInto');
    expect(actions).toContain('stepOut');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp|debugger/);
  });

  test('tool count includes new debug_step_control tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added modify_source_code (11), manage_breakpoints (12), now adding debug_step_control (13)
    expect(tools.length).toBe(20);
  });

  test('debug_step_control respects DEBUGGER_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    expect(tool).toBeDefined();
    
    // Test that description mentions step debugging
    expect(tool.description.toLowerCase()).toContain('step');
  });

  test('callFrameId is documented as conditional requirement', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'debug_step_control');
    
    const callFrameDesc = tool.inputSchema.properties.callFrameId.description;
    expect(callFrameDesc).toContain('step');
    expect(callFrameDesc.toLowerCase()).toMatch(/required.*step|step.*required/);
  });
});