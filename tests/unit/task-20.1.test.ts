import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.EVENT_MONITORING_ENABLED = 'true';
process.env.MAX_EVENT_BUFFER_SIZE = '1000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 20.1: monitor_events tool definition', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('monitor_events tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    expect(tool).toBeDefined();
    expect(tool.name).toBe('monitor_events');
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.description.toLowerCase()).toContain('event');
    expect(tool.description.toLowerCase()).toContain('monitor');
  });

  test('monitor_events tool has correct input schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toBeDefined();
    
    // Check all required properties
    expect(tool.inputSchema.properties.tabId).toBeDefined();
    expect(tool.inputSchema.properties.tabId.type).toBe('string');
    expect(tool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    expect(tool.inputSchema.properties.eventTypes).toBeDefined();
    expect(tool.inputSchema.properties.eventTypes.type).toBe('array');
    expect(tool.inputSchema.properties.eventTypes.items.type).toBe('string');
    expect(tool.inputSchema.properties.eventTypes.items.enum).toEqual([
      'dom',
      'console',
      'network',
      'script',
      'performance',
      'security',
      'storage',
      'all'
    ]);
    
    expect(tool.inputSchema.properties.filters).toBeDefined();
    expect(tool.inputSchema.properties.filters.type).toBe('object');
    
    expect(tool.inputSchema.properties.bufferSize).toBeDefined();
    expect(tool.inputSchema.properties.bufferSize.type).toBe('integer');
    expect(tool.inputSchema.properties.bufferSize.minimum).toBe(10);
    expect(tool.inputSchema.properties.bufferSize.maximum).toBe(10000);
    expect(tool.inputSchema.properties.bufferSize.default).toBe(100);
    
    expect(tool.inputSchema.properties.realtime).toBeDefined();
    expect(tool.inputSchema.properties.realtime.type).toBe('boolean');
    expect(tool.inputSchema.properties.realtime.default).toBe(true);
  });

  test('monitor_events tool has correct required parameters', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    expect(tool.inputSchema.required).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['tabId', 'eventTypes']);
  });

  test('eventTypes array includes all event categories', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    const eventTypes = tool.inputSchema.properties.eventTypes.items.enum;
    expect(eventTypes).toContain('dom');
    expect(eventTypes).toContain('console');
    expect(eventTypes).toContain('network');
    expect(eventTypes).toContain('script');
    expect(eventTypes).toContain('performance');
    expect(eventTypes).toContain('security');
    expect(eventTypes).toContain('storage');
    expect(eventTypes).toContain('all');
  });

  test('filters property has correct schema', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    const filters = tool.inputSchema.properties.filters;
    expect(filters.properties).toBeDefined();
    expect(filters.properties.url).toBeDefined();
    expect(filters.properties.url.type).toBe('string');
    expect(filters.properties.eventName).toBeDefined();
    expect(filters.properties.eventName.type).toBe('string');
    expect(filters.properties.severity).toBeDefined();
    expect(filters.properties.severity.type).toBe('string');
  });

  test('tool description mentions real-time monitoring', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/real-time|realtime|live/);
    expect(desc).toMatch(/monitor|track|observe/);
  });

  test('tool count includes new monitor_events tool', async () => {
    const tools = await server.listTools();
    // v1.0 had 10 tools, v1.1 added 6 more, now adding monitor_events (17)
    expect(tools.length).toBe(17);
  });

  test('monitor_events respects EVENT_MONITORING_ENABLED environment variable', async () => {
    // Tool should be available when enabled
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    expect(tool).toBeDefined();
    
    // Test that description mentions event monitoring
    expect(tool.description.toLowerCase()).toContain('monitor');
  });

  test('tool description mentions Chrome DevTools Protocol', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    const desc = tool.description.toLowerCase();
    expect(desc).toMatch(/chrome|devtools|cdp/);
  });

  test('bufferSize has reasonable limits', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    const bufferSize = tool.inputSchema.properties.bufferSize;
    expect(bufferSize.minimum).toBeGreaterThanOrEqual(10);
    expect(bufferSize.maximum).toBeLessThanOrEqual(10000);
    expect(bufferSize.default).toBeGreaterThan(0);
    expect(bufferSize.default).toBeLessThan(bufferSize.maximum);
  });

  test('tool supports both buffered and real-time modes', async () => {
    const tools = await server.listTools();
    const tool = tools.find((t: any) => t.name === 'monitor_events');
    
    // Should have realtime option
    expect(tool.inputSchema.properties.realtime).toBeDefined();
    expect(tool.inputSchema.properties.realtime.default).toBe(true);
    
    // Should have buffer size for buffered mode
    expect(tool.inputSchema.properties.bufferSize).toBeDefined();
  });
});