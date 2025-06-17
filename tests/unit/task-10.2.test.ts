import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 10.2: Implement executeJS Method', () => {
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

  test('executeJS method exists and is callable', async () => {
    expect(server.executeJS).toBeDefined();
    expect(typeof server.executeJS).toBe('function');
  });

  test('executeJS validates tabId parameter', async () => {
    const params = { tabId: '', expression: 'console.log("test")' };
    
    await expect(server.executeJS(params)).rejects.toThrow(/Tab ID is required/);
  });

  test('executeJS validates tabId format', async () => {
    const params = { tabId: 'invalid-tab-id', expression: 'console.log("test")' };
    
    await expect(server.executeJS(params)).rejects.toThrow(/Tab ID must be a 32-character/);
  });

  test('executeJS validates expression parameter', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: '' };
    
    await expect(server.executeJS(params)).rejects.toThrow(/Expression is required/);
  });

  test('executeJS validates timeout parameter bounds', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    
    // Test minimum bounds
    const lowTimeout = { tabId: validTabId, expression: '1+1', timeout: 50 };
    await expect(server.executeJS(lowTimeout)).rejects.toThrow(/Timeout must be between 100 and 30000 milliseconds/);
    
    // Test maximum bounds
    const highTimeout = { tabId: validTabId, expression: '1+1', timeout: 35000 };
    await expect(server.executeJS(highTimeout)).rejects.toThrow(/Timeout must be between 100 and 30000 milliseconds/);
    
    // Test valid timeout - should not throw timeout validation error
    const validTimeout = { tabId: validTabId, expression: '1+1', timeout: 5000 };
    const result = await server.executeJS(validTimeout);
    // Should return result (may be error due to tab not found, but not validation error)
    expect(result).toBeDefined();
    expect(result.success).toBe(false); // Tab not found
    expect(result.message).not.toMatch(/Timeout must be between/);
  });

  test('executeJS handles tab not found error', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: '1+1' };
    
    const result = await server.executeJS(params);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Tab .* not found or not connected/);
    expect(result.execution.error.message).toMatch(/Tab .* not found or not connected/);
  });

  test('executeJS returns success response structure', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: '1+1' };
    
    // Mock the client for this test
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'number',
            value: 2,
            description: '2'
          },
          exceptionDetails: undefined
        })
      }
    };
    
    // Add mock client to storage
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.executeJS(params);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toContain('JavaScript executed successfully');
    expect(result.execution).toBeDefined();
    expect(result.execution.tabId).toBe(validTabId);
    expect(result.execution.expression).toBe(params.expression);
    expect(result.execution.result).toBeDefined();
    expect(result.execution.result.type).toBe('number');
    expect(result.execution.result.value).toBe(2);
  });

  test('executeJS handles JavaScript execution errors', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: 'invalidFunction()' };
    
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
              className: 'ReferenceError',
              description: 'ReferenceError: invalidFunction is not defined'
            },
            text: 'Uncaught ReferenceError: invalidFunction is not defined',
            lineNumber: 1,
            columnNumber: 1
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.executeJS(params);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('JavaScript execution failed');
    expect(result.execution.error).toBeDefined();
    expect(result.execution.error.type).toBe('ReferenceError');
    expect(result.execution.error.message).toContain('invalidFunction is not defined');
  });

  test('executeJS handles timeout parameter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: '1+1', timeout: 2000 };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'number', value: 2 }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    await server.executeJS(params);
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: params.expression,
      timeout: params.timeout,
      includeCommandLineAPI: false,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('executeJS handles includeCommandLineAPI parameter correctly', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { 
      tabId: validTabId, 
      expression: '$("body")', 
      includeCommandLineAPI: true 
    };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'object', value: null }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    await server.executeJS(params);
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: params.expression,
      timeout: 5000, // default timeout
      includeCommandLineAPI: true,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('executeJS uses default timeout when not specified', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: '1+1' };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'number', value: 2 }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    await server.executeJS(params);
    
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression: params.expression,
      timeout: 5000, // default timeout from tool definition
      includeCommandLineAPI: false,
      returnByValue: true,
      generatePreview: true
    });
  });

  test('executeJS handles complex JavaScript expressions', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const complexExpression = `
      const data = { name: 'test', value: 42 };
      JSON.stringify(data);
    `;
    const params = { tabId: validTabId, expression: complexExpression };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'string',
            value: '{"name":"test","value":42}',
            description: '"{\\"name\\":\\"test\\",\\"value\\":42}"'
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.executeJS(params);
    
    expect(result.success).toBe(true);
    expect(result.execution.result.type).toBe('string');
    expect(result.execution.result.value).toBe('{"name":"test","value":42}');
  });

  test('executeJS includes execution timestamp', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const params = { tabId: validTabId, expression: 'Date.now()' };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: { type: 'number', value: 1234567890 }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const startTime = Date.now();
    const result = await server.executeJS(params);
    const endTime = Date.now();
    
    expect(result.execution.timestamp).toBeDefined();
    const resultTime = new Date(result.execution.timestamp).getTime();
    expect(resultTime).toBeGreaterThanOrEqual(startTime);
    expect(resultTime).toBeLessThanOrEqual(endTime);
  });

  test('executeJS handles TypeScript-style expressions', async () => {
    const validTabId = 'A1B2C3D4E5F6789012345678901234AB';
    const tsExpression = `
      interface User { name: string; age: number; }
      const user: User = { name: 'Alice', age: 30 };
      user.name;
    `;
    const params = { tabId: validTabId, expression: tsExpression };
    
    const mockClient = {
      Runtime: {
        evaluate: jest.fn().mockResolvedValue({
          result: {
            type: 'string',
            value: 'Alice',
            description: '"Alice"'
          }
        })
      }
    };
    
    server.addStorageEntry('clients', validTabId, mockClient);
    
    const result = await server.executeJS(params);
    
    expect(result.success).toBe(true);
    expect(result.execution.result.value).toBe('Alice');
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        expression: tsExpression
      })
    );
  });
});