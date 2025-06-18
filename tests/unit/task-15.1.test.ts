import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 15.1: Add Performance Monitoring Tool', () => {
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

  test('get_performance_metrics tool is defined in tools list', async () => {
    const tools = await server.listTools();
    const perfTool = tools.find((tool: any) => tool.name === 'get_performance_metrics');
    
    expect(perfTool).toBeDefined();
    expect(perfTool.name).toBe('get_performance_metrics');
    expect(perfTool.description).toBeDefined();
    expect(perfTool.description.length).toBeGreaterThan(0);
    expect(perfTool.description.toLowerCase()).toContain('performance');
  });

  test('get_performance_metrics tool has correct input schema', async () => {
    const tools = await server.listTools();
    const perfTool = tools.find((tool: any) => tool.name === 'get_performance_metrics');
    
    expect(perfTool.inputSchema).toBeDefined();
    expect(perfTool.inputSchema.type).toBe('object');
    expect(perfTool.inputSchema.properties).toBeDefined();
    
    // Should have tabId property
    expect(perfTool.inputSchema.properties.tabId).toBeDefined();
    expect(perfTool.inputSchema.properties.tabId.type).toBe('string');
    expect(perfTool.inputSchema.properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    // Should have optional includeDetails property
    expect(perfTool.inputSchema.properties.includeDetails).toBeDefined();
    expect(perfTool.inputSchema.properties.includeDetails.type).toBe('boolean');
    expect(perfTool.inputSchema.properties.includeDetails.default).toBe(true);
    
    // Should have required fields
    expect(perfTool.inputSchema.required).toBeDefined();
    expect(perfTool.inputSchema.required).toContain('tabId');
    expect(perfTool.inputSchema.required).not.toContain('includeDetails');
  });

  test('callTool handles get_performance_metrics with valid tab', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock client with performance data
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              navigation: {
                domContentLoadedEventEnd: 1500,
                loadEventEnd: 2000,
                fetchStart: 100
              },
              webVitals: {
                LCP: 2.1,
                FID: 85,
                CLS: 0.05,
                FCP: 1.2,
                TTFB: 200
              },
              resourceTiming: [
                {
                  name: 'https://example.com/script.js',
                  duration: 150,
                  transferSize: 25000,
                  initiatorType: 'script'
                }
              ]
            }
          },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId
    });
    
    expect(result.success).toBe(true);
    expect(result.performance).toBeDefined();
    expect(result.performance.tabId).toBe(validTabId);
    expect(result.performance.metrics).toBeDefined();
    expect(result.performance.metrics.coreWebVitals).toBeDefined();
    expect(result.performance.metrics.navigation).toBeDefined();
  });

  test('get_performance_metrics analyzes Core Web Vitals correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              webVitals: {
                LCP: 1.8,  // Good
                FID: 45,   // Good  
                CLS: 0.15, // Needs improvement
                FCP: 0.9,  // Good
                TTFB: 150  // Good
              },
              navigation: {
                domContentLoadedEventEnd: 1200,
                loadEventEnd: 1800,
                fetchStart: 50
              }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId,
      includeDetails: true
    });
    
    expect(result.success).toBe(true);
    expect(result.performance.metrics.coreWebVitals.LCP).toBeDefined();
    expect(result.performance.metrics.coreWebVitals.LCP.value).toBe(1.8);
    expect(result.performance.metrics.coreWebVitals.LCP.rating).toBe('good');
    
    expect(result.performance.metrics.coreWebVitals.CLS.value).toBe(0.15);
    expect(result.performance.metrics.coreWebVitals.CLS.rating).toBe('needs-improvement');
    
    expect(result.performance.analysis).toBeDefined();
    expect(result.performance.analysis.overallRating).toBeDefined();
  });

  test('get_performance_metrics provides performance recommendations', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              webVitals: {
                LCP: 3.5,  // Poor
                FID: 150,  // Poor
                CLS: 0.3,  // Poor
                FCP: 2.8,  // Poor
                TTFB: 800  // Poor
              },
              navigation: {
                domContentLoadedEventEnd: 3000,
                loadEventEnd: 5000,
                fetchStart: 200
              },
              resourceTiming: [
                {
                  name: 'https://example.com/large-image.jpg',
                  duration: 1200,
                  transferSize: 500000,
                  initiatorType: 'img'
                }
              ]
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId,
      includeDetails: true
    });
    
    expect(result.success).toBe(true);
    expect(result.performance.recommendations).toBeDefined();
    expect(result.performance.recommendations.length).toBeGreaterThan(0);
    
    // Should have recommendations for poor metrics
    const recommendations = result.performance.recommendations;
    expect(recommendations.some((rec: any) => rec.metric === 'LCP')).toBe(true);
    expect(recommendations.some((rec: any) => rec.metric === 'FID')).toBe(true);
    expect(recommendations.some((rec: any) => rec.metric === 'CLS')).toBe(true);
  });

  test('get_performance_metrics handles tab not connected error', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Tab .* not found or not connected/);
    expect(result.performance.error).toBeDefined();
  });

  test('get_performance_metrics validates tabId parameter', async () => {
    await expect(server.callTool('get_performance_metrics', {
      tabId: ''
    })).rejects.toThrow(/Tab ID is required/);
    
    await expect(server.callTool('get_performance_metrics', {
      tabId: 'invalid-tab-id'
    })).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('get_performance_metrics handles JavaScript execution errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'undefined' },
          exceptionDetails: {
            exception: {
              className: 'TypeError',
              description: 'TypeError: Cannot read property'
            },
            text: 'TypeError: Cannot read property'
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to get performance metrics');
    expect(result.performance.error).toBeDefined();
    expect(result.performance.error.type).toBe('TypeError');
  });

  test('get_performance_metrics includes timestamp and duration', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              webVitals: { LCP: 1.5, FID: 50, CLS: 0.1 },
              navigation: { loadEventEnd: 1500, fetchStart: 100 }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const startTime = Date.now();
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId
    });
    const endTime = Date.now();
    
    console.log('Performance result:', JSON.stringify(result, null, 2));
    
    expect(result.performance.timestamp).toBeDefined();
    const resultTime = new Date(result.performance.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
    
    expect(result.performance.collectionTime).toBeDefined();
    expect(result.performance.collectionTime).toBeGreaterThan(0);
  });

  test('get_performance_metrics nine tools exist now', async () => {
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

  test('get_performance_metrics calculates performance score', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'object',
            value: {
              webVitals: {
                LCP: 1.5,  // Good (25 points)
                FID: 80,   // Good (25 points)
                CLS: 0.08, // Good (25 points)
                FCP: 1.1   // Good (25 points)
              },
              navigation: { loadEventEnd: 1500, fetchStart: 100 }
            }
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.callTool('get_performance_metrics', {
      tabId: validTabId,
      includeDetails: true
    });
    
    expect(result.success).toBe(true);
    expect(result.performance.analysis.performanceScore).toBeDefined();
    expect(result.performance.analysis.performanceScore).toBeGreaterThan(80);
    expect(result.performance.analysis.performanceScore).toBeLessThanOrEqual(100);
  });
});