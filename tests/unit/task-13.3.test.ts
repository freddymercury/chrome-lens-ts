import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 13.3: Add check_vulnerabilities Tool Definition', () => {
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

  test('check_vulnerabilities tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const checkVulnTool = tools.find((tool: any) => tool.name === 'check_vulnerabilities');
    
    expect(checkVulnTool).toBeDefined();
    expect(checkVulnTool.name).toBe('check_vulnerabilities');
    expect(checkVulnTool.description).toBeDefined();
    expect(checkVulnTool.description.length).toBeGreaterThan(0);
  });

  test('check_vulnerabilities tool has correct input schema', async () => {
    const tools = await server.listTools();
    const checkVulnTool = tools.find((tool: any) => tool.name === 'check_vulnerabilities');
    
    expect(checkVulnTool.inputSchema).toBeDefined();
    expect(checkVulnTool.inputSchema.type).toBe('object');
    expect(checkVulnTool.inputSchema.properties).toBeDefined();
    
    // Should have tabId property
    expect(checkVulnTool.inputSchema.properties.tabId).toBeDefined();
    expect(checkVulnTool.inputSchema.properties.tabId.type).toBe('string');
    expect(checkVulnTool.inputSchema.properties.tabId.description).toBeDefined();
    
    // Should have vulnerabilityType property
    expect(checkVulnTool.inputSchema.properties.vulnerabilityType).toBeDefined();
    expect(checkVulnTool.inputSchema.properties.vulnerabilityType.type).toBe('string');
    expect(checkVulnTool.inputSchema.properties.vulnerabilityType.enum).toBeDefined();
    expect(checkVulnTool.inputSchema.properties.vulnerabilityType.enum).toContain('xss');
    expect(checkVulnTool.inputSchema.properties.vulnerabilityType.enum).toContain('headers');
    
    // Should have required fields
    expect(checkVulnTool.inputSchema.required).toBeDefined();
    expect(checkVulnTool.inputSchema.required).toContain('tabId');
    expect(checkVulnTool.inputSchema.required).toContain('vulnerabilityType');
  });

  test('check_vulnerabilities tool supports optional parameters', async () => {
    const tools = await server.listTools();
    const checkVulnTool = tools.find((tool: any) => tool.name === 'check_vulnerabilities');
    
    // Should have optional severity filter
    expect(checkVulnTool.inputSchema.properties.severityFilter).toBeDefined();
    expect(checkVulnTool.inputSchema.properties.severityFilter.type).toBe('string');
    expect(checkVulnTool.inputSchema.properties.severityFilter.enum).toContain('critical');
    expect(checkVulnTool.inputSchema.properties.severityFilter.enum).toContain('high');
    expect(checkVulnTool.inputSchema.properties.severityFilter.enum).toContain('medium');
    expect(checkVulnTool.inputSchema.properties.severityFilter.enum).toContain('low');
    
    // Should have optional includeRecommendations
    expect(checkVulnTool.inputSchema.properties.includeRecommendations).toBeDefined();
    expect(checkVulnTool.inputSchema.properties.includeRecommendations.type).toBe('boolean');
    
    // Optional fields should not be in required array
    expect(checkVulnTool.inputSchema.required).not.toContain('severityFilter');
    expect(checkVulnTool.inputSchema.required).not.toContain('includeRecommendations');
  });

  test('callTool handles check_vulnerabilities for XSS vulnerability type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities
    const mockXSSResult = {
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
          summary: { totalChecks: 4, totalVulnerabilities: 2, highRisk: 2, mediumRisk: 0 }
        }
      }
    };
    
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue(mockXSSResult);
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss'
    });
    
    expect(result.success).toBe(true);
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities.tabId).toBe(validTabId);
    expect(result.vulnerabilities.type).toBe('xss');
    expect(result.vulnerabilities.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities.vulnerabilities.length).toBe(2);
  });

  test('callTool handles check_vulnerabilities for headers vulnerability type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock auditSecurityHeaders
    const mockHeadersResult = {
      success: true,
      audit: {
        tabId: validTabId,
        results: {
          headerChecks: [
            {
              header: 'Content-Security-Policy',
              status: 'fail',
              severity: 'high',
              message: 'CSP header missing'
            },
            {
              header: 'Strict-Transport-Security',
              status: 'pass',
              severity: 'high',
              message: 'HSTS properly configured'
            }
          ],
          summary: { totalChecks: 6, passed: 1, failed: 5, warnings: 0 }
        }
      }
    };
    
    jest.spyOn(server, 'auditSecurityHeaders').mockResolvedValue(mockHeadersResult);
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'headers'
    });
    
    expect(result.success).toBe(true);
    expect(result.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities.tabId).toBe(validTabId);
    expect(result.vulnerabilities.type).toBe('headers');
    expect(result.vulnerabilities.vulnerabilities).toBeDefined();
    expect(result.vulnerabilities.vulnerabilities.length).toBeGreaterThan(0);
  });

  test('callTool applies severity filter to vulnerability results', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities with mixed severity results
    const mockXSSResult = {
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            {
              type: 'inline-scripts',
              status: 'fail',
              severity: 'high',
              message: 'High severity issue',
              count: 2
            },
            {
              type: 'inline-event-handlers',
              status: 'fail',
              severity: 'medium',
              message: 'Medium severity issue',
              count: 1
            },
            {
              type: 'inline-styles',
              status: 'warning',
              severity: 'low',
              message: 'Low severity issue',
              count: 3
            }
          ],
          summary: { totalChecks: 4, totalVulnerabilities: 2, highRisk: 1, mediumRisk: 1 }
        }
      }
    };
    
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue(mockXSSResult);
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss',
      severityFilter: 'high'
    });
    
    expect(result.success).toBe(true);
    expect(result.vulnerabilities.vulnerabilities.length).toBe(1);
    expect(result.vulnerabilities.vulnerabilities[0].severity).toBe('high');
  });

  test('callTool includes recommendations when requested', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities
    const mockXSSResult = {
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            {
              type: 'inline-scripts',
              status: 'fail',
              severity: 'high',
              message: 'Found inline scripts',
              count: 2,
              recommendation: 'Move JavaScript to external files'
            }
          ],
          summary: { totalChecks: 4, totalVulnerabilities: 1, highRisk: 1 }
        }
      }
    };
    
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue(mockXSSResult);
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss',
      includeRecommendations: true
    });
    
    expect(result.success).toBe(true);
    expect(result.vulnerabilities.recommendations).toBeDefined();
    expect(result.vulnerabilities.recommendations.length).toBeGreaterThan(0);
    expect(result.vulnerabilities.vulnerabilities[0].recommendation).toBeDefined();
  });

  test('callTool handles invalid vulnerability type', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    await expect(server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'invalid-type'
    })).rejects.toThrow(/Invalid vulnerability type/);
  });

  test('callTool handles missing required parameters', async () => {
    await expect(server.callTool('check_vulnerabilities', {
      vulnerabilityType: 'xss'
    })).rejects.toThrow(/Tab ID is required/);
    
    await expect(server.callTool('check_vulnerabilities', {
      tabId: 'A1B2C3D4E5F6789012345678901234AB'
    })).rejects.toThrow(/Vulnerability type is required/);
  });

  test('callTool handles underlying method failures gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities to fail
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: false,
      message: 'Failed to check XSS vulnerabilities',
      xss: {
        tabId: validTabId,
        error: { type: 'SecurityError', message: 'Blocked by CSP' }
      }
    });
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss'
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to check xss vulnerabilities');
    expect(result.vulnerabilities.error).toBeDefined();
  });

  test('check_vulnerabilities tool execution includes timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [],
          summary: { totalChecks: 4, totalVulnerabilities: 0, highRisk: 0 }
        }
      }
    });
    
    const startTime = Date.now();
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss'
    });
    const endTime = Date.now();
    
    expect(result.vulnerabilities.timestamp).toBeDefined();
    const resultTime = new Date(result.vulnerabilities.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('check_vulnerabilities supports all vulnerability types from schema', async () => {
    const tools = await server.listTools();
    const checkVulnTool = tools.find((tool: any) => tool.name === 'check_vulnerabilities');
    const supportedTypes = checkVulnTool.inputSchema.properties.vulnerabilityType.enum;
    
    expect(supportedTypes).toContain('xss');
    expect(supportedTypes).toContain('headers');
    // Future vulnerability types can be added here
    expect(supportedTypes.length).toBeGreaterThanOrEqual(2);
  });

  test('check_vulnerabilities provides summary statistics', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock checkXSSVulnerabilities
    jest.spyOn(server, 'checkXSSVulnerabilities').mockResolvedValue({
      success: true,
      xss: {
        tabId: validTabId,
        results: {
          vulnerabilities: [
            { type: 'inline-scripts', status: 'fail', severity: 'high' },
            { type: 'missing-csp', status: 'fail', severity: 'high' },
            { type: 'inline-event-handlers', status: 'pass', severity: 'medium' }
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
    });
    
    const result = await server.callTool('check_vulnerabilities', {
      tabId: validTabId,
      vulnerabilityType: 'xss'
    });
    
    expect(result.success).toBe(true);
    expect(result.vulnerabilities.summary).toBeDefined();
    expect(result.vulnerabilities.summary.totalChecks).toBe(4);
    expect(result.vulnerabilities.summary.totalVulnerabilities).toBe(2);
    expect(result.vulnerabilities.summary.highRisk).toBe(2);
  });
});