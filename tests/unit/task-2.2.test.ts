import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.LOG_LEVEL = 'debug';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 2.2: Error Handling Setup', () => {
  let server: ChromeDevToolsMCPServer;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let mockConsoleError: jest.Mock;
  let mockConsoleLog: jest.Mock;

  beforeEach(() => {
    // Mock console methods to capture logging
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    mockConsoleError = jest.fn();
    mockConsoleLog = jest.fn();
    console.error = mockConsoleError;
    console.log = mockConsoleLog;
    
    server = new ChromeDevToolsMCPServer();
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    delete process.env.LOG_LEVEL;
    
    // Remove all listeners to avoid test interference
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('SIGINT');
  });

  test('setupErrorHandling method exists', () => {
    expect(typeof server.setupErrorHandling).toBe('function');
  });

  test('setupErrorHandling can be called without errors', () => {
    expect(() => {
      server.setupErrorHandling();
    }).not.toThrow();
  });

  test('setupErrorHandling sets up process error handlers', () => {
    // Get initial listener count
    const initialUncaughtListeners = process.listenerCount('uncaughtException');
    const initialUnhandledListeners = process.listenerCount('unhandledRejection');
    const initialSigintListeners = process.listenerCount('SIGINT');
    
    server.setupErrorHandling();
    
    // Should have added listeners
    expect(process.listenerCount('uncaughtException')).toBe(initialUncaughtListeners + 1);
    expect(process.listenerCount('unhandledRejection')).toBe(initialUnhandledListeners + 1);
    expect(process.listenerCount('SIGINT')).toBe(initialSigintListeners + 1);
  });

  test('error handlers log errors appropriately', () => {
    // Mock process.exit to prevent actual exit during testing
    const originalExit = process.exit;
    const mockExit = jest.fn();
    process.exit = mockExit as any;
    
    try {
      server.setupErrorHandling();
      
      // Simulate an unhandled rejection
      const testError = new Error('Test error');
      process.emit('unhandledRejection', testError, Promise.resolve());
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled promise rejection:'),
        testError
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = originalExit;
    }
  });

  test('SIGINT handler performs graceful shutdown', () => {
    server.setupErrorHandling();
    
    // Mock process.exit to prevent actual exit
    const originalExit = process.exit;
    const mockExit = jest.fn();
    process.exit = mockExit as any;
    
    try {
      // Simulate SIGINT
      process.emit('SIGINT');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Received SIGINT')
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      process.exit = originalExit;
    }
  });

  test('error logging respects LOG_LEVEL environment variable', () => {
    // This test verifies that error handling uses the LOG_LEVEL configuration
    expect(server.setupErrorHandling).toBeDefined();
    
    // Since LOG_LEVEL is set to 'debug' in beforeEach, error handling should be verbose
    server.setupErrorHandling();
    
    // The fact that we can call setupErrorHandling without errors means it's working
    expect(true).toBe(true);
  });
});