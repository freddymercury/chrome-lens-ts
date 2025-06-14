import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 6.1: start_monitoring Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  test('listTools includes start_monitoring tool', async () => {
    const tools = await server.listTools();
    
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    expect(startMonitoringTool).toBeDefined();
    expect(startMonitoringTool.name).toBe('start_monitoring');
    expect(startMonitoringTool.description).toBeDefined();
    expect(typeof startMonitoringTool.description).toBe('string');
  });

  test('start_monitoring tool has correct schema', async () => {
    const tools = await server.listTools();
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    expect(startMonitoringTool).toBeDefined();
    expect(startMonitoringTool.inputSchema).toBeDefined();
    expect(startMonitoringTool.inputSchema.type).toBe('object');
    expect(startMonitoringTool.inputSchema.properties).toBeDefined();
    
    // Should have required tabId parameter
    expect(startMonitoringTool.inputSchema.properties.tabId).toBeDefined();
    expect(startMonitoringTool.inputSchema.required).toContain('tabId');
  });

  test('start_monitoring tool tabId parameter has correct type', async () => {
    const tools = await server.listTools();
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    expect(startMonitoringTool.inputSchema.properties.tabId.type).toBe('string');
    expect(startMonitoringTool.inputSchema.properties.tabId.description).toBeDefined();
    expect(startMonitoringTool.inputSchema.properties.tabId.description).toContain('tab');
  });

  test('start_monitoring tool has optional connection parameters', async () => {
    const tools = await server.listTools();
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    // Should include optional host and port for connection override
    expect(startMonitoringTool.inputSchema.properties.host).toBeDefined();
    expect(startMonitoringTool.inputSchema.properties.port).toBeDefined();
    
    // Host and port should not be required (only tabId is required)
    expect(startMonitoringTool.inputSchema.required).toEqual(['tabId']);
  });

  test('start_monitoring tool has proper metadata', async () => {
    const tools = await server.listTools();
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    expect(startMonitoringTool.description).toContain('monitor');
    expect(startMonitoringTool.description.toLowerCase()).toMatch(/monitor|start|tab/);
    
    // Should describe monitoring functionality
    expect(startMonitoringTool.description.toLowerCase()).toMatch(/monitor.*tab|start.*monitor/);
  });

  test('start_monitoring tool exists with other tools', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(3);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
  });

  test('start_monitoring tool uses same connection parameters as other tools', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    // Should have same host and port parameters for consistency
    expect(startMonitoringTool.inputSchema.properties.port).toEqual(connectTool.inputSchema.properties.port);
    expect(startMonitoringTool.inputSchema.properties.host).toEqual(connectTool.inputSchema.properties.host);
  });
});