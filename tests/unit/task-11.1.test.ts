import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import ChromeDevToolsMCPServer from '../../server';

describe('Task 11.1: security_audit Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes security_audit tool', async () => {
    const tools = await server.listTools();
    
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    expect(securityAuditTool).toBeDefined();
    expect(securityAuditTool.name).toBe('security_audit');
    expect(securityAuditTool.description).toBeDefined();
    expect(typeof securityAuditTool.description).toBe('string');
  });

  test('security_audit tool has correct schema', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    expect(securityAuditTool).toBeDefined();
    expect(securityAuditTool.inputSchema).toBeDefined();
    expect(securityAuditTool.inputSchema.type).toBe('object');
    expect(securityAuditTool.inputSchema.properties).toBeDefined();
    
    // Should have required tabId parameter
    expect(securityAuditTool.inputSchema.properties.tabId).toBeDefined();
    expect(securityAuditTool.inputSchema.required).toContain('tabId');
  });

  test('security_audit tool tabId parameter has correct type and validation', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    expect(securityAuditTool.inputSchema.properties.tabId.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.tabId.description).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.tabId.description).toContain('tab');
    
    // Should have pattern for tab ID validation
    expect(securityAuditTool.inputSchema.properties.tabId.pattern).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
  });

  test('security_audit tool has optional auditType parameter', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    // Should include optional audit type parameter
    expect(securityAuditTool.inputSchema.properties.auditType).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.auditType.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.auditType.description).toBeDefined();
    
    // Should have enum values for audit types
    expect(securityAuditTool.inputSchema.properties.auditType.enum).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.auditType.enum).toContain('basic');
    expect(securityAuditTool.inputSchema.properties.auditType.enum).toContain('comprehensive');
    expect(securityAuditTool.inputSchema.properties.auditType.enum).toContain('headers');
    expect(securityAuditTool.inputSchema.properties.auditType.enum).toContain('xss');
    
    // Should have default value
    expect(securityAuditTool.inputSchema.properties.auditType.default).toBe('basic');
    
    // auditType should not be required
    expect(securityAuditTool.inputSchema.required).toEqual(['tabId']);
  });

  test('security_audit tool has optional depth parameter', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    // Should include optional depth parameter
    expect(securityAuditTool.inputSchema.properties.depth).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.depth.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.depth.description).toBeDefined();
    
    // Should have enum values for depth levels
    expect(securityAuditTool.inputSchema.properties.depth.enum).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.depth.enum).toContain('shallow');
    expect(securityAuditTool.inputSchema.properties.depth.enum).toContain('medium');
    expect(securityAuditTool.inputSchema.properties.depth.enum).toContain('deep');
    
    // Should have default value
    expect(securityAuditTool.inputSchema.properties.depth.default).toBe('medium');
    
    // depth should not be required
    expect(securityAuditTool.inputSchema.required).toEqual(['tabId']);
  });

  test('security_audit tool has optional includeRecommendations parameter', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    // Should include optional recommendations flag
    expect(securityAuditTool.inputSchema.properties.includeRecommendations).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.includeRecommendations.type).toBe('boolean');
    expect(securityAuditTool.inputSchema.properties.includeRecommendations.description).toBeDefined();
    expect(securityAuditTool.inputSchema.properties.includeRecommendations.default).toBe(true);
    
    // Should not be required
    expect(securityAuditTool.inputSchema.required).toEqual(['tabId']);
  });

  test('security_audit tool has proper metadata', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    expect(securityAuditTool.description).toContain('security');
    expect(securityAuditTool.description.toLowerCase()).toMatch(/security|audit|vulnerability|analyze/);
    
    // Should describe security audit functionality
    expect(securityAuditTool.description.toLowerCase()).toMatch(/comprehensive.*security|security.*audit|analyze.*security/);
  });

  test('nine tools exist now (connect_to_chrome, list_tabs, start_monitoring, get_console_messages, get_network_activity, execute_js, security_audit, check_vulnerabilities, get_performance_metrics)', async () => {
    const tools = await server.listTools();
    expect(tools).toHaveLength(9);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
    expect(toolNames).toContain('get_console_messages');
    expect(toolNames).toContain('get_network_activity');
    expect(toolNames).toContain('execute_js');
    expect(toolNames).toContain('security_audit');
    expect(toolNames).toContain('check_vulnerabilities');
    expect(toolNames).toContain('get_performance_metrics');
  });

  test('security_audit tool schema has all expected properties', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const expectedProperties = ['tabId', 'auditType', 'depth', 'includeRecommendations'];
    
    for (const prop of expectedProperties) {
      expect(securityAuditTool.inputSchema.properties[prop]).toBeDefined();
    }
    
    // Only tabId should be required
    expect(securityAuditTool.inputSchema.required).toEqual(['tabId']);
  });

  test('security_audit tool parameter types are correct', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    expect(securityAuditTool.inputSchema.properties.tabId.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.auditType.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.depth.type).toBe('string');
    expect(securityAuditTool.inputSchema.properties.includeRecommendations.type).toBe('boolean');
  });

  test('security_audit tool has reasonable audit type options', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const auditTypes = securityAuditTool.inputSchema.properties.auditType.enum;
    expect(auditTypes).toContain('basic');
    expect(auditTypes).toContain('comprehensive');
    expect(auditTypes).toContain('headers');
    expect(auditTypes).toContain('xss');
    expect(auditTypes.length).toBeGreaterThanOrEqual(4);
  });

  test('security_audit tool has reasonable depth options', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const depthOptions = securityAuditTool.inputSchema.properties.depth.enum;
    expect(depthOptions).toContain('shallow');
    expect(depthOptions).toContain('medium');
    expect(depthOptions).toContain('deep');
    expect(depthOptions.length).toBe(3);
  });

  test('security_audit tool mentions comprehensive security analysis in description', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const description = securityAuditTool.description.toLowerCase();
    
    // Should mention comprehensive security analysis
    expect(description).toMatch(/comprehensive|complete|full/);
    expect(description).toMatch(/security|audit/);
    
    // Should mention analysis capabilities
    expect(description).toMatch(/analyze|check|detect|scan/);
  });

  test('security_audit tool auditType parameter describes audit scope', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const auditTypeDesc = securityAuditTool.inputSchema.properties.auditType.description.toLowerCase();
    
    // Should describe what audit type controls
    expect(auditTypeDesc).toMatch(/type.*audit|scope.*audit|kind.*audit/);
  });

  test('security_audit tool depth parameter describes analysis depth', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const depthDesc = securityAuditTool.inputSchema.properties.depth.description.toLowerCase();
    
    // Should describe depth of analysis
    expect(depthDesc).toMatch(/depth|thoroughness|level|detail/);
    expect(depthDesc).toMatch(/analysis|audit|scan/);
  });

  test('security_audit tool includeRecommendations parameter describes recommendation inclusion', async () => {
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    const recommendationsDesc = securityAuditTool.inputSchema.properties.includeRecommendations.description.toLowerCase();
    
    // Should describe recommendation functionality
    expect(recommendationsDesc).toMatch(/recommendation|suggestion|advice|guidance/);
  });
});