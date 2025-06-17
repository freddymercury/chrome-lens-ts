import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 13.2: Add XSS Check to Main Audit', () => {
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

  test('performSecurityAudit calls checkXSSVulnerabilities for xss audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'xss' };
    
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
    
    // Mock checkXSSVulnerabilities
    const mockXSSAudit = {
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            {
              type: 'inline-scripts',
              status: 'pass',
              severity: 'high',
              message: 'No inline scripts detected',
              count: 0
            }
          ],
          summary: {
            totalChecks: 4,
            totalVulnerabilities: 0,
            highRisk: 0,
            mediumRisk: 0,
            lowRisk: 0,
            warnings: 0,
            passed: 4
          }
        }
      }
    };
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    const checkXSSVulnerabilitiesSpy = jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue(mockXSSAudit);
    
    const result = await server.performSecurityAudit(params);
    
    expect(checkXSSVulnerabilitiesSpy).toHaveBeenCalledWith({ tabId: validTabId });
    expect(checkXSSVulnerabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.audit.auditType).toBe('xss');
    
    checkXSSVulnerabilitiesSpy.mockRestore();
  });

  test('performSecurityAudit includes XSS audit results for xss audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'xss' };
    
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
    
    // Mock checkXSSVulnerabilities
    const mockXSSAudit = {
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            {
              type: 'inline-scripts',
              status: 'fail',
              severity: 'high',
              message: 'Found 3 inline script(s) which can be exploited for XSS attacks',
              count: 3
            },
            {
              type: 'missing-csp',
              status: 'fail',
              severity: 'high',
              message: 'Content Security Policy (CSP) is not configured',
              count: 1
            }
          ],
          summary: {
            totalChecks: 4,
            totalVulnerabilities: 2,
            highRisk: 2,
            mediumRisk: 0,
            lowRisk: 0,
            warnings: 0,
            passed: 2
          }
        }
      }
    };
    
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue(mockXSSAudit);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.xssAudit).toBeDefined();
    expect(result.audit.results.xssAudit.vulnerabilities).toBeDefined();
    expect(result.audit.results.xssAudit.vulnerabilities.length).toBe(2);
    expect(result.audit.results.xssAudit.summary).toBeDefined();
    expect(result.audit.results.xssAudit.summary.totalVulnerabilities).toBe(2);
  });

  test('performSecurityAudit calls checkXSSVulnerabilities for comprehensive audit type', async () => {
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
    
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
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
    
    const checkXSSVulnerabilitiesSpy = jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [],
          summary: { totalChecks: 4, totalVulnerabilities: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, warnings: 0, passed: 4 }
        }
      }
    });
    
    await server.performSecurityAudit(params);
    
    expect(checkXSSVulnerabilitiesSpy).toHaveBeenCalledWith({ tabId: validTabId });
    expect(checkXSSVulnerabilitiesSpy).toHaveBeenCalledTimes(1);
    
    checkXSSVulnerabilitiesSpy.mockRestore();
  });

  test('performSecurityAudit does not call checkXSSVulnerabilities for basic audit type', async () => {
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
    
    const checkXSSVulnerabilitiesSpy = jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: { tabId: validTabId, results: {} }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(checkXSSVulnerabilitiesSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.audit.results.xssAudit).toBeUndefined();
    
    checkXSSVulnerabilitiesSpy.mockRestore();
  });

  test('performSecurityAudit does not call checkXSSVulnerabilities for headers audit type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'headers' };
    
    // Mock dependencies
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
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
    
    const checkXSSVulnerabilitiesSpy = jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: { tabId: validTabId, results: {} }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(checkXSSVulnerabilitiesSpy).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.audit.results.xssAudit).toBeUndefined();
    
    checkXSSVulnerabilitiesSpy.mockRestore();
  });

  test('performSecurityAudit handles checkXSSVulnerabilities failure gracefully', async () => {
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
    
    // Mock checkXSSVulnerabilities to fail
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: false,
      message: 'Failed to check XSS vulnerabilities',
      xss: {
        tabId: validTabId,
        error: { type: 'SecurityError', message: 'Blocked by CSP' }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true); // Main audit should still succeed
    expect(result.audit.results.xssAudit).toBeDefined();
    expect(result.audit.results.xssAudit.error).toBeDefined();
    expect(result.audit.results.xssAudit.error.message).toBe('Blocked by CSP');
  });

  test('performSecurityAudit integrates XSS audit into security score calculation', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      auditType: 'xss'
    };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'http://example.com', isSecure: false }
      }
    });
    
    // Mock checkXSSVulnerabilities with failed checks
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            {
              type: 'inline-scripts',
              status: 'fail',
              severity: 'high',
              message: 'Found 2 inline script(s)',
              count: 2
            },
            {
              type: 'missing-csp',
              status: 'fail',
              severity: 'high',
              message: 'CSP not configured',
              count: 1
            }
          ],
          summary: { totalChecks: 4, totalVulnerabilities: 2, highRisk: 2, mediumRisk: 0, lowRisk: 0, warnings: 0, passed: 2 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.securityScore).toBeDefined();
    expect(result.audit.results.securityScore).toBeLessThan(100); // Score should be reduced by XSS issues
  });

  test('performSecurityAudit updates summary with XSS audit results', async () => {
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
            { status: 'fail' }
          ],
          summary: { totalChecks: 2, passed: 1, failed: 1, warnings: 0 }
        }
      }
    });
    
    // Mock checkXSSVulnerabilities
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            { status: 'pass' },
            { status: 'pass' },
            { status: 'fail' },
            { status: 'warning' }
          ],
          summary: { totalChecks: 4, totalVulnerabilities: 1, highRisk: 0, mediumRisk: 1, lowRisk: 0, warnings: 1, passed: 2 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.summary).toBeDefined();
    
    // Summary should include basic checks (HTTPS) + header checks + XSS checks
    expect(result.audit.results.summary.totalChecks).toBeGreaterThan(6); // Base + header + XSS checks
    expect(result.audit.results.summary.passed).toBeGreaterThan(3); // HTTPS pass + header passes + XSS passes
    expect(result.audit.results.summary.failed).toBeGreaterThanOrEqual(2); // Header failures + XSS failures
    expect(result.audit.results.summary.warnings).toBeGreaterThanOrEqual(1); // XSS warnings
  });

  test('performSecurityAudit works with real XSS audit integration', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a mock client for both page security info and XSS checks
    const mockClient = {
      Runtime: {
        evaluate: jest.fn()
          // First call for getPageSecurityInfo
          .mockResolvedValueOnce({
            result: {
              type: 'object',
              value: {
                url: 'https://vulnerable.example.com',
                protocol: 'https:',
                isSecure: true,
                hostname: 'vulnerable.example.com'
              }
            },
            exceptionDetails: undefined
          })
          // Second call for checkXSSVulnerabilities
          .mockResolvedValueOnce({
            result: {
              type: 'object',
              value: {
                inlineScripts: 2,
                inlineEventHandlers: 1,
                unsafeInlineStyles: 1,
                externalScripts: 3,
                vulnerablePatterns: [
                  { type: 'inline-script', location: 'line 25', content: 'eval(userInput)' }
                ],
                cspStatus: {
                  present: false,
                  restrictive: false,
                  allowsUnsafeInline: true
                }
              }
            },
            exceptionDetails: undefined
          })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.performSecurityAudit({ 
      tabId: validTabId, 
      auditType: 'xss'
    });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.pageInfo.isSecure).toBe(true);
    expect(result.audit.results.xssAudit).toBeDefined();
    expect(result.audit.results.xssAudit.vulnerabilities.length).toBeGreaterThan(0);
    
    // Should have XSS vulnerabilities detected
    const xssVulns = result.audit.results.xssAudit.vulnerabilities;
    const failedVulns = xssVulns.filter((vuln: any) => vuln.status === 'fail');
    
    expect(failedVulns.length).toBeGreaterThan(0);
    expect(result.audit.results.xssAudit.summary.totalVulnerabilities).toBeGreaterThan(0);
    
    // Should include inline scripts and missing CSP vulnerabilities
    const inlineScriptVuln = failedVulns.find((vuln: any) => vuln.type === 'inline-scripts');
    const missingCSPVuln = failedVulns.find((vuln: any) => vuln.type === 'missing-csp');
    
    expect(inlineScriptVuln).toBeDefined();
    expect(missingCSPVuln).toBeDefined();
    
    // Security score should be reduced due to vulnerabilities
    expect(result.audit.results.securityScore).toBeLessThan(100);
  });
});