import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.DEBUGGER_ENABLED = 'true';
process.env.BREAKPOINT_TIMEOUT = '30000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 17.2: Breakpoint Setting and Management', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Debugger: {
        enable: jest.fn(() => Promise.resolve({})),
        setBreakpointByUrl: jest.fn(),
        removeBreakpoint: jest.fn(),
        setBreakpointsActive: jest.fn(),
        getPossibleBreakpoints: jest.fn()
      },
      Runtime: {
        enable: jest.fn(() => Promise.resolve({}))
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should set a breakpoint using Debugger.setBreakpointByUrl', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/app.js';
    const lineNumber = 42;
    
    // Mock successful breakpoint setting
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-123',
      locations: [{
        scriptId: 'script-456',
        lineNumber: 42,
        columnNumber: 0
      }]
    });
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: {
        url,
        lineNumber
      }
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.setBreakpointByUrl).toHaveBeenCalledWith({
      url,
      lineNumber: lineNumber - 1, // CDP uses 0-based line numbers
      columnNumber: undefined
    });
    expect(result.breakpointId).toBe('bp-123');
  });

  test('should set a conditional breakpoint', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/debug.js';
    const lineNumber = 100;
    const condition = 'x > 10';
    
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-cond-456',
      locations: [{
        scriptId: 'script-789',
        lineNumber: 99,
        columnNumber: 0
      }]
    });
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: {
        url,
        lineNumber
      },
      condition
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.setBreakpointByUrl).toHaveBeenCalledWith({
      url,
      lineNumber: lineNumber - 1,
      columnNumber: undefined,
      condition
    });
  });

  test('should set a logpoint with message', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/log.js';
    const lineNumber = 50;
    const logMessage = 'Value is {x}';
    
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-log-789',
      locations: [{
        scriptId: 'script-log',
        lineNumber: 49,
        columnNumber: 0
      }]
    });
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: {
        url,
        lineNumber
      },
      logMessage
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.setBreakpointByUrl).toHaveBeenCalledWith({
      url,
      lineNumber: lineNumber - 1,
      columnNumber: undefined,
      logMessage
    });
  });

  test('should remove a breakpoint', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const breakpointId = 'bp-to-remove';
    
    // First set up breakpoint in storage
    const breakpoints = server.getBreakpointRegistry(tabId);
    breakpoints.set(breakpointId, {
      id: breakpointId,
      url: 'http://example.com/remove.js',
      lineNumber: 25,
      enabled: true
    });
    
    mockClient.Debugger.removeBreakpoint.mockResolvedValue({});
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'remove',
      breakpointId
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.removeBreakpoint).toHaveBeenCalledWith({
      breakpointId
    });
    expect(breakpoints.has(breakpointId)).toBe(false);
  });

  test('should list all breakpoints for a tab', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Set up multiple breakpoints
    const breakpoints = server.getBreakpointRegistry(tabId);
    breakpoints.set('bp-1', {
      id: 'bp-1',
      url: 'http://example.com/file1.js',
      lineNumber: 10,
      enabled: true
    });
    breakpoints.set('bp-2', {
      id: 'bp-2',
      url: 'http://example.com/file2.js',
      lineNumber: 20,
      enabled: false,
      condition: 'x === 5'
    });
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'list'
    });
    
    expect(result.success).toBe(true);
    expect(result.breakpoints).toHaveLength(2);
    expect(result.breakpoints[0].id).toBe('bp-1');
    expect(result.breakpoints[1].condition).toBe('x === 5');
  });

  test('should enable a disabled breakpoint', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const breakpointId = 'bp-disabled';
    
    // Set up disabled breakpoint
    const breakpoints = server.getBreakpointRegistry(tabId);
    breakpoints.set(breakpointId, {
      id: breakpointId,
      url: 'http://example.com/enable.js',
      lineNumber: 30,
      enabled: false
    });
    
    mockClient.Debugger.setBreakpointsActive.mockResolvedValue({});
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'enable',
      breakpointId
    });
    
    expect(result.success).toBe(true);
    expect(breakpoints.get(breakpointId).enabled).toBe(true);
  });

  test('should disable an enabled breakpoint', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const breakpointId = 'bp-enabled';
    
    // Set up enabled breakpoint
    const breakpoints = server.getBreakpointRegistry(tabId);
    breakpoints.set(breakpointId, {
      id: breakpointId,
      url: 'http://example.com/disable.js',
      lineNumber: 40,
      enabled: true
    });
    
    mockClient.Debugger.setBreakpointsActive.mockResolvedValue({});
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'disable',
      breakpointId
    });
    
    expect(result.success).toBe(true);
    expect(breakpoints.get(breakpointId).enabled).toBe(false);
  });

  test('should handle breakpoint resolution for minified code', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/app.min.js';
    const lineNumber = 1;
    const columnNumber = 1234;
    
    // Mock multiple possible locations
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-min-123',
      locations: [
        {
          scriptId: 'script-min',
          lineNumber: 0,
          columnNumber: 1234
        },
        {
          scriptId: 'script-min',
          lineNumber: 0,
          columnNumber: 1240
        }
      ]
    });
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: {
        url,
        lineNumber,
        columnNumber
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.locations).toHaveLength(2);
    expect(result.locations[0].columnNumber).toBe(1234);
  });

  test('should handle breakpoint setting failure', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/fail.js';
    const lineNumber = 999;
    
    mockClient.Debugger.setBreakpointByUrl.mockRejectedValue(
      new Error('Could not resolve breakpoint')
    );
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: {
        url,
        lineNumber
      }
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Could not resolve breakpoint');
  });

  test('should validate required parameters for set operation', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'set'
      // Missing location
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Location required');
  });

  test('should validate required parameters for remove operation', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'remove'
      // Missing breakpointId
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Breakpoint ID required');
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'NOTCONNECTED';
    
    // Clear the mock client to simulate not connected
    server.clearStorage();
    
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'list'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should persist breakpoints across operations', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const url = 'http://example.com/persist.js';
    
    // Set first breakpoint
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-persist-1',
      locations: [{ scriptId: 's1', lineNumber: 9, columnNumber: 0 }]
    });
    
    await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: { url, lineNumber: 10 }
    });
    
    // Set second breakpoint
    mockClient.Debugger.setBreakpointByUrl.mockResolvedValue({
      breakpointId: 'bp-persist-2',
      locations: [{ scriptId: 's1', lineNumber: 19, columnNumber: 0 }]
    });
    
    await server.manageBreakpoints({
      tabId,
      operation: 'set',
      location: { url, lineNumber: 20 }
    });
    
    // List should show both
    const result = await server.manageBreakpoints({
      tabId,
      operation: 'list'
    });
    
    expect(result.breakpoints).toHaveLength(2);
  });
});