import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 11.3: Implement performSecurityAudit Skeleton', () => {
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

  test('performSecurityAudit method exists and is callable', async () => {
    expect(server.performSecurityAudit).toBeDefined();
    expect(typeof server.performSecurityAudit).toBe('function');
  });

  test('performSecurityAudit validates tabId parameter', async () => {
    const params = { tabId: '' };
    
    await expect(server.performSecurityAudit(params)).rejects.toThrow(/Tab ID is required/);
  });

  test('performSecurityAudit validates tabId format', async () => {
    const params = { tabId: 'invalid-tab-id' };
    
    await expect(server.performSecurityAudit(params)).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('performSecurityAudit validates auditType parameter', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'invalid' };
    
    await expect(server.performSecurityAudit(params)).rejects.toThrow(/Invalid audit type/);
  });

  test('performSecurityAudit validates depth parameter', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, depth: 'invalid' };
    
    await expect(server.performSecurityAudit(params)).rejects.toThrow(/Invalid depth/);
  });

  test('performSecurityAudit handles tab not found error', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    const result = await server.performSecurityAudit(params);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Tab .* not found or not connected/);
    expect(result.audit.error).toBeDefined();
  });

  test('performSecurityAudit calls getPageSecurityInfo', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock getPageSecurityInfo
    const mockPageSecurityInfo = {
      success: true,
      message: 'Page security information retrieved',
      security: {
        tabId: validTabId,
        timestamp: new Date().toISOString(),
        pageInfo: {
          url: 'https://example.com',
          protocol: 'https:',
          isSecure: true,
          hostname: 'example.com'
        }
      }
    };
    
    const getPageSecurityInfoSpy = jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    
    await server.performSecurityAudit(params);
    
    expect(getPageSecurityInfoSpy).toHaveBeenCalledWith({ tabId: validTabId });
    expect(getPageSecurityInfoSpy).toHaveBeenCalledTimes(1);
    
    getPageSecurityInfoSpy.mockRestore();
  });

  test('performSecurityAudit returns success response structure for basic audit', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, auditType: 'basic' };
    
    // Mock getPageSecurityInfo
    const mockPageSecurityInfo = {
      success: true,
      security: {
        tabId: validTabId,
        timestamp: new Date().toISOString(),
        pageInfo: {
          url: 'https://example.com',
          protocol: 'https:',
          isSecure: true,
          hostname: 'example.com'
        }
      }
    };
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Security audit completed');
    expect(result.audit).toBeDefined();
    expect(result.audit.tabId).toBe(validTabId);
    expect(result.audit.auditType).toBe('basic');
    expect(result.audit.results).toBeDefined();
    expect(result.audit.results.pageInfo).toBeDefined();
  });

  test('performSecurityAudit handles getPageSecurityInfo failure', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock getPageSecurityInfo to fail
    const mockPageSecurityInfoFailure = {
      success: false,
      message: 'Failed to get page info',
      security: {
        tabId: validTabId,
        error: { type: 'ConnectionError', message: 'Tab not found' }
      }
    };
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfoFailure);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to perform security audit');
    expect(result.audit.error).toBeDefined();
  });

  test('performSecurityAudit uses default parameters correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
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
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.auditType).toBe('basic'); // default
    expect(result.audit.depth).toBe('medium'); // default
    expect(result.audit.includeRecommendations).toBe(true); // default
  });

  test('performSecurityAudit respects custom parameters', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      auditType: 'comprehensive',
      depth: 'deep',
      includeRecommendations: false
    };
    
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
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue(mockPageSecurityInfo);
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.auditType).toBe('comprehensive');
    expect(result.audit.depth).toBe('deep');
    expect(result.audit.includeRecommendations).toBe(false);
  });

  test('performSecurityAudit includes execution timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: { url: 'https://example.com', isSecure: true }
      }
    });
    
    const startTime = Date.now();
    const result = await server.performSecurityAudit(params);
    const endTime = Date.now();
    
    expect(result.audit.timestamp).toBeDefined();
    const resultTime = new Date(result.audit.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('performSecurityAudit includes basic security checks in results', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock getPageSecurityInfo
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'https://example.com',
          protocol: 'https:',
          isSecure: true,
          hostname: 'example.com'
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results).toBeDefined();
    expect(result.audit.results.pageInfo).toBeDefined();
    expect(result.audit.results.securityChecks).toBeDefined();
    expect(Array.isArray(result.audit.results.securityChecks)).toBe(true);
    
    // Should have at least one basic security check
    expect(result.audit.results.securityChecks.length).toBeGreaterThan(0);
  });

  test('performSecurityAudit performs HTTPS check', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test HTTPS
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
    
    const httpsResult = await server.performSecurityAudit({ tabId: validTabId });
    expect(httpsResult.success).toBe(true);
    
    const httpsCheck = httpsResult.audit.results.securityChecks.find((check: any) => check.name === 'HTTPS Usage');
    expect(httpsCheck).toBeDefined();
    expect(httpsCheck.status).toBe('pass');
    expect(httpsCheck.message).toContain('HTTPS');
    
    // Test HTTP
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'http://example.com',
          protocol: 'http:',
          isSecure: false
        }
      }
    });
    
    const httpResult = await server.performSecurityAudit({ tabId: validTabId });
    expect(httpResult.success).toBe(true);
    
    const httpCheck = httpResult.audit.results.securityChecks.find((check: any) => check.name === 'HTTPS Usage');
    expect(httpCheck).toBeDefined();
    expect(httpCheck.status).toBe('fail');
    expect(httpCheck.message).toContain('HTTP');
  });

  test('performSecurityAudit includes recommendations when enabled', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, includeRecommendations: true };
    
    jest.spyOn(server, 'getPageSecurityInfo').mockResolvedValue({
      success: true,
      security: {
        tabId: validTabId,
        pageInfo: {
          url: 'http://example.com',
          protocol: 'http:',
          isSecure: false
        }
      }
    });
    
    const result = await server.performSecurityAudit(params);
    
    expect(result.success).toBe(true);
    expect(result.audit.results.recommendations).toBeDefined();
    expect(Array.isArray(result.audit.results.recommendations)).toBe(true);
    expect(result.audit.results.recommendations.length).toBeGreaterThan(0);
  });

  test('performSecurityAudit omits recommendations when disabled', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, includeRecommendations: false };
    
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
    expect(result.audit.results.recommendations).toBeUndefined();
  });

  test('performSecurityAudit handles network errors gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    jest.spyOn(server, 'getPageSecurityInfo').mockRejectedValue(new Error('Network timeout'));
    
    const result = await server.performSecurityAudit({ tabId: validTabId });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to perform security audit');
    expect(result.audit.error.message).toContain('Network timeout');
  });
});