import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 11.4: Wire Security Audit to Handler', () => {
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

  test('callTool supports security_audit tool', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock performSecurityAudit to avoid actual execution
    jest.spyOn(server, 'performSecurityAudit').mockResolvedValue({
      success: true,
      message: `Security audit completed for tab ${validTabId}`,
      audit: {
        tabId: validTabId,
        auditType: 'basic',
        depth: 'medium',
        includeRecommendations: true,
        timestamp: new Date().toISOString(),
        results: {
          pageInfo: {
            url: 'https://example.com',
            protocol: 'https:',
            isSecure: true
          },
          securityChecks: [
            {
              name: 'HTTPS Usage',
              status: 'pass',
              message: 'Site is using HTTPS'
            }
          ],
          summary: {
            totalChecks: 1,
            passed: 1,
            failed: 0,
            warnings: 0
          }
        }
      }
    });

    const result = await server.callTool('security_audit', { 
      tabId: validTabId 
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Security audit completed');
    expect(result.audit).toBeDefined();
    expect(result.audit.tabId).toBe(validTabId);
  });

  test('callTool passes parameters correctly to performSecurityAudit', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      auditType: 'comprehensive',
      depth: 'deep',
      includeRecommendations: false
    };
    
    const performSecurityAuditSpy = jest.spyOn(server, 'performSecurityAudit').mockResolvedValue({
      success: true,
      message: 'Mocked response',
      audit: {
        tabId: validTabId,
        auditType: params.auditType,
        depth: params.depth,
        includeRecommendations: params.includeRecommendations,
        timestamp: new Date().toISOString(),
        results: {
          pageInfo: { url: 'https://example.com', isSecure: true },
          securityChecks: [],
          summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0 }
        }
      }
    });

    await server.callTool('security_audit', params);
    
    expect(performSecurityAuditSpy).toHaveBeenCalledWith(params);
    expect(performSecurityAuditSpy).toHaveBeenCalledTimes(1);
    
    performSecurityAuditSpy.mockRestore();
  });

  test('callTool validates security_audit tool name', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock to avoid actual execution
    jest.spyOn(server, 'performSecurityAudit').mockResolvedValue({
      success: true,
      message: 'Test response',
      audit: {
        tabId: validTabId,
        auditType: 'basic',
        timestamp: new Date().toISOString(),
        results: { pageInfo: {}, securityChecks: [], summary: {} }
      }
    });

    // Should not throw error for valid tool name
    await expect(server.callTool('security_audit', { 
      tabId: validTabId 
    })).resolves.toBeDefined();
  });

  test('callTool propagates performSecurityAudit errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock performSecurityAudit to throw error
    jest.spyOn(server, 'performSecurityAudit').mockRejectedValue(new Error('Tab ID validation failed'));

    await expect(server.callTool('security_audit', { 
      tabId: validTabId 
    })).rejects.toThrow('Tab ID validation failed');
  });

  test('callTool handles security_audit parameter validation', async () => {
    // Mock performSecurityAudit to handle validation
    const performSecurityAuditSpy = jest.spyOn(server, 'performSecurityAudit').mockImplementation(async (params) => {
      if (!params.tabId) {
        throw new Error('Tab ID is required and must be a non-empty string');
      }
      if (params.auditType && !['basic', 'comprehensive', 'headers', 'xss'].includes(params.auditType)) {
        throw new Error('Invalid audit type');
      }
      return {
        success: true,
        message: 'Security audit completed',
        audit: {
          tabId: params.tabId,
          auditType: params.auditType || 'basic',
          timestamp: new Date().toISOString(),
          results: { pageInfo: {}, securityChecks: [], summary: {} }
        }
      };
    });

    // Should propagate validation errors
    await expect(server.callTool('security_audit', {})).rejects.toThrow('Tab ID is required');
    await expect(server.callTool('security_audit', { 
      tabId: 'A1B2C3D4E5F6789012345678901234AB',
      auditType: 'invalid'
    })).rejects.toThrow('Invalid audit type');
    
    performSecurityAuditSpy.mockRestore();
  });

  test('security_audit tool integrates with full MCP flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test complete flow: listTools -> callTool
    const tools = await server.listTools();
    const securityAuditTool = tools.find(tool => tool.name === 'security_audit');
    
    expect(securityAuditTool).toBeDefined();
    
    // Add a mock client and page security info
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://secure.example.com',
              protocol: 'https:',
              hostname: 'secure.example.com',
              isSecure: true,
              title: 'Secure Test Site'
            }
          },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    const result = await server.callTool('security_audit', { 
      tabId: validTabId,
      auditType: 'basic'
    });
    
    expect(result.success).toBe(true);
    expect(result.audit.tabId).toBe(validTabId);
    expect(result.audit.auditType).toBe('basic');
    expect(result.audit.results.pageInfo.isSecure).toBe(true);
    expect(result.audit.results.securityChecks).toBeDefined();
    expect(result.audit.results.securityChecks.length).toBeGreaterThan(0);
    
    // Should have HTTPS check that passes
    const httpsCheck = result.audit.results.securityChecks.find((check: any) => check.name === 'HTTPS Usage');
    expect(httpsCheck).toBeDefined();
    expect(httpsCheck.status).toBe('pass');
  });

  test('callTool error message includes security_audit in available tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(/security_audit/);
  });

  test('security_audit tool works with real audit flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a mock client that simulates different security scenarios
    const mockClient = {
      Runtime: {
        evaluate: jest.fn()
          .mockResolvedValueOnce({
            result: {
              type: 'object',
              value: {
                url: 'http://insecure.example.com',
                protocol: 'http:',
                hostname: 'insecure.example.com',
                isSecure: false,
                title: 'Insecure Test Site'
              }
            },
            exceptionDetails: undefined
          })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    // Test basic audit on insecure site
    const result = await server.callTool('security_audit', { 
      tabId: validTabId,
      auditType: 'basic',
      includeRecommendations: true
    });
    
    expect(result.success).toBe(true);
    expect(result.audit.results.pageInfo.isSecure).toBe(false);
    
    // Should have HTTPS check that fails
    const httpsCheck = result.audit.results.securityChecks.find((check: any) => check.name === 'HTTPS Usage');
    expect(httpsCheck).toBeDefined();
    expect(httpsCheck.status).toBe('fail');
    expect(httpsCheck.severity).toBe('high');
    
    // Should have recommendations for HTTP site
    expect(result.audit.results.recommendations).toBeDefined();
    expect(result.audit.results.recommendations.length).toBeGreaterThan(0);
    
    const httpsRecommendation = result.audit.results.recommendations.find((rec: any) => rec.title === 'Enable HTTPS');
    expect(httpsRecommendation).toBeDefined();
    expect(httpsRecommendation.severity).toBe('high');
  });

  test('security_audit tool works with different audit types', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://example.com',
              protocol: 'https:',
              isSecure: true
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    // Test different audit types
    const auditTypes = ['basic', 'comprehensive', 'headers', 'xss'];
    
    for (const auditType of auditTypes) {
      const result = await server.callTool('security_audit', { 
        tabId: validTabId,
        auditType: auditType
      });
      
      expect(result.success).toBe(true);
      expect(result.audit.auditType).toBe(auditType);
      expect(result.audit.results.securityChecks).toBeDefined();
    }
  });

  test('security_audit tool works with different depth levels', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://example.com',
              protocol: 'https:',
              isSecure: true
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    // Test different depth levels
    const depths = ['shallow', 'medium', 'deep'];
    
    for (const depth of depths) {
      const result = await server.callTool('security_audit', { 
        tabId: validTabId,
        depth: depth
      });
      
      expect(result.success).toBe(true);
      expect(result.audit.depth).toBe(depth);
      expect(result.audit.results.securityChecks).toBeDefined();
    }
  });

  test('security_audit tool handles includeRecommendations flag', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'http://example.com',
              protocol: 'http:',
              isSecure: false
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    // Test with recommendations enabled
    const withRecommendations = await server.callTool('security_audit', { 
      tabId: validTabId,
      includeRecommendations: true
    });
    
    expect(withRecommendations.success).toBe(true);
    expect(withRecommendations.audit.results.recommendations).toBeDefined();
    expect(withRecommendations.audit.results.recommendations.length).toBeGreaterThan(0);

    // Test with recommendations disabled
    const withoutRecommendations = await server.callTool('security_audit', { 
      tabId: validTabId,
      includeRecommendations: false
    });
    
    expect(withoutRecommendations.success).toBe(true);
    expect(withoutRecommendations.audit.results.recommendations).toBeUndefined();
  });

  test('nine tools exist now (connect_to_chrome, list_tabs, start_monitoring, get_console_messages, get_network_activity, execute_js, security_audit, check_vulnerabilities, get_performance_metrics)', async () => {
    const tools = await server.listTools();
    expect(tools).toHaveLength(20);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('connect_to_chrome');
    expect(toolNames).toContain('list_tabs');
    expect(toolNames).toContain('start_monitoring');
    expect(toolNames).toContain('get_console_messages');
    expect(toolNames).toContain('get_network_activity');
    expect(toolNames).toContain('execute_js');
    expect(toolNames).toContain('security_audit');
    expect(toolNames).toContain('check_vulnerabilities');
    expect(toolNames).toContain('get_performance_metrics');
  });
});