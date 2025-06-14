import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 12.2: Add Security Header Check to Main Audit', () => {
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

  test('performSecurityAudit calls auditSecurityHeaders for headers audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'headers' };
    
    // Mock getPageSecurityInfo
    const mockPageSecurityInfo = {
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'https://example.com',
          protocol: 'https:',
          isSecure: true
        }
      }
    };
    
    // Mock auditSecurityHeaders
    const mockHeadersAudit = {
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 1,
          headerChecks: [
            {
              header: 'Strict-Transport-Security',
              status: 'pass',
              message: 'Header configured properly'
            }
          ],
          summary: {
            totalChecks: 6,
            passed: 1,
            failed: 5,
            warnings: 0
          }
        }
      }
    };
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    const auditSecurityHeadersSpy = jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue(mockHeadersAudit);
    
    const result = await server.performSecurityAudit(params);
    
    expect(auditSecurityHeadersSpy).toHaveBeenCalledWith({ tabId: validTabId });
    expect(auditSecurityHeadersSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.audit.auditType).toBe('headers');
    
    auditSecurityHeadersSpy.mockRestore();
  });

  test('performSecurityAudit includes header audit results for headers audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'headers' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'https://example.com',
          isSecure: true
        }
      }
    });
    
    // Mock auditSecurityHeaders
    const mockHeadersAudit = {
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 2,
          headerChecks: [
            {
              header: 'Strict-Transport-Security',
              status: 'pass',
              severity: 'high',
              message: 'HSTS properly configured'
            },
            {
              header: 'Content-Security-Policy',
              status: 'fail',
              severity: 'high',
              message: 'CSP header missing'
            }
          ],
          summary: {
            totalChecks: 6,
            passed: 1,
            failed: 5,
            warnings: 0
          }
        }
      }
    };
    
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue(mockHeadersAudit);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.headerAudit).toBeDefined();
    expect(result.audit.results.headerAudit.totalResponses).toBe(2);
    expect(result.audit.results.headerAudit.headerChecks).toBeDefined();
    expect(result.audit.results.headerAudit.headerChecks.length).toBe(2);
    expect(result.audit.results.headerAudit.summary).toBeDefined();
    expect(result.audit.results.headerAudit.summary.totalChecks).toBe(6);
  });

  test('performSecurityAudit calls auditSecurityHeaders for comprehensive audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'comprehensive' };
    
    // Mock dependencies
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    const auditSecurityHeadersSpy = jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 1,
          headerChecks: [],
          summary: { totalChecks: 6, passed: 0, failed: 6, warnings: 0 }
        }
      }
    });
    
    await server.performSecurityAudit(params);
    
    expect(auditSecurityHeadersSpy).toHaveBeenCalledWith({ tabId: validTabId });
    expect(auditSecurityHeadersSpy).toHaveBeenCalledTimes(1);
    
    auditSecurityHeadersSpy.mockRestore();
  });

  test('performSecurityAudit does not call auditSecurityHeaders for basic audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'basic' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    const auditSecurityHeadersSpy = jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: { tabId: validTabId, results: {} }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(auditSecurityHeadersSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.audit.results.headerAudit).toBeUndefined();
    
    auditSecurityHeadersSpy.mockRestore();
  });

  test('performSecurityAudit handles auditSecurityHeaders failure gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'headers' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    // Mock auditSecurityHeaders to fail
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: false,
      message: 'Failed to audit headers',
      audit: {
        tabId: validTabId,
        error: { type: 'AuditError', message: 'Network error' }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true); // Main audit should still succeed
    expect(result.audit.results.headerAudit).toBeDefined();
    expect(result.audit.results.headerAudit.error).toBeDefined();
    expect(result.audit.results.headerAudit.error.message).toBe('Network error');
  });

  test('performSecurityAudit integrates header audit recommendations', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      auditType: 'headers',
      includeRecommendations: true 
    };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'http://example.com', isSecure: false }
      }
    });
    
    // Mock auditSecurityHeaders with failed checks
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 1,
          headerChecks: [
            {
              header: 'Strict-Transport-Security',
              status: 'fail',
              severity: 'high',
              message: 'HSTS header missing'
            },
            {
              header: 'Content-Security-Policy',
              status: 'fail',
              severity: 'high',
              message: 'CSP header missing'
            }
          ],
          summary: { totalChecks: 6, passed: 0, failed: 6, warnings: 0 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.recommendations).toBeDefined();
    expect(result.audit.results.recommendations.length).toBeGreaterThan(0);
    
    // Should include header-specific recommendations
    const headerRecommendations = result.audit.results.recommendations.filter((rec: any) => 
      rec.category === 'headers' || rec.title.toLowerCase().includes('header')
    );
    expect(headerRecommendations.length).toBeGreaterThan(0);
  });

  test('performSecurityAudit updates summary with header audit results', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'comprehensive' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    // Mock auditSecurityHeaders
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 1,
          headerChecks: [
            { status: 'pass' },
            { status: 'pass' },
            { status: 'fail' },
            { status: 'fail' },
            { status: 'warning' }
          ],
          summary: { totalChecks: 5, passed: 2, failed: 2, warnings: 1 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.summary).toBeDefined();
    
    // Summary should include both basic checks (HTTPS) and header checks
    expect(result.audit.results.summary.totalChecks).toBeGreaterThan(5); // Base + header checks
    expect(result.audit.results.summary.passed).toBeGreaterThan(2); // HTTPS pass + header passes
    expect(result.audit.results.summary.failed).toBeGreaterThanOrEqual(2); // Header failures
    expect(result.audit.results.summary.warnings).toBeGreaterThanOrEqual(1); // Header warnings
  });

  test('performSecurityAudit works with real header audit integration', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a mock client for page security info
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://secure.example.com',
              protocol: 'https:',
              isSecure: true,
              hostname: 'secure.example.com'
            }
          },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    // Add network responses with mixed security headers
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'req-1',
      url: 'https://secure.example.com',
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff'
      },
      timestamp: Date.now() / 1000
    });
    
    server.addStorageEntry('networkLogs', validTabId, {
      type: 'response',
      requestId: 'req-2',
      url: 'https://secure.example.com/api',
      status: 200,
      headers: {
        'Content-Type': 'application/json'
        // Missing security headers
      },
      timestamp: Date.now() / 1000
    });
    
    const result = await server.performSecurityAudit({ 
      tabId: validTabId, 
      auditType: 'headers',
      includeRecommendations: true
    });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.pageInfo.isSecure).toBe(true);
    expect(result.audit.results.headerAudit).toBeDefined();
    expect(result.audit.results.headerAudit.totalResponses).toBe(2);
    expect(result.audit.results.headerAudit.headerChecks.length).toBe(6); // All security headers checked
    
    // Should have mixed results
    const headerChecks = result.audit.results.headerAudit.headerChecks;
    const passedHeaders = headerChecks.filter((check: any) => check.status === 'pass');
    const failedHeaders = headerChecks.filter((check: any) => check.status === 'fail');
    
    expect(passedHeaders.length).toBeGreaterThan(0);
    expect(failedHeaders.length).toBeGreaterThan(0);
    
    // Should include recommendations for missing headers
    expect(result.audit.results.recommendations).toBeDefined();
    expect(result.audit.results.recommendations.length).toBeGreaterThan(0);
  });

  test('performSecurityAudit does not call auditSecurityHeaders for xss audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'xss' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    const auditSecurityHeadersSpy = jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: { tabId: validTabId, results: {} }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(auditSecurityHeadersSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.audit.results.headerAudit).toBeUndefined();
    
    auditSecurityHeadersSpy.mockRestore();
  });
});