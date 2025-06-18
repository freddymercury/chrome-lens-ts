/**
 * Tests for get_version tool
 */

import ChromeDevToolsMCPServer from '../../server';

describe('get_version tool', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
  });

  test('get_version tool is available', async () => {
    const tools = await server.listTools();
    const versionTool = tools.find((tool: any) => tool.name === 'get_version');
    
    expect(versionTool).toBeDefined();
    expect(versionTool.name).toBe('get_version');
    expect(versionTool.description).toContain('version and build information');
  });

  test('get_version returns version information', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.success).toBe(true);
    expect(result.version).toBeDefined();
    expect(result.version.name).toBe('chrome-lens-ts');
    expect(result.version.version).toBeTruthy();
    expect(result.version.nodeVersion).toBeTruthy();
  });

  test('get_version includes MCP information', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.version.mcp).toBeDefined();
    expect(result.version.mcp.sdkVersion).toBeTruthy();
    expect(result.version.mcp.protocolVersion).toBe('0.1.0');
  });

  test('get_version includes Chrome CDP information', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.version.chrome).toBeDefined();
    expect(result.version.chrome.cdpVersion).toBeTruthy();
  });

  test('get_version includes tools information', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.version.tools).toBeDefined();
    expect(result.version.tools.count).toBe(20); // Updated to include get_version
    expect(result.version.tools.names).toContain('get_version');
    expect(result.version.tools.names).toContain('connect_to_chrome');
    expect(result.version.tools.names).toContain('suggest_debugging_strategy');
  });

  test('get_version includes environment information', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.version.environment).toBeDefined();
    expect(result.version.environment.LOG_LEVEL).toBeDefined();
    expect(result.version.environment.MCP_SERVER_NAME).toBeDefined();
    expect(result.version.environment.CHROME_DEBUG_PORT).toBeDefined();
    expect(result.version.environment.CHROME_DEBUG_HOST).toBeDefined();
  });

  test('get_version includes feature flags', async () => {
    const result = await server.callTool('get_version', {});
    
    expect(result.version.features).toBeDefined();
    expect(result.version.features.securityAuditing).toBe(true);
    expect(result.version.features.performanceMonitoring).toBe(true);
    expect(result.version.features.intelligenceLayer).toBe(true);
    expect(typeof result.version.features.sourceCodeModification).toBe('boolean');
    expect(typeof result.version.features.debugging).toBe('boolean');
    expect(typeof result.version.features.eventMonitoring).toBe('boolean');
    expect(typeof result.version.features.stateMonitoring).toBe('boolean');
  });

  test('tool count is now 20', async () => {
    const tools = await server.listTools();
    expect(tools).toHaveLength(20);
  });
});