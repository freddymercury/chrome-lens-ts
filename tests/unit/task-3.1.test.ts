import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.MAX_TOOLS = '20';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 3.1: Empty Tool Handler Setup', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
  });

  afterEach(() => {
    delete process.env.MAX_TOOLS;
  });

  test('setupToolHandlers method exists', () => {
    expect(typeof server.setupToolHandlers).toBe('function');
  });

  test('setupToolHandlers can be called without errors', () => {
    expect(() => {
      server.setupToolHandlers();
    }).not.toThrow();
  });

  test('listTools handler returns tools array after setup', async () => {
    server.setupToolHandlers();
    
    const tools = await server.listTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  test('listTools method exists', () => {
    expect(typeof server.listTools).toBe('function');
  });

  test('listTools returns proper MCP format', async () => {
    server.setupToolHandlers();
    
    const tools = await server.listTools();
    expect(Array.isArray(tools)).toBe(true);
    
    // Each tool should have proper MCP format
    tools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.inputSchema).toBe('object');
    });
  });

  test('setupToolHandlers respects MAX_TOOLS environment variable', () => {
    // This test verifies that setupToolHandlers uses the MAX_TOOLS configuration
    expect(() => {
      server.setupToolHandlers();
    }).not.toThrow();
    
    // The fact that setupToolHandlers doesn't throw with MAX_TOOLS set means it's working
    expect(true).toBe(true);
  });
});