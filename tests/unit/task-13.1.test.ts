import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 13.1: Implement checkXSSVulnerabilities Method', () => {
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

  test('checkXSSVulnerabilities method exists and is callable', async () => {
    expect(server.checkXSSVulnerabilities).toBeDefined();
    expect(typeof server.checkXSSVulnerabilities).toBe('function');
  });

  test('checkXSSVulnerabilities validates tabId parameter', async () => {
    const params = { tabId: '' };
    
    await expect(server.checkXSSVulnerabilities(params)).rejects.toThrow(/Tab ID is required/);
  });

  test('checkXSSVulnerabilities validates tabId format', async () => {
    const params = { tabId: 'invalid-tab-id' };
    
    await expect(server.checkXSSVulnerabilities(params)).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('checkXSSVulnerabilities handles tab not connected error', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    const result = await server.checkXSSVulnerabilities(params);
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Tab .* not found or not connected/);
    expect(result.xss.error).toBeDefined();
  });

  test('checkXSSVulnerabilities returns success response structure', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock the client for this test
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 2,
              inlineEventHandlers: 1,
              unsafeInlineStyles: 0,
              externalScripts: 5,
              vulnerablePatterns: [],
              cspStatus: {
                present: true,
                restrictive: true,
                allowsUnsafeInline: false
              }
            }
          },
          exceptionDetails: undefined
        })
      }
    };
    
    // Add mock client to storage
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities(params);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('XSS vulnerability check completed');
    expect(result.xss).toBeDefined();
    expect(result.xss.tabId).toBe(validTabId);
    expect(result.xss.results).toBeDefined();
    expect(result.xss.results.vulnerabilities).toBeDefined();
    expect(result.xss.results.summary).toBeDefined();
  });

  test('checkXSSVulnerabilities detects inline scripts vulnerability', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 5,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 2,
              vulnerablePatterns: [
                { type: 'inline-script', location: 'line 15', content: 'alert("xss")' }
              ],
              cspStatus: {
                present: false,
                restrictive: false,
                allowsUnsafeInline: true
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.xss.results.vulnerabilities.length).toBeGreaterThan(0);
    
    // Should detect inline scripts vulnerability
    const inlineScriptVuln = result.xss.results.vulnerabilities.find((vuln: any) => 
      vuln.type === 'inline-scripts'
    );
    expect(inlineScriptVuln).toBeDefined();
    expect(inlineScriptVuln.severity).toBe('high');
    expect(inlineScriptVuln.status).toBe('fail');
    expect(inlineScriptVuln.count).toBe(5);
  });

  test('checkXSSVulnerabilities detects inline event handlers vulnerability', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 0,
              inlineEventHandlers: 3,
              unsafeInlineStyles: 0,
              externalScripts: 1,
              vulnerablePatterns: [
                { type: 'inline-handler', location: 'button#submit', content: 'onclick="processForm()"' }
              ],
              cspStatus: {
                present: true,
                restrictive: false,
                allowsUnsafeInline: true
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    // Should detect inline event handlers vulnerability
    const eventHandlerVuln = result.xss.results.vulnerabilities.find((vuln: any) => 
      vuln.type === 'inline-event-handlers'
    );
    expect(eventHandlerVuln).toBeDefined();
    expect(eventHandlerVuln.severity).toBe('medium');
    expect(eventHandlerVuln.status).toBe('fail');
    expect(eventHandlerVuln.count).toBe(3);
  });

  test('checkXSSVulnerabilities detects missing CSP vulnerability', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 0,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 2,
              vulnerablePatterns: [],
              cspStatus: {
                present: false,
                restrictive: false,
                allowsUnsafeInline: false
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    // Should detect missing CSP vulnerability
    const cspVuln = result.xss.results.vulnerabilities.find((vuln: any) => 
      vuln.type === 'missing-csp'
    );
    expect(cspVuln).toBeDefined();
    expect(cspVuln.severity).toBe('high');
    expect(cspVuln.status).toBe('fail');
  });

  test('checkXSSVulnerabilities detects permissive CSP vulnerability', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 1,
              inlineEventHandlers: 1,
              unsafeInlineStyles: 2,
              externalScripts: 3,
              vulnerablePatterns: [],
              cspStatus: {
                present: true,
                restrictive: false,
                allowsUnsafeInline: true
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    // Should detect permissive CSP vulnerability
    const permissiveCspVuln = result.xss.results.vulnerabilities.find((vuln: any) => 
      vuln.type === 'permissive-csp'
    );
    expect(permissiveCspVuln).toBeDefined();
    expect(permissiveCspVuln.severity).toBe('medium');
    expect(permissiveCspVuln.status).toBe('fail');
  });

  test('checkXSSVulnerabilities shows secure site with no vulnerabilities', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 0,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 3,
              vulnerablePatterns: [],
              cspStatus: {
                present: true,
                restrictive: true,
                allowsUnsafeInline: false
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    
    // Should show all checks passing
    const vulnerabilities = result.xss.results.vulnerabilities;
    const failedVulns = vulnerabilities.filter((vuln: any) => vuln.status === 'fail');
    
    expect(failedVulns.length).toBe(0);
    expect(result.xss.results.summary.totalVulnerabilities).toBe(0);
    expect(result.xss.results.summary.highRisk).toBe(0);
    expect(result.xss.results.summary.mediumRisk).toBe(0);
  });

  test('checkXSSVulnerabilities includes execution timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 0,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 1,
              vulnerablePatterns: [],
              cspStatus: { present: true, restrictive: true, allowsUnsafeInline: false }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const startTime = Date.now();
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    const endTime = Date.now();
    
    expect(result.xss.timestamp).toBeDefined();
    const resultTime = new Date(result.xss.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('checkXSSVulnerabilities handles JavaScript execution errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'undefined' },
          exceptionDetails: {
            exception: {
              className: 'SecurityError',
              description: 'SecurityError: Blocked by CSP'
            },
            text: 'SecurityError: Blocked by CSP'
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to check XSS vulnerabilities');
    expect(result.xss.error).toBeDefined();
    expect(result.xss.error.type).toBe('SecurityError');
  });

  test('checkXSSVulnerabilities uses correct JavaScript for DOM analysis', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 0,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 1,
              vulnerablePatterns: [],
              cspStatus: { present: true, restrictive: true, allowsUnsafeInline: false }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    // Verify the JavaScript expression used
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: expect.stringContaining('inlineScripts:'),
      returnByValue: true,
      generatePreview: false
    });
    
    const expression = mockClient.Runtime.evaluate.mock.calls[0][0].expression;
    expect(expression).toContain('document.querySelectorAll');
    expect(expression).toContain('script:not([src])');
    expect(expression).toContain('onclick');
    expect(expression).toContain('onload');
    expect(expression).toContain('Content-Security-Policy');
  });

  test('checkXSSVulnerabilities provides detailed vulnerability information', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              inlineScripts: 2,
              inlineEventHandlers: 1,
              unsafeInlineStyles: 1,
              externalScripts: 3,
              vulnerablePatterns: [
                { type: 'inline-script', location: 'line 25', content: 'eval(userInput)' },
                { type: 'inline-handler', location: 'input#search', content: 'oninput="search(this.value)"' }
              ],
              cspStatus: {
                present: false,
                restrictive: false,
                allowsUnsafeInline: true
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.xss.results.vulnerabilities.length).toBeGreaterThan(0);
    
    // Check that vulnerabilities have detailed information
    result.xss.results.vulnerabilities.forEach((vuln: any) => {
      expect(vuln.type).toBeDefined();
      expect(vuln.severity).toBeDefined();
      expect(vuln.status).toBeDefined();
      expect(vuln.message).toBeDefined();
      expect(vuln.description).toBeDefined();
      
      if (vuln.status === 'fail') {
        expect(vuln.count).toBeDefined();
        expect(vuln.count).toBeGreaterThan(0);
      }
    });
    
    // Check summary
    expect(result.xss.results.summary.totalChecks).toBeGreaterThan(0);
    expect(result.xss.results.summary.totalVulnerabilities).toBeGreaterThan(0);
    expect(result.xss.results.summary.highRisk).toBeGreaterThan(0);
  });

  test('checkXSSVulnerabilities handles network errors gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockRejectedValue(new Error('Connection timeout'))
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.checkXSSVulnerabilities({ tabId: validTabId });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to check XSS vulnerabilities');
    expect(result.xss.error.message).toContain('Connection timeout');
  });
});