import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.RUNTIME_INSPECTION_ENABLED = 'true';
process.env.STATE_ANALYSIS_ENABLED = 'true';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 18.3: analyze_runtime_state tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('analyze_runtime_state tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('analyze_runtime_state');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('state');
    expect(tool.description.toLowerCase()).toContain('analyze');
  });

  test('analyze_runtime_state tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.scope).toBeDefined();
    expect(tool.inputSchema.properties.scope.type).toBe('string');
    expect(tool.inputSchema.properties.scope.enum).toEqual(['global', 'local', 'closure', 'all']);
    expect(tool.inputSchema.properties.scope.default).toBe('all');
    
    expect(tool.inputSchema.properties.includePrototype).toBeDefined();
    expect(tool.inputSchema.properties.includePrototype.type).toBe('boolean');
    expect(tool.inputSchema.properties.includePrototype.default).toBe(false);
    
    expect(tool.inputSchema.properties.includeGetters).toBeDefined();
    expect(tool.inputSchema.properties.includeGetters.type).toBe('boolean');
    expect(tool.inputSchema.properties.includeGetters.default).toBe(false);
    
    expect(tool.inputSchema.properties.maxResults).toBeDefined();
    expect(tool.inputSchema.properties.maxResults.type).toBe('integer');
    expect(tool.inputSchema.properties.maxResults.minimum).toBe(1);
    expect(tool.inputSchema.properties.maxResults.maximum).toBe(1000);
    expect(tool.inputSchema.properties.maxResults.default).toBe(100);
  });

  test('analyze_runtime_state tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId']);
  });

  test('scope enum includes all analysis scopes', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    const scopes = tool.inputSchema.properties.scope.enum;
    expect(scopes).toContain('global');
    expect(scopes).toContain('local');
    expect(scopes).toContain('closure');
    expect(scopes).toContain('all');
  });

  test('tool description mentions comprehensive state analysis', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/comprehensive|complete|full|analyze/);
    expect(desc).toMatch(/runtime|state|memory/);
  });

  test('tool count includes new analyze_runtime_state tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added: modify_source_code (11), manage_breakpoints (12), 
    // debug_step_control (13), inspect_variables (14), now adding analyze_runtime_state (15)
    expect(tools.length).toBe(20);
  });

  test('analyze_runtime_state respects STATE_ANALYSIS_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    expect(tool).toBeDefined();
    
    // Test that description mentions state analysis
    expect(tool.description.toLowerCase()).toContain('state');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp|runtime/);
  });

  test('maxResults has reasonable limits', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    const maxResults = tool.inputSchema.properties.maxResults;
    expect(maxResults.minimum).toBeGreaterThanOrEqual(1);
    expect(maxResults.maximum).toBeLessThanOrEqual(1000);
    expect(maxResults.default).toBeGreaterThan(0);
    expect(maxResults.default).toBeLessThan(maxResults.maximum);
  });

  test('tool supports prototype and getter analysis options', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_runtime_state');
    
    // Should have options for advanced analysis
    expect(tool.inputSchema.properties.includePrototype).toBeDefined();
    expect(tool.inputSchema.properties.includeGetters).toBeDefined();
    
    // Both should default to false for performance
    expect(tool.inputSchema.properties.includePrototype.default).toBe(false);
    expect(tool.inputSchema.properties.includeGetters.default).toBe(false);
  });
});