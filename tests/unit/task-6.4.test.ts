import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 6.4: Wire startMonitoring to Handler', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('callTool supports start_monitoring tool', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock startMonitoring to avoid actual connection
    jest.spyOn(server, 'startMonitoring').mockResolvedValue({
      success: true,
      message: `Started monitoring Chrome tab ${validTabId}`,
      monitoring: {
        tabId: validTabId,
        host: 'localhost',
        port: 9222,
        timestamp: new Date().toISOString(),
        status: 'active',
        domains: ['Console', 'Runtime']
      }
    });

    const result = await server.callTool('start_monitoring', { tabId: validTabId });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Started monitoring');
    expect(result.monitoring).toBeDefined();
    expect(result.monitoring.tabId).toBe(validTabId);
  });

  test('callTool passes parameters correctly to startMonitoring', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, host: '127.0.0.1', port: 9223 };
    
    const startMonitoringSpy = jest.spyOn(server, 'startMonitoring').mockResolvedValue({
      success: true,
      message: 'Mocked response',
      monitoring: { tabId: validTabId, status: 'active', domains: [] }
    });

    await server.callTool('start_monitoring', params);
    
    expect(startMonitoringSpy).toHaveBeenCalledWith(params);
    expect(startMonitoringSpy).toHaveBeenCalledTimes(1);
    
    startMonitoringSpy.mockRestore();
  });

  test('callTool validates start_monitoring tool name', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock to avoid actual connection attempts
    jest.spyOn(server, 'startMonitoring').mockResolvedValue({
      success: false,
      message: 'Connection failed',
      monitoring: { tabId: validTabId, status: 'failed', domains: [] }
    });

    // Should not throw error for valid tool name
    await expect(server.callTool('start_monitoring', { tabId: validTabId })).resolves.toBeDefined();
  });

  test('callTool propagates startMonitoring errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock startMonitoring to throw error
    jest.spyOn(server, 'startMonitoring').mockRejectedValue(new Error('Tab ID validation failed'));

    await expect(server.callTool('start_monitoring', { tabId: validTabId })).rejects.toThrow('Tab ID validation failed');
  });

  test('callTool handles start_monitoring parameter validation', async () => {
    // Mock startMonitoring to handle validation
    const startMonitoringSpy = jest.spyOn(server, 'startMonitoring').mockImplementation(async (params) => {
      if (!params.tabId) {
        throw new Error('Tab ID is required and must be a non-empty string');
      }
      return {
        success: true,
        message: 'Monitoring started',
        monitoring: { tabId: params.tabId, status: 'active', domains: [] }
      };
    });

    // Should propagate validation errors
    await expect(server.callTool('start_monitoring', {})).rejects.toThrow('Tab ID is required');
    
    startMonitoringSpy.mockRestore();
  });

  test('start_monitoring tool integrates with full MCP flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test complete flow: listTools -> callTool
    const tools = await server.listTools();
    const startMonitoringTool = tools.find(tool => tool.name === 'start_monitoring');
    
    expect(startMonitoringTool).toBeDefined();
    
    // Mock to avoid actual connection
    jest.spyOn(server, 'startMonitoring').mockResolvedValue({
      success: true,
      message: 'Integration test success',
      monitoring: {
        tabId: validTabId,
        host: 'localhost',  
        port: 9222,
        timestamp: new Date().toISOString(),
        status: 'active',
        domains: ['Console', 'Runtime']
      }
    });

    const result = await server.callTool('start_monitoring', { tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.monitoring.tabId).toBe(validTabId);
  });

  test('callTool error message includes start_monitoring in available tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(/start_monitoring/);
  });
});