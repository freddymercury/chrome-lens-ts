import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 4.1: connect_to_chrome Tool Definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('listTools includes connect_to_chrome tool', async () => {
    const tools = await server.listTools();
    
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    expect(connectTool).toBeDefined();
    expect(connectTool.name).toBe('connect_to_chrome');
    expect(connectTool.description).toBeDefined();
    expect(typeof connectTool.description).toBe('string');
  });

  test('connect_to_chrome tool has correct schema', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    
    expect(connectTool).toBeDefined();
    expect(connectTool.inputSchema).toBeDefined();
    expect(connectTool.inputSchema.type).toBe('object');
    expect(connectTool.inputSchema.properties).toBeDefined();
    
    // Should have port and host parameters
    expect(connectTool.inputSchema.properties.port).toBeDefined();
    expect(connectTool.inputSchema.properties.host).toBeDefined();
    
    // Port should have default value
    expect(connectTool.inputSchema.properties.port.default).toBe(9222);
    expect(connectTool.inputSchema.properties.host.default).toBe('localhost');
  });

  test('connect_to_chrome tool parameters have correct types', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    
    expect(connectTool.inputSchema.properties.port.type).toBe('integer');
    expect(connectTool.inputSchema.properties.host.type).toBe('string');
    
    // Port should have range validation
    expect(connectTool.inputSchema.properties.port.minimum).toBe(1024);
    expect(connectTool.inputSchema.properties.port.maximum).toBe(65535);
  });

  test('connect_to_chrome tool has proper metadata', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    
    expect(connectTool.description).toContain('Chrome DevTools');
    expect(connectTool.description).toContain('connect');
    
    // Should indicate that it establishes a connection
    expect(connectTool.description.toLowerCase()).toMatch(/connect|establish|attach/);
  });

  test('connect_to_chrome tool exists in tools list', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThan(0);
    
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    expect(connectTool).toBeDefined();
  });

  test('tool uses environment variable defaults', async () => {
    const tools = await server.listTools();
    const connectTool = tools.find(tool => tool.name === 'connect_to_chrome');
    
    // Should use CHROME_DEBUG_PORT and CHROME_DEBUG_HOST from environment
    expect(connectTool.inputSchema.properties.port.default).toBe(parseInt(process.env.CHROME_DEBUG_PORT || '9222', 10));
    expect(connectTool.inputSchema.properties.host.default).toBe(process.env.CHROME_DEBUG_HOST || 'localhost');
  });
});