import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 9.3: get_network_activity Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes get_network_activity tool', async () => {
    const tools = await server.listTools();
    
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    expect(getNetworkActivityTool).toBeDefined();
    expect(getNetworkActivityTool.name).toBe('get_network_activity');
    expect(getNetworkActivityTool.description).toBeDefined();
    expect(typeof getNetworkActivityTool.description).toBe('string');
  });

  test('get_network_activity tool has correct schema', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    expect(getNetworkActivityTool).toBeDefined();
    expect(getNetworkActivityTool.inputSchema).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.type).toBe('object');
    expect(getNetworkActivityTool.inputSchema.properties).toBeDefined();
    
    // Should have required tabId parameter
    expect(getNetworkActivityTool.inputSchema.properties.tabId).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.required).toContain('tabId');
  });

  test('get_network_activity tool tabId parameter has correct type and validation', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    expect(getNetworkActivityTool.inputSchema.properties.tabId.type).toBe('string');
    expect(getNetworkActivityTool.inputSchema.properties.tabId.description).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.tabId.description).toContain('tab');
    
    // Should have pattern for tab ID validation
    expect(getNetworkActivityTool.inputSchema.properties.tabId.pattern).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
  });

  test('get_network_activity tool has optional limit parameter', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    // Should include optional limit parameter
    expect(getNetworkActivityTool.inputSchema.properties.limit).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.limit.type).toBe('integer');
    expect(getNetworkActivityTool.inputSchema.properties.limit.description).toBeDefined();
    
    // Should have reasonable default and bounds
    expect(getNetworkActivityTool.inputSchema.properties.limit.default).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.limit.minimum).toBe(1);
    expect(getNetworkActivityTool.inputSchema.properties.limit.maximum).toBeDefined();
    
    // Limit should not be required (only tabId is required)
    expect(getNetworkActivityTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_network_activity tool has optional type parameter', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    // Should include optional type filter parameter
    expect(getNetworkActivityTool.inputSchema.properties.type).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.type.type).toBe('string');
    expect(getNetworkActivityTool.inputSchema.properties.type.description).toBeDefined();
    
    // Should have enum values for network activity types
    expect(getNetworkActivityTool.inputSchema.properties.type.enum).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.type.enum).toContain('request');
    expect(getNetworkActivityTool.inputSchema.properties.type.enum).toContain('response');
    
    // Type should not be required
    expect(getNetworkActivityTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_network_activity tool has optional method parameter', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    // Should include optional HTTP method filter parameter
    expect(getNetworkActivityTool.inputSchema.properties.method).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.method.type).toBe('string');
    expect(getNetworkActivityTool.inputSchema.properties.method.description).toBeDefined();
    
    // Should have enum values for common HTTP methods
    expect(getNetworkActivityTool.inputSchema.properties.method.enum).toBeDefined();
    expect(getNetworkActivityTool.inputSchema.properties.method.enum).toContain('GET');
    expect(getNetworkActivityTool.inputSchema.properties.method.enum).toContain('POST');
    expect(getNetworkActivityTool.inputSchema.properties.method.enum).toContain('PUT');
    expect(getNetworkActivityTool.inputSchema.properties.method.enum).toContain('DELETE');
    
    // Method should not be required
    expect(getNetworkActivityTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_network_activity tool has proper metadata', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    expect(getNetworkActivityTool.description).toContain('network');
    expect(getNetworkActivityTool.description.toLowerCase()).toMatch(/network|activity|request|response|retrieve|get/);
    
    // Should describe network activity retrieval functionality
    expect(getNetworkActivityTool.description.toLowerCase()).toMatch(/retrieve.*network|get.*network|network.*activity/);
  });

  test('five or more tools exist now (connect_to_chrome, list_tabs, start_monitoring, get_console_messages, get_network_activity)', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(5);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
    expect(toolNames).toContain('get_console_messages');
    expect(toolNames).toContain('get_network_activity');
  });

  test('get_network_activity tool schema has all expected properties', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    const expectedProperties = ['tabId', 'limit', 'type', 'method'];
    
    for (const prop of expectedProperties) {
      expect(getNetworkActivityTool.inputSchema.properties[prop]).toBeDefined();
    }
    
    // Only tabId should be required
    expect(getNetworkActivityTool.inputSchema.required).toEqual(['tabId']);
  });

  test('get_network_activity tool parameter types are correct', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    expect(getNetworkActivityTool.inputSchema.properties.tabId.type).toBe('string');
    expect(getNetworkActivityTool.inputSchema.properties.limit.type).toBe('integer');
    expect(getNetworkActivityTool.inputSchema.properties.type.type).toBe('string');
    expect(getNetworkActivityTool.inputSchema.properties.method.type).toBe('string');
  });

  test('get_network_activity tool has reasonable limits and defaults', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    const limitParam = getNetworkActivityTool.inputSchema.properties.limit;
    expect(limitParam.minimum).toBe(1);
    expect(limitParam.maximum).toBeGreaterThan(100);
    expect(limitParam.default).toBeGreaterThan(0);
    expect(limitParam.default).toBeLessThanOrEqual(limitParam.maximum);
  });

  test('get_network_activity tool enum values are comprehensive', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    // Check type enum
    const typeEnum = getNetworkActivityTool.inputSchema.properties.type.enum;
    expect(typeEnum).toEqual(['request', 'response']);
    
    // Check method enum (should include common HTTP methods)
    const methodEnum = getNetworkActivityTool.inputSchema.properties.method.enum;
    const expectedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    expectedMethods.forEach(method => {
      expect(methodEnum).toContain(method);
    });
  });

  test('get_network_activity tool description mentions filtering capabilities', async () => {
    const tools = await server.listTools();
    const getNetworkActivityTool = tools.find(tool => tool.name === 'get_network_activity');
    
    const description = getNetworkActivityTool.description.toLowerCase();
    
    // Should mention filtering capabilities
    expect(description).toMatch(/filter|limit|type|method/);
    
    // Should mention both requests and responses
    expect(description).toMatch(/request.*response|response.*request|request.*and.*response/);
  });
});