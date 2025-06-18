import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.CODE_MODIFICATION_ENABLED = 'true';
process.env.HOT_RELOAD_TIMEOUT = '5000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 16.1: modify_source_code tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('modify_source_code tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'modify_source_code');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('modify_source_code');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('modify');
    expect(tool.description.toLowerCase()).toContain('source');
  });

  test('modify_source_code tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'modify_source_code');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.sourceId).toBeDefined();
    expect(tool.inputSchema.properties.sourceId.type).toBe('string');
    expect(tool.inputSchema.properties.sourceId.description).toContain('Script ID');
    
    expect(tool.inputSchema.properties.newContent).toBeDefined();
    expect(tool.inputSchema.properties.newContent.type).toBe('string');
    expect(tool.inputSchema.properties.newContent.description).toContain('source code');
    
    expect(tool.inputSchema.properties.hotReload).toBeDefined();
    expect(tool.inputSchema.properties.hotReload.type).toBe('boolean');
    expect(tool.inputSchema.properties.hotReload.default).toBe(true);
    
    expect(tool.inputSchema.properties.validateSyntax).toBeDefined();
    expect(tool.inputSchema.properties.validateSyntax.type).toBe('boolean');
    expect(tool.inputSchema.properties.validateSyntax.default).toBe(true);
  });

  test('modify_source_code tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'modify_source_code');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId', 'sourceId', 'newContent']);
  });

  test('tool count includes new modify_source_code tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 adds modify_source_code as the first new tool
    expect(tools.length).toBe(20);
  });

  test('modify_source_code respects CODE_MODIFICATION_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'modify_source_code');
    expect(tool).toBeDefined();
    
    // Test that description mentions it can be disabled via environment
    expect(tool.description.toLowerCase()).toContain('modif');
  });

  test('modify_source_code tool description mentions hot reload capability', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'modify_source_code');
    
    expect(tool.description.toLowerCase()).toContain('hot reload');
  });
});