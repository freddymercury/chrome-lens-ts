import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 12.1: Implement auditSecurityHeaders Method', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
  });

  afterEach(() => {
    server.clearStorage();
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  test('auditSecurityHeaders method exists and is callable', async () => {
    expect(server.auditSecurityHeaders).toBeDefined();
    expect(typeof server.auditSecurityHeaders).toBe('function');
  });

  test('auditSecurityHeaders validates tabId parameter', async () => {
    const params = { tabId: '' };
    
    await expect(server.auditSecurityHeaders(params)).rejects.toThrow(/Tab ID is required/);
  });

  test('auditSecurityHeaders validates tabId format', async () => {
    const params = { tabId: 'invalid-tab-id' };
    
    await expect(server.auditSecurityHeaders(params)).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('auditSecurityHeaders handles tab with no network logs', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    const result = await server.auditSecurityHeaders(params);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Security headers audit completed');
    expect(result.audit.tabId).toBe(validTabId);
    expect(result.audit.results.totalResponses).toBe(0);
    expect(result.audit.results.headerChecks).toBeDefined();
    expect(Array.isArray(result.audit.results.headerChecks)).toBe(true);
  });

  test('auditSecurityHeaders returns success response structure', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Add some mock network responses
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders(params);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Security headers audit completed');
    expect(result.audit).toBeDefined();
    expect(result.audit.tabId).toBe(validTabId);
    expect(result.audit.results).toBeDefined();
    expect(result.audit.results.totalResponses).toBe(1);
    expect(result.audit.results.headerChecks).toBeDefined();
    expect(result.audit.results.summary).toBeDefined();
  });

  test('auditSecurityHeaders detects missing security headers', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add network response without security headers
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://insecure.example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Server': 'nginx/1.18.0'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.totalResponses).toBe(1);
    
    const headerChecks = result.audit.results.headerChecks;
    expect(headerChecks.length).toBeGreaterThan(0);
    
    // Should find missing security headers
    const missingHeaders = headerChecks.filter((check: any) => check.status === 'fail');
    expect(missingHeaders.length).toBeGreaterThan(0);
    
    // Check for specific missing headers
    const hstsCheck = headerChecks.find((check: any) => check.header === 'Strict-Transport-Security');
    expect(hstsCheck).toBeDefined();
    expect(hstsCheck.status).toBe('fail');
    expect(hstsCheck.message).toContain('missing');
    
    const contentTypeCheck = headerChecks.find((check: any) => check.header === 'X-Content-Type-Options');
    expect(contentTypeCheck).toBeDefined();
    expect(contentTypeCheck.status).toBe('fail');
  });

  test('auditSecurityHeaders detects present security headers', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add network response with security headers
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://secure.example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.totalResponses).toBe(1);
    
    const headerChecks = result.audit.results.headerChecks;
    
    // Should find present security headers
    const presentHeaders = headerChecks.filter((check: any) => check.status === 'pass');
    expect(presentHeaders.length).toBeGreaterThan(0);
    
    // Check for specific present headers
    const hstsCheck = headerChecks.find((check: any) => check.header === 'Strict-Transport-Security');
    expect(hstsCheck).toBeDefined();
    expect(hstsCheck.status).toBe('pass');
    expect(hstsCheck.message).toContain('configured');
    
    const cspCheck = headerChecks.find((check: any) => check.header === 'Content-Security-Policy');
    expect(cspCheck).toBeDefined();
    expect(cspCheck.status).toBe('pass');
  });

  test('auditSecurityHeaders checks multiple response headers', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add multiple network responses with different security headers
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com/page1',
      status: 200,
      headers: {
        'Strict-Transport-Security': 'max-age=31536000',
        'X-Content-Type-Options': 'nosniff'
      },
      timestamp: Date.now() / 1000 - 10
    });
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-2',
      url: 'https://example.com/page2',
      status: 200,
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self'"
      },
      timestamp: Date.now() / 1000 - 5
    });
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-3',
      url: 'https://example.com/api',
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.totalResponses).toBe(3);
    
    const headerChecks = result.audit.results.headerChecks;
    expect(headerChecks.length).toBeGreaterThan(0);
    
    // Should analyze all responses collectively
    expect(result.audit.results.summary.totalChecks).toBeGreaterThan(0);
    expect(result.audit.results.summary.passed).toBeDefined();
    expect(result.audit.results.summary.failed).toBeDefined();
  });

  test('auditSecurityHeaders includes execution timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const startTime = Date.now();
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    const endTime = Date.now();
    
    expect(result.audit.timestamp).toBeDefined();
    const resultTime = new Date(result.audit.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('auditSecurityHeaders checks for critical security headers', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add response with minimal headers
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    const headerChecks = result.audit.results.headerChecks;
    const checkedHeaders = headerChecks.map((check: any) => check.header);
    
    // Should check for critical security headers
    expect(checkedHeaders).toContain('Strict-Transport-Security');
    expect(checkedHeaders).toContain('X-Content-Type-Options');
    expect(checkedHeaders).toContain('X-Frame-Options');
    expect(checkedHeaders).toContain('Content-Security-Policy');
    expect(checkedHeaders).toContain('X-XSS-Protection');
    expect(checkedHeaders).toContain('Referrer-Policy');
  });

  test('auditSecurityHeaders provides severity levels for missing headers', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    const headerChecks = result.audit.results.headerChecks;
    const failedChecks = headerChecks.filter((check: any) => check.status === 'fail');
    
    expect(failedChecks.length).toBeGreaterThan(0);
    
    // Each failed check should have a severity level
    failedChecks.forEach((check: any) => {
      expect(check.severity).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(check.severity);
    });
    
    // CSP and HSTS should be high severity
    const cspCheck = failedChecks.find((check: any) => check.header === 'Content-Security-Policy');
    expect(cspCheck?.severity).toBe('high');
    
    const hstsCheck = failedChecks.find((check: any) => check.header === 'Strict-Transport-Security');
    expect(hstsCheck?.severity).toBe('high');
  });

  test('auditSecurityHeaders handles network errors gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Simulate error by not providing any valid network logs
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.totalResponses).toBe(0);
    expect(result.audit.results.headerChecks).toBeDefined();
    expect(result.message).toContain('no network responses found');
  });

  test('auditSecurityHeaders filters only HTTP responses', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add mix of requests and responses
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'request',
      requestId: 'test-req-1',
      url: 'https://example.com',
      method: 'GET',
      timestamp: Date.now() / 1000 - 10
    });
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Strict-Transport-Security': 'max-age=31536000'
      },
      timestamp: Date.now() / 1000 - 5
    });
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'request',
      requestId: 'test-req-2',
      url: 'https://example.com/api',
      method: 'POST',
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    // Should only count responses, not requests
    expect(result.audit.results.totalResponses).toBe(1);
  });

  test('auditSecurityHeaders analyzes header values for quality', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add response with weak security header values
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'test-req-1',
      url: 'https://example.com',
      status: 200,
      headers: {
        'Strict-Transport-Security': 'max-age=300', // Too short
        'Content-Security-Policy': "default-src 'unsafe-inline' 'unsafe-eval' *", // Too permissive
        'X-Frame-Options': 'ALLOWALL' // Invalid value
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.auditSecurityHeaders({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    const headerChecks = result.audit.results.headerChecks;
    
    // Should analyze header value quality, not just presence
    const hstsCheck = headerChecks.find((check: any) => check.header === 'Strict-Transport-Security');
    expect(hstsCheck).toBeDefined();
    // Should warn about short max-age
    expect(hstsCheck.status === 'warning' || hstsCheck.message.toLowerCase().includes('short')).toBe(true);
    
    const cspCheck = headerChecks.find((check: any) => check.header === 'Content-Security-Policy');
    expect(cspCheck).toBeDefined();
    // Should warn about permissive policy
    expect(cspCheck.status === 'warning' || cspCheck.message.toLowerCase().includes('permissive')).toBe(true);
  });
});