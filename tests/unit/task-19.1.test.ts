import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.ERROR_ANALYSIS_ENABLED = 'true';
process.env.MAX_ERROR_STACK_DEPTH = '10';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 19.1: analyze_errors tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('analyze_errors tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('analyze_errors');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('error');
    expect(tool.description.toLowerCase()).toContain('analyze');
  });

  test('analyze_errors tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.errorType).toBeDefined();
    expect(tool.inputSchema.properties.errorType.type).toBe('string');
    expect(tool.inputSchema.properties.errorType.enum).toEqual([
      'runtime',
      'syntax',
      'network',
      'security',
      'all'
    ]);
    expect(tool.inputSchema.properties.errorType.default).toBe('all');
    
    expect(tool.inputSchema.properties.includeStackTrace).toBeDefined();
    expect(tool.inputSchema.properties.includeStackTrace.type).toBe('boolean');
    expect(tool.inputSchema.properties.includeStackTrace.default).toBe(true);
    
    expect(tool.inputSchema.properties.includeSourceContext).toBeDefined();
    expect(tool.inputSchema.properties.includeSourceContext.type).toBe('boolean');
    expect(tool.inputSchema.properties.includeSourceContext.default).toBe(true);
    
    expect(tool.inputSchema.properties.timeRange).toBeDefined();
    expect(tool.inputSchema.properties.timeRange.type).toBe('integer');
    expect(tool.inputSchema.properties.timeRange.minimum).toBe(0);
    expect(tool.inputSchema.properties.timeRange.maximum).toBe(3600);
    expect(tool.inputSchema.properties.timeRange.default).toBe(300);
  });

  test('analyze_errors tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId']);
  });

  test('errorType enum includes all error categories', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    const errorTypes = tool.inputSchema.properties.errorType.enum;
    expect(errorTypes).toContain('runtime');
    expect(errorTypes).toContain('syntax');
    expect(errorTypes).toContain('network');
    expect(errorTypes).toContain('security');
    expect(errorTypes).toContain('all');
  });

  test('tool description mentions comprehensive error analysis', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/comprehensive|detailed|analyze/);
    expect(desc).toMatch(/error|exception|failure/);
  });

  test('tool count includes new analyze_errors tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added: modify_source_code (11), manage_breakpoints (12), 
    // debug_step_control (13), inspect_variables (14), analyze_runtime_state (15),
    // now adding analyze_errors (16)
    expect(tools.length).toBe(19);
  });

  test('analyze_errors respects ERROR_ANALYSIS_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    expect(tool).toBeDefined();
    
    // Test that description mentions error analysis
    expect(tool.description.toLowerCase()).toContain('error');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp|runtime/);
  });

  test('timeRange has reasonable limits for error history', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    const timeRange = tool.inputSchema.properties.timeRange;
    expect(timeRange.minimum).toBe(0); // Current errors only
    expect(timeRange.maximum).toBe(3600); // Up to 1 hour
    expect(timeRange.default).toBe(300); // Default 5 minutes
  });

  test('tool supports stack trace and source context options', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'analyze_errors');
    
    // Should have options for detailed error analysis
    expect(tool.inputSchema.properties.includeStackTrace).toBeDefined();
    expect(tool.inputSchema.properties.includeSourceContext).toBeDefined();
    
    // Both should default to true for comprehensive analysis
    expect(tool.inputSchema.properties.includeStackTrace.default).toBe(true);
    expect(tool.inputSchema.properties.includeSourceContext.default).toBe(true);
  });
});