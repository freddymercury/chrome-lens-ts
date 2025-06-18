import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.ERROR_ANALYSIS_ENABLED = 'true';
process.env.MAX_ERROR_STACK_DEPTH = '10';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 19.2: Error Analysis Engine', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Runtime: {
        enable: jest.fn(() => Promise.resolve({})),
        evaluate: jest.fn(),
        getProperties: jest.fn(),
        getExceptionDetails: jest.fn()
      },
      Debugger: {
        enable: jest.fn(() => Promise.resolve({})),
        getScriptSource: jest.fn(),
        getPossibleBreakpoints: jest.fn()
      },
      Log: {
        enable: jest.fn(() => Promise.resolve({})),
        clear: jest.fn(() => Promise.resolve({}))
      },
      Network: {
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

  test('should analyze runtime errors from stored error collection', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add some runtime errors to storage
    const errors = [
      {
        timestamp: new Date().toISOString(),
        type: 'runtime',
        message: 'Cannot read property \'foo\' of undefined',
        url: 'http://example.com/app.js',
        lineNumber: 42,
        columnNumber: 15,
        stack: 'TypeError: Cannot read property \'foo\' of undefined\\n    at test (app.js:42:15)',
        errorId: 'err-1'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        type: 'runtime',
        message: 'x is not defined',
        url: 'http://example.com/lib.js',
        lineNumber: 10,
        columnNumber: 5,
        stack: 'ReferenceError: x is not defined\\n    at eval (lib.js:10:5)',
        errorId: 'err-2'
      }
    ];
    
    errors.forEach(err => server.addStorageEntry('errors', tabId, err));
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'runtime',
      includeStackTrace: true,
      timeRange: 300 // 5 minutes
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors).toHaveLength(2);
    expect(result.errorAnalysis.errors[0].message).toContain('Cannot read property');
    expect(result.errorAnalysis.errors[0].stack).toBeDefined();
    expect(result.errorAnalysis.summary.totalErrors).toBe(2);
    expect(result.errorAnalysis.summary.byType.runtime).toBe(2);
  });

  test('should analyze syntax errors', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add syntax error
    const syntaxError = {
      timestamp: new Date().toISOString(),
      type: 'syntax',
      message: 'Unexpected token }',
      url: 'http://example.com/broken.js',
      lineNumber: 25,
      columnNumber: 1,
      errorId: 'syn-1'
    };
    
    server.addStorageEntry('errors', tabId, syntaxError);
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'syntax',
      includeSourceContext: false
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors).toHaveLength(1);
    expect(result.errorAnalysis.errors[0].type).toBe('syntax');
    expect(result.errorAnalysis.summary.byType.syntax).toBe(1);
  });

  test('should analyze network errors', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add network errors from stored network logs
    const networkErrors = [
      {
        timestamp: new Date().toISOString(),
        type: 'network',
        requestId: 'req-1',
        url: 'http://example.com/api/data',
        method: 'GET',
        status: 404,
        statusText: 'Not Found',
        errorText: 'Failed to load resource',
        timing: { requestTime: Date.now() / 1000 }
      },
      {
        timestamp: new Date().toISOString(),
        type: 'network',
        requestId: 'req-2',
        url: 'http://example.com/api/auth',
        method: 'POST',
        status: 500,
        statusText: 'Internal Server Error',
        errorText: 'Server error',
        timing: { requestTime: Date.now() / 1000 }
      }
    ];
    
    // Store as network logs
    networkErrors.forEach(err => server.addStorageEntry('networkLogs', tabId, err));
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'network'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors).toHaveLength(2);
    expect(result.errorAnalysis.errors[0].status).toBe(404);
    expect(result.errorAnalysis.errors[1].status).toBe(500);
    expect(result.errorAnalysis.summary.byType.network).toBe(2);
  });

  test('should analyze security errors (CSP/CORS)', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add security violations
    const securityErrors = [
      {
        timestamp: new Date().toISOString(),
        type: 'security',
        message: 'Refused to load script from \'http://evil.com/script.js\' because it violates CSP',
        violationType: 'CSP',
        url: 'http://example.com/',
        directive: 'script-src',
        errorId: 'sec-1'
      },
      {
        timestamp: new Date().toISOString(),
        type: 'security',
        message: 'CORS policy blocked request',
        violationType: 'CORS',
        url: 'http://example.com/api',
        blockedURL: 'http://other-domain.com/data',
        errorId: 'sec-2'
      }
    ];
    
    securityErrors.forEach(err => server.addStorageEntry('errors', tabId, err));
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'security'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors).toHaveLength(2);
    expect(result.errorAnalysis.errors[0].violationType).toBe('CSP');
    expect(result.errorAnalysis.errors[1].violationType).toBe('CORS');
    expect(result.errorAnalysis.summary.byType.security).toBe(2);
  });

  test('should analyze all error types when errorType is "all"', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add various error types
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date().toISOString(),
      type: 'runtime',
      message: 'Runtime error',
      errorId: 'rt-1'
    });
    
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date().toISOString(),
      type: 'syntax',
      message: 'Syntax error',
      errorId: 'syn-1'
    });
    
    server.addStorageEntry('networkLogs', tabId, {
      timestamp: new Date().toISOString(),
      type: 'network',
      status: 404,
      url: 'http://example.com/missing',
      errorText: 'Not Found'
    });
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'all'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errorAnalysis.summary.totalErrors).toBeGreaterThanOrEqual(3);
  });

  test('should include source context when requested', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add error with script information
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date().toISOString(),
      type: 'runtime',
      message: 'Test error',
      url: 'http://example.com/app.js',
      lineNumber: 10,
      columnNumber: 5,
      scriptId: 'script-123',
      errorId: 'err-ctx'
    });
    
    // Mock script source
    mockClient.Debugger.getScriptSource.mockResolvedValue({
      scriptSource: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nconst x = error;\nline11\nline12'
    });
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'runtime',
      includeSourceContext: true
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors[0].sourceContext).toBeDefined();
    expect(result.errorAnalysis.errors[0].sourceContext.lines).toContain('const x = error;');
  });

  test('should respect timeRange parameter', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const now = Date.now();
    
    // Add errors at different times
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date(now - 100000).toISOString(), // 100 seconds ago
      type: 'runtime',
      message: 'Recent error',
      errorId: 'recent'
    });
    
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date(now - 400000).toISOString(), // 400 seconds ago
      type: 'runtime',
      message: 'Old error',
      errorId: 'old'
    });
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'all',
      timeRange: 300 // Only last 5 minutes
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errors).toHaveLength(1);
    expect(result.errorAnalysis.errors[0].errorId).toBe('recent');
  });

  test('should group similar errors', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add multiple similar errors
    for (let i = 0; i < 5; i++) {
      server.addStorageEntry('errors', tabId, {
        timestamp: new Date().toISOString(),
        type: 'runtime',
        message: 'Cannot read property \'foo\' of undefined',
        url: 'http://example.com/app.js',
        lineNumber: 42,
        columnNumber: 15,
        errorId: `err-${i}`
      });
    }
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'runtime'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.errorGroups).toBeDefined();
    expect(result.errorAnalysis.errorGroups[0].count).toBe(5);
    expect(result.errorAnalysis.errorGroups[0].message).toContain('Cannot read property');
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'all'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should provide error patterns and recommendations', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Add common error patterns
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date().toISOString(),
      type: 'runtime',
      message: 'Cannot read property \'length\' of undefined',
      errorId: 'null-1'
    });
    
    server.addStorageEntry('errors', tabId, {
      timestamp: new Date().toISOString(),
      type: 'runtime',
      message: 'Cannot read property \'map\' of undefined',
      errorId: 'null-2'
    });
    
    const result = await server.analyzeErrors({
      tabId,
      errorType: 'runtime'
    });
    
    expect(result.success).toBe(true);
    expect(result.errorAnalysis.patterns).toBeDefined();
    expect(result.errorAnalysis.patterns).toContain('null-reference');
    expect(result.errorAnalysis.recommendations).toBeDefined();
    expect(result.errorAnalysis.recommendations.length).toBeGreaterThan(0);
  });
});