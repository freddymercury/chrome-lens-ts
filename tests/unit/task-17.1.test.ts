import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.DEBUGGER_ENABLED = 'true';
process.env.BREAKPOINT_TIMEOUT = '30000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 17.1: manage_breakpoints tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('manage_breakpoints tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('manage_breakpoints');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('breakpoint');
  });

  test('manage_breakpoints tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.operation).toBeDefined();
    expect(tool.inputSchema.properties.operation.type).toBe('string');
    expect(tool.inputSchema.properties.operation.enum).toEqual(['set', 'remove', 'list', 'enable', 'disable']);
    
    expect(tool.inputSchema.properties.location).toBeDefined();
    expect(tool.inputSchema.properties.location.type).toBe('object');
    expect(tool.inputSchema.properties.location.properties).toBeDefined();
    expect(tool.inputSchema.properties.location.properties.url).toBeDefined();
    expect(tool.inputSchema.properties.location.properties.lineNumber).toBeDefined();
    expect(tool.inputSchema.properties.location.properties.columnNumber).toBeDefined();
    
    expect(tool.inputSchema.properties.condition).toBeDefined();
    expect(tool.inputSchema.properties.condition.type).toBe('string');
    
    expect(tool.inputSchema.properties.logMessage).toBeDefined();
    expect(tool.inputSchema.properties.logMessage.type).toBe('string');
  });

  test('manage_breakpoints tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId', 'operation']);
  });

  test('location property has correct sub-properties', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    const location = tool.inputSchema.properties.location;
    expect(location.properties.url.type).toBe('string');
    expect(location.properties.url.description).toContain('Source file URL');
    
    expect(location.properties.lineNumber.type).toBe('integer');
    expect(location.properties.lineNumber.minimum).toBe(1);
    expect(location.properties.lineNumber.description).toContain('Line number');
    
    expect(location.properties.columnNumber.type).toBe('integer');
    expect(location.properties.columnNumber.minimum).toBe(0);
    expect(location.properties.columnNumber.description).toContain('Column number');
    
    expect(location.required).toEqual(['url', 'lineNumber']);
  });

  test('operation enum includes all required operations', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    const operations = tool.inputSchema.properties.operation.enum;
    expect(operations).toContain('set');
    expect(operations).toContain('remove');
    expect(operations).toContain('list');
    expect(operations).toContain('enable');
    expect(operations).toContain('disable');
  });

  test('conditional breakpoint support is documented', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    
    expect(tool.inputSchema.properties.condition.description).toContain('condition');
    expect(tool.inputSchema.properties.logMessage.description).toContain('log');
  });

  test('tool count includes new manage_breakpoints tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added modify_source_code (11), now adding manage_breakpoints (12)
    expect(tools.length).toBe(12);
  });

  test('manage_breakpoints respects DEBUGGER_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'manage_breakpoints');
    expect(tool).toBeDefined();
    
    // Test that description mentions debugging capability
    expect(tool.description.toLowerCase()).toContain('debug');
  });
});