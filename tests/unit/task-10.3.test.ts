import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 10.3: Wire executeJS to Handler', () => {
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

  test('callTool supports execute_js tool', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock executeJS to avoid actual execution
    jest.spyOn(server, 'executeJS').mockResolvedValue({
      success: true,
      message: `JavaScript executed successfully in tab ${validTabId}`,
      execution: {
        tabId: validTabId,
        expression: '1+1',
        timestamp: new Date().toISOString(),
        timeout: 5000,
        includeCommandLineAPI: false,
        result: {
          type: 'number',
          value: 2,
          description: '2'
        }
      }
    });

    const result = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '1+1' 
    });
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('JavaScript executed successfully');
    expect(result.execution).toBeDefined();
    expect(result.execution.result.value).toBe(2);
  });

  test('callTool passes parameters correctly to executeJS', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      expression: 'console.log("test")',
      timeout: 3000,
      includeCommandLineAPI: true
    };
    
    const executeJSSpy = jest.spyOn(server, 'executeJS').mockResolvedValue({
      success: true,
      message: 'Mocked response',
      execution: {
        tabId: validTabId,
        expression: params.expression,
        timestamp: new Date().toISOString(),
        timeout: params.timeout,
        includeCommandLineAPI: params.includeCommandLineAPI,
        result: {
          type: 'undefined',
          value: undefined
        }
      }
    });

    await server.callTool('execute_js', params);
    
    expect(executeJSSpy).toHaveBeenCalledWith(params);
    expect(executeJSSpy).toHaveBeenCalledTimes(1);
    
    executeJSSpy.mockRestore();
  });

  test('callTool validates execute_js tool name', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock to avoid actual execution
    jest.spyOn(server, 'executeJS').mockResolvedValue({
      success: true,
      message: 'Test response',
      execution: {
        tabId: validTabId,
        expression: '1+1',
        timestamp: new Date().toISOString(),
        timeout: 5000,
        includeCommandLineAPI: false,
        result: { type: 'number', value: 2 }
      }
    });

    // Should not throw error for valid tool name
    await expect(server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '1+1' 
    })).resolves.toBeDefined();
  });

  test('callTool propagates executeJS errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Mock executeJS to throw error
    jest.spyOn(server, 'executeJS').mockRejectedValue(new Error('Tab ID validation failed'));

    await expect(server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '1+1' 
    })).rejects.toThrow('Tab ID validation failed');
  });

  test('callTool handles execute_js parameter validation', async () => {
    // Mock executeJS to handle validation
    const executeJSSpy = jest.spyOn(server, 'executeJS').mockImplementation(async (params) => {
      if (!params.tabId) {
        throw new Error('Tab ID is required and must be a non-empty string');
      }
      if (!params.expression) {
        throw new Error('Expression is required and must be a non-empty string');
      }
      return {
        success: true,
        message: 'JavaScript executed successfully',
        execution: {
          tabId: params.tabId,
          expression: params.expression,
          timestamp: new Date().toISOString(),
          timeout: 5000,
          includeCommandLineAPI: false,
          result: { type: 'number', value: 42 }
        }
      };
    });

    // Should propagate validation errors
    await expect(server.callTool('execute_js', {})).rejects.toThrow('Tab ID is required');
    await expect(server.callTool('execute_js', { 
      tabId: 'A1B2C3D4E5F6789012345678901234AB' 
    })).rejects.toThrow('Expression is required');
    
    executeJSSpy.mockRestore();
  });

  test('execute_js tool integrates with full MCP flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test complete flow: listTools -> callTool
    const tools = await server.listTools();
    const executeJSTool = tools.find(tool => tool.name === 'execute_js');
    
    expect(executeJSTool).toBeDefined();
    
    // Add a mock client for execution
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'number',
            value: 42,
            description: '42'
          },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    const result = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '21*2' 
    });
    
    expect(result.success).toBe(true);
    expect(result.execution.tabId).toBe(validTabId);
    expect(result.execution.expression).toBe('21*2');
    expect(result.execution.result.value).toBe(42);
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: '21*2',
      timeout: 5000,
      includeCommandLineAPI: false,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('callTool error message includes execute_js in available tools', async () => {
    await expect(server.callTool('unknown_tool', {})).rejects.toThrow(/execute_js/);
  });

  test('execute_js tool works with real JavaScript execution flow', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Add a mock client that simulates different JavaScript executions
    const mockClient = {
      Runtime: {
        evaluate: jest.fn()
          .mockResolvedValueOnce({
            result: { type: 'number', value: 5, description: '5' },
            exceptionDetails: undefined
          })
          .mockResolvedValueOnce({
            result: { type: 'string', value: 'Hello World', description: '"Hello World"' },
            exceptionDetails: undefined
          })
          .mockResolvedValueOnce({
            result: { type: 'object', value: { name: 'test' } },
            exceptionDetails: undefined
          })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    // Test arithmetic expression
    const mathResult = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '2+3' 
    });
    expect(mathResult.success).toBe(true);
    expect(mathResult.execution.result.value).toBe(5);

    // Test string expression
    const stringResult = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '"Hello" + " " + "World"' 
    });
    expect(stringResult.success).toBe(true);
    expect(stringResult.execution.result.value).toBe('Hello World');

    // Test object expression
    const objectResult = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '({ name: "test" })' 
    });
    expect(objectResult.success).toBe(true);
    expect(objectResult.execution.result.value).toEqual({ name: 'test' });
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledTimes(3);
  });

  test('execute_js tool works with includeCommandLineAPI flag', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'object', value: null },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: '$("body").length',
      includeCommandLineAPI: true
    });
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: '$("body").length',
      timeout: 5000,
      includeCommandLineAPI: true,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('execute_js tool works with custom timeout', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'number', value: 123 },
          exceptionDetails: undefined
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: 'Math.random() * 1000',
      timeout: 10000
    });
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: 'Math.random() * 1000',
      timeout: 10000,
      includeCommandLineAPI: false,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('execute_js tool handles execution errors gracefully', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'undefined' },
          exceptionDetails: {
            exception: {
              className: 'ReferenceError',
              description: 'ReferenceError: unknownVariable is not defined'
            },
            text: 'Uncaught ReferenceError: unknownVariable is not defined',
            lineNumber: 1,
            columnNumber: 1
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);

    const result = await server.callTool('execute_js', { 
      tabId: validTabId, 
      expression: 'unknownVariable'
    });
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('JavaScript execution failed');
    expect(result.execution.error.type).toBe('ReferenceError');
    expect(result.execution.error.message).toContain('unknownVariable is not defined');
  });
});