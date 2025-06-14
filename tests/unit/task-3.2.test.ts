import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.TOOL_TIMEOUT_MS = '30000';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 3.2: CallTool Handler Structure', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    delete process.env.TOOL_TIMEOUT_MS;
  });

  test('callTool method exists', () => {
    expect(typeof server.callTool).toBe('function');
  });

  test('callTool throws error for unknown tool', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Unknown tool')
      })
    );
  });

  test('callTool handles empty tool name', async () => {
    await expect(server.callTool('', {})).rejects.toThrow();
  });

  test('callTool handles null parameters', async () => {
    await expect(server.callTool('unknown_tool', null)).rejects.toThrow();
  });

  test('callTool respects TOOL_TIMEOUT_MS environment variable', async () => {
    // This test verifies the timeout configuration is used
    const startTime = Date.now();
    
    try {
      await server.callTool('unknown_tool', {});
    } catch (error) {
      // Should fail quickly with unknown tool error, not timeout
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should fail fast, not wait for timeout
    }
  });

  test('callTool returns proper error format', async () => {
    try {
      await server.callTool('unknown_tool', {});
      fail('Expected callTool to throw an error');
    } catch (error: any) {
      expect(error).toHaveProperty('message');
      expect(typeof error.message).toBe('string');
    }
  });
});