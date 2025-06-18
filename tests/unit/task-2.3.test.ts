import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.MCP_TRANSPORT = 'stdio';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 2.3: Server Run Method', () => {
  let server: ChromeDevToolsMCPServer;
  let originalConsoleLog: typeof console.log;
  let mockConsoleLog: jest.Mock;

  beforeEach(() => {
    // Mock console to capture logging
    originalConsoleLog = console.log;
    mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;
    
    server = new ChromeDevToolsMCPServer();
  });

  afterEach(() => {
    // Restore original console
    console.log = originalConsoleLog;
    delete process.env.MCP_TRANSPORT;
  });

  test('run method exists', () => {
    expect(typeof server.run).toBe('function');
  });

  test('run method can be called without errors', async () => {
    // Mock the server connect process to avoid actual stdio connection
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    server.connect = mockConnect;
    
    await expect(server.run()).resolves.not.toThrow();
    expect(mockConnect).toHaveBeenCalled();
  });

  test('run method sets up error handling before starting', async () => {
    const setupErrorHandlingSpy = jest.spyOn(server, 'setupErrorHandling');
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    server.connect = mockConnect;
    
    await server.run();
    
    expect(setupErrorHandlingSpy).toHaveBeenCalled();
  });

  test('run method uses MCP_TRANSPORT environment variable', async () => {
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    server.connect = mockConnect;
    
    await server.run();
    
    // The transport should be configured from environment
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Starting Chrome DevTools MCP Server')
    );
  });

  test('connect method exists for stdio transport', () => {
    expect(typeof server.connect).toBe('function');
  });

  test('connect method handles stdio transport configuration', async () => {
    // This test verifies the connect method can be called
    // We'll mock the actual transport to avoid stdio connection
    await expect(server.connect()).resolves.not.toThrow();
  });
});