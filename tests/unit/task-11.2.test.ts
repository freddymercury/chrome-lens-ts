import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 11.2: Implement getPageSecurityInfo Method', () => {
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

  test('getPageSecurityInfo method exists and is callable', async () => {
    expect(server.getPageSecurityInfo).toBeDefined();
    expect(typeof server.getPageSecurityInfo).toBe('function');
  });

  test('getPageSecurityInfo validates tabId parameter', async () => {
    const params = { tabId: '' };
    
    await expect(server.getPageSecurityInfo(params)).rejects.toThrow(/Tab ID is required/);
  });

  test('getPageSecurityInfo validates tabId format', async () => {
    const params = { tabId: 'invalid-tab-id' };
    
    await expect(server.getPageSecurityInfo(params)).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('getPageSecurityInfo handles tab not found error', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    const result = await server.getPageSecurityInfo(params);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Tab .* not found or not connected/);
    expect(result.security.error).toBeDefined();
  });

  test('getPageSecurityInfo returns success response structure', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock the client for this test
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://example.com',
              protocol: 'https:',
              hostname: 'example.com',
              port: '',
              pathname: '/',
              isSecure: true
            }
          },
          exceptionDetails: undefined
        })
      }
    };
    
    // Add mock client to storage
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.getPageSecurityInfo(params);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('Page security information retrieved');
    expect(result.security).toBeDefined();
    expect(result.security.tabId).toBe(validTabId);
    expect(result.security.pageInfo).toBeDefined();
    expect(result.security.pageInfo.url).toBe('https://example.com');
    expect(result.security.pageInfo.isSecure).toBe(true);
  });

  test('getPageSecurityInfo detects HTTP vs HTTPS', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test HTTPS
    const mockClientHTTPS = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://secure.example.com',
              protocol: 'https:',
              isSecure: true
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClientHTTPS);
    
    const httpsResult = await server.getPageSecurityInfo({ tabId: validTabId });
    expect(httpsResult.success).toBe(true);
    expect(httpsResult.security.pageInfo.isSecure).toBe(true);
    expect(httpsResult.security.pageInfo.protocol).toBe('https:');
    
    // Test HTTP
    const mockClientHTTP = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'http://insecure.example.com',
              protocol: 'http:',
              isSecure: false
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClientHTTP);
    
    const httpResult = await server.getPageSecurityInfo({ tabId: validTabId });
    expect(httpResult.success).toBe(true);
    expect(httpResult.security.pageInfo.isSecure).toBe(false);
    expect(httpResult.security.pageInfo.protocol).toBe('http:');
  });

  test('getPageSecurityInfo handles JavaScript execution errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
    // Mock the client with error response
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'undefined'
          },
          exceptionDetails: {
            exception: {
              type: 'object',
              subtype: 'error',
              className: 'SecurityError',
              description: 'SecurityError: Blocked due to CORS policy'
            },
            text: 'SecurityError: Blocked due to CORS policy'
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.getPageSecurityInfo(params);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to get page security information');
    expect(result.security.error).toBeDefined();
    expect(result.security.error.type).toBe('SecurityError');
  });

  test('getPageSecurityInfo includes execution timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId };
    
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
    
    const startTime = Date.now();
    const result = await server.getPageSecurityInfo(params);
    const endTime = Date.now();
    
    expect(result.security.timestamp).toBeDefined();
    const resultTime = new Date(result.security.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('getPageSecurityInfo extracts complete URL information', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'https://app.example.com:8443/dashboard?user=123#section1',
              protocol: 'https:',
              hostname: 'app.example.com',
              port: '8443',
              pathname: '/dashboard',
              search: '?user=123',
              hash: '#section1',
              origin: 'https://app.example.com:8443',
              isSecure: true
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.getPageSecurityInfo({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.security.pageInfo.url).toBe('https://app.example.com:8443/dashboard?user=123#section1');
    expect(result.security.pageInfo.hostname).toBe('app.example.com');
    expect(result.security.pageInfo.port).toBe('8443');
    expect(result.security.pageInfo.pathname).toBe('/dashboard');
    expect(result.security.pageInfo.origin).toBe('https://app.example.com:8443');
  });

  test('getPageSecurityInfo uses correct JavaScript for page info extraction', async () => {
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
    
    await server.getPageSecurityInfo({ tabId: validTabId });
    
    // Verify the JavaScript expression used
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: expect.stringContaining('window.location'),
      returnByValue: true,
      generatePreview: false
    });
    
    const expression = mockClient.Runtime.evaluate.mock.calls[0][0].expression;
    expect(expression).toContain('url: loc.href');
    expect(expression).toContain('protocol: loc.protocol');
    expect(expression).toContain('hostname: loc.hostname');
    expect(expression).toContain("isSecure: loc.protocol === 'https:'");
  });

  test('getPageSecurityInfo handles localhost and file protocols', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test localhost
    const mockClientLocalhost = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'http://localhost:3000/app',
              protocol: 'http:',
              hostname: 'localhost',
              port: '3000',
              isSecure: false
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClientLocalhost);
    
    const localhostResult = await server.getPageSecurityInfo({ tabId: validTabId });
    expect(localhostResult.success).toBe(true);
    expect(localhostResult.security.pageInfo.hostname).toBe('localhost');
    expect(localhostResult.security.pageInfo.isSecure).toBe(false);
    
    // Test file protocol
    const mockClientFile = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'file:///Users/test/app.html',
              protocol: 'file:',
              hostname: '',
              isSecure: false
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClientFile);
    
    const fileResult = await server.getPageSecurityInfo({ tabId: validTabId });
    expect(fileResult.success).toBe(true);
    expect(fileResult.security.pageInfo.protocol).toBe('file:');
    expect(fileResult.security.pageInfo.isSecure).toBe(false);
  });

  test('getPageSecurityInfo handles network errors gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockRejectedValue(new Error('Connection timeout'))
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.getPageSecurityInfo({ tabId: validTabId });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to get page security information');
    expect(result.security.error.message).toContain('Connection timeout');
  });

  test('getPageSecurityInfo handles data URLs', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              url: 'data:text/html,<h1>Hello</h1>',
              protocol: 'data:',
              hostname: '',
              isSecure: false
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.getPageSecurityInfo({ tabId: validTabId });
    
    expect(result.success).toBe(true);
    expect(result.security.pageInfo.protocol).toBe('data:');
    expect(result.security.pageInfo.isSecure).toBe(false);
  });
});