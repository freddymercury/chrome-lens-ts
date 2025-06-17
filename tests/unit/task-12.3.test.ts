import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 12.3: Add Security Score Calculation', () => {
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

  test('calculateSecurityScore method exists and is callable', async () => {
    expect(server.calculateSecurityScore).toBeDefined();
    expect(typeof server.calculateSecurityScore).toBe('function');
  });

  test('calculateSecurityScore returns score between 0 and 100', async () => {
    const testChecks = [
      { status: 'pass', severity: 'high' },
      { status: 'fail', severity: 'medium' },
      { status: 'warning', severity: 'low' }
    ];
    
    const score = server.calculateSecurityScore(testChecks);
    
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('calculateSecurityScore gives perfect score for all passing checks', async () => {
    const allPassingChecks = [
      { status: 'pass', severity: 'high' },
      { status: 'pass', severity: 'medium' },
      { status: 'pass', severity: 'low' }
    ];
    
    const score = server.calculateSecurityScore(allPassingChecks);
    
    expect(score).toBe(100);
  });

  test('calculateSecurityScore gives low score for all failing checks', async () => {
    const allFailingChecks = [
      { status: 'fail', severity: 'high' },
      { status: 'fail', severity: 'high' },
      { status: 'fail', severity: 'medium' },
      { status: 'fail', severity: 'low' }
    ];
    
    const score = server.calculateSecurityScore(allFailingChecks);
    
    expect(score).toBeLessThan(50); // Should be significantly low
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('calculateSecurityScore weighs high severity failures more heavily', async () => {
    const highSeverityFail = [
      { status: 'pass', severity: 'low' },
      { status: 'pass', severity: 'low' },
      { status: 'fail', severity: 'high' }
    ];
    
    const lowSeverityFail = [
      { status: 'pass', severity: 'high' },
      { status: 'pass', severity: 'high' },
      { status: 'fail', severity: 'low' }
    ];
    
    const highFailScore = server.calculateSecurityScore(highSeverityFail);
    const lowFailScore = server.calculateSecurityScore(lowSeverityFail);
    
    expect(lowFailScore).toBeGreaterThan(highFailScore);
  });

  test('calculateSecurityScore handles warnings as partial failures', async () => {
    const withWarning = [
      { status: 'pass', severity: 'high' },
      { status: 'warning', severity: 'medium' },
      { status: 'pass', severity: 'low' }
    ];
    
    const withoutWarning = [
      { status: 'pass', severity: 'high' },
      { status: 'pass', severity: 'medium' },
      { status: 'pass', severity: 'low' }
    ];
    
    const warningScore = server.calculateSecurityScore(withWarning);
    const perfectScore = server.calculateSecurityScore(withoutWarning);
    
    expect(warningScore).toBeLessThan(perfectScore);
    expect(warningScore).toBeGreaterThan(50); // Should still be reasonably high
  });

  test('calculateSecurityScore handles empty checks array', async () => {
    const score = server.calculateSecurityScore([]);
    
    expect(score).toBe(0); // No checks means no security score
  });

  test('calculateSecurityScore handles mixed severity levels correctly', async () => {
    const mixedChecks = [
      { status: 'pass', severity: 'critical' },
      { status: 'fail', severity: 'high' },
      { status: 'warning', severity: 'medium' },
      { status: 'pass', severity: 'low' },
      { status: 'fail', severity: 'medium' }
    ];
    
    const score = server.calculateSecurityScore(mixedChecks);
    
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(30); // Should be moderate
    expect(score).toBeLessThan(80); // But not too high due to failures
  });

  test('performSecurityAudit includes security score in results', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'basic' };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'https://example.com',
          protocol: 'https:',
          isSecure: true
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.securityScore).toBeDefined();
    expect(typeof result.audit.results.securityScore).toBe('number');
    expect(result.audit.results.securityScore).toBeGreaterThanOrEqual(0);
    expect(result.audit.results.securityScore).toBeLessThanOrEqual(100);
  });

  test('performSecurityAudit calculates score based on all checks for headers audit', async () => {
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
    
    // Mock auditSecurityHeaders with mixed results
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue({
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          totalResponses: 1,
          headerChecks: [
            { status: 'pass', severity: 'high' },
            { status: 'fail', severity: 'high' },
            { status: 'warning', severity: 'medium' },
            { status: 'pass', severity: 'low' }
          ],
          summary: { totalChecks: 4, passed: 2, failed: 1, warnings: 1 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.securityScore).toBeDefined();
    
    // Score should reflect both basic checks (HTTPS pass) and header checks (mixed)
    const score = result.audit.results.securityScore;
    expect(score).toBeGreaterThan(30); // Not too low due to some passes
    expect(score).toBeLessThan(100); // Not perfect due to failures
  });

  test('performSecurityAudit calculates higher score for secure HTTPS site', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock secure HTTPS site
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'https://secure.example.com',
          protocol: 'https:',
          isSecure: true
        }
      }
    });
    
    const httpsResult = await server.performSecurityAudit({ 
      tabId: validTabId, 
      auditType: 'basic' 
    });
    
    // Mock insecure HTTP site  
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'http://insecure.example.com',
          protocol: 'http:',
          isSecure: false
        }
      }
    });
    
    const httpResult = await server.performSecurityAudit({ 
      tabId: validTabId, 
      auditType: 'basic' 
    });
    
    expect(httpsResult.audit.results.securityScore).toBeGreaterThan(
      httpResult.audit.results.securityScore
    );
    expect(httpsResult.audit.results.securityScore).toBe(100); // Perfect basic score
    expect(httpResult.audit.results.securityScore).toBeLessThan(70); // Penalized for HTTP
  });

  test('calculateSecurityScore handles critical severity appropriately', async () => {
    const criticalFail = [
      { status: 'pass', severity: 'medium' },
      { status: 'fail', severity: 'critical' }
    ];
    
    const highFail = [
      { status: 'pass', severity: 'medium' },
      { status: 'fail', severity: 'high' }
    ];
    
    const criticalScore = server.calculateSecurityScore(criticalFail);
    const highScore = server.calculateSecurityScore(highFail);
    
    expect(criticalScore).toBeLessThan(highScore);
    expect(criticalScore).toBeLessThan(30); // Critical failures should severely impact score
  });

  test('calculateSecurityScore provides reasonable scores for realistic scenarios', async () => {
    // Scenario 1: Well-secured site
    const wellSecured = [
      { status: 'pass', severity: 'high' },     // HTTPS
      { status: 'pass', severity: 'high' },     // HSTS
      { status: 'pass', severity: 'high' },     // CSP
      { status: 'pass', severity: 'medium' },   // X-Content-Type-Options
      { status: 'pass', severity: 'medium' },   // X-Frame-Options
      { status: 'warning', severity: 'low' }    // Minor issue
    ];
    
    // Scenario 2: Moderately secured site
    const moderatelySecured = [
      { status: 'pass', severity: 'high' },     // HTTPS
      { status: 'pass', severity: 'high' },     // HSTS
      { status: 'fail', severity: 'high' },     // Missing CSP
      { status: 'pass', severity: 'medium' },   // X-Content-Type-Options
      { status: 'fail', severity: 'medium' },   // Missing X-Frame-Options
      { status: 'pass', severity: 'low' }       // Some low priority header
    ];
    
    // Scenario 3: Poorly secured site
    const poorlySecured = [
      { status: 'fail', severity: 'high' },     // No HTTPS
      { status: 'fail', severity: 'high' },     // No HSTS
      { status: 'fail', severity: 'high' },     // No CSP
      { status: 'fail', severity: 'medium' },   // No X-Content-Type-Options
      { status: 'fail', severity: 'medium' },   // No X-Frame-Options
      { status: 'fail', severity: 'low' }       // No low priority headers
    ];
    
    const wellSecuredScore = server.calculateSecurityScore(wellSecured);
    const moderateScore = server.calculateSecurityScore(moderatelySecured);
    const poorScore = server.calculateSecurityScore(poorlySecured);
    
    expect(wellSecuredScore).toBeGreaterThan(80);
    expect(moderateScore).toBeGreaterThan(40);
    expect(moderateScore).toBeLessThan(70);
    expect(poorScore).toBeLessThan(30);
    
    expect(wellSecuredScore).toBeGreaterThan(moderateScore);
    expect(moderateScore).toBeGreaterThan(poorScore);
  });

  test('performSecurityAudit includes score breakdown in results', async () => {
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
          headerChecks: [
            { status: 'pass', severity: 'high' },
            { status: 'fail', severity: 'medium' }
          ],
          summary: { totalChecks: 2, passed: 1, failed: 1, warnings: 0 }
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.securityScore).toBeDefined();
    expect(result.audit.results.scoreBreakdown).toBeDefined();
    expect(result.audit.results.scoreBreakdown.totalChecks).toBeGreaterThan(0);
    expect(result.audit.results.scoreBreakdown.maxPossibleScore).toBe(100);
    expect(result.audit.results.scoreBreakdown.actualScore).toBe(result.audit.results.securityScore);
  });
});