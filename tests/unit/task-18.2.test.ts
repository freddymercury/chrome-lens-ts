import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.RUNTIME_INSPECTION_ENABLED = 'true';
process.env.MAX_INSPECTION_DEPTH = '5';

import { ChromeDevToolsMCPServer } from '../../server';

describe('Task 18.2: Variable Inspection Engine', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Runtime: {
        enable: jest.fn().mockResolvedValue({} as any),
        evaluate: jest.fn(),
        getProperties: jest.fn(),
        callFunctionOn: jest.fn(),
        releaseObject: jest.fn()
      },
      Debugger: {
        evaluateOnCallFrame: jest.fn()
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should evaluate expression using Runtime.evaluate', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const expression = 'window.location.href';
    
    // Mock successful evaluation
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        type: 'string',
        value: 'https://example.com',
        description: 'https://example.com'
      }
    });
    
    const result = await server.inspectVariables({
      tabId,
      expression
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledWith({
      expression,
      returnByValue: false,
      generatePreview: true
    });
    expect(result.variableInspection.result.value).toBe('https://example.com');
  });

  test('should inspect object by objectId using Runtime.getProperties', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const objectId = 'obj-123';
    
    // Mock object properties
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [
        {
          name: 'name',
          value: { type: 'string', value: 'John' }
        },
        {
          name: 'age',
          value: { type: 'number', value: 30 }
        },
        {
          name: 'address',
          value: { 
            type: 'object',
            objectId: 'obj-456',
            description: 'Object'
          }
        }
      ]
    });
    
    const result = await server.inspectVariables({
      tabId,
      objectId,
      depth: 1
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.getProperties).toHaveBeenCalledWith({
      objectId,
      ownProperties: true,
      generatePreview: true
    });
    expect(result.variableInspection.properties).toHaveLength(3);
  });

  test('should respect depth parameter for nested objects', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const objectId = 'obj-root';
    const depth = 2;
    
    // Mock nested object structure
    mockClient.Runtime.getProperties
      .mockResolvedValueOnce({
        // Root object
        result: [{
          name: 'nested',
          value: {
            type: 'object',
            objectId: 'obj-nested',
            description: 'Object'
          }
        }]
      })
      .mockResolvedValueOnce({
        // Nested object
        result: [{
          name: 'deepValue',
          value: { type: 'string', value: 'deep' }
        }]
      });
    
    const result = await server.inspectVariables({
      tabId,
      objectId,
      depth
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Runtime.getProperties).toHaveBeenCalledTimes(2);
    expect(result.variableInspection.properties[0].value.properties).toBeDefined();
  });

  test('should evaluate in call frame context when paused', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const expression = 'localVariable';
    const callFrameId = 'frame-123';
    
    // Mock call frame evaluation
    mockClient.Debugger.evaluateOnCallFrame.mockResolvedValue({
      result: {
        type: 'number',
        value: 42,
        description: '42'
      }
    });
    
    const result = await server.inspectVariables({
      tabId,
      expression,
      callFrameId
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.evaluateOnCallFrame).toHaveBeenCalledWith({
      callFrameId,
      expression,
      returnByValue: false,
      generatePreview: true
    });
    expect(result.variableInspection.result.value).toBe(42);
  });

  test('should handle arrays specially', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const expression = '[1, 2, 3]';
    
    // Mock array evaluation
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        type: 'object',
        subtype: 'array',
        objectId: 'arr-123',
        description: 'Array(3)',
        preview: {
          type: 'object',
          subtype: 'array',
          description: 'Array(3)',
          properties: [
            { name: '0', type: 'number', value: '1' },
            { name: '1', type: 'number', value: '2' },
            { name: '2', type: 'number', value: '3' }
          ]
        }
      }
    });
    
    const result = await server.inspectVariables({
      tabId,
      expression
    });
    
    expect(result.success).toBe(true);
    expect(result.variableInspection.result.subtype).toBe('array');
    expect(result.variableInspection.result.preview).toBeDefined();
  });

  test('should handle evaluation errors gracefully', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const expression = 'nonExistentVariable';
    
    // Mock evaluation error
    mockClient.Runtime.evaluate.mockResolvedValue({
      exceptionDetails: {
        text: 'ReferenceError: nonExistentVariable is not defined',
        exception: {
          type: 'object',
          subtype: 'error',
          description: 'ReferenceError: nonExistentVariable is not defined'
        }
      }
    });
    
    const result = await server.inspectVariables({
      tabId,
      expression
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('ReferenceError');
    expect(result.variableInspection.error.type).toBe('EvaluationError');
  });

  test('should validate either objectId or expression is provided', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.inspectVariables({
      tabId
      // Missing both objectId and expression
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Either objectId or expression must be provided');
  });

  test('should handle circular references', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const objectId = 'obj-circular';
    
    // Mock circular structure
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [{
        name: 'self',
        value: {
          type: 'object',
          objectId: 'obj-circular', // Same as parent
          description: 'Object'
        }
      }]
    });
    
    const result = await server.inspectVariables({
      tabId,
      objectId,
      depth: 3
    });
    
    expect(result.success).toBe(true);
    // Should detect and handle circular reference
    expect(result.variableInspection.properties[0].value.circular).toBe(true);
  });

  test('should release objects after inspection to prevent memory leaks', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const objectId = 'obj-release';
    
    mockClient.Runtime.getProperties.mockResolvedValue({
      result: [{
        name: 'data',
        value: { type: 'string', value: 'test' }
      }]
    });
    
    const result = await server.inspectVariables({
      tabId,
      objectId,
      depth: 0
    });
    
    expect(result.success).toBe(true);
    // Objects at depth 0 should not be released (user might need them)
    expect(mockClient.Runtime.releaseObject).not.toHaveBeenCalled();
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.inspectVariables({
      tabId,
      expression: 'test'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should support preview generation for complex objects', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const expression = 'document.body';
    
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        type: 'object',
        subtype: 'node',
        objectId: 'node-123',
        description: 'body',
        preview: {
          type: 'object',
          subtype: 'node',
          description: 'body',
          properties: [
            { name: 'nodeType', type: 'number', value: '1' },
            { name: 'nodeName', type: 'string', value: 'BODY' }
          ]
        }
      }
    });
    
    const result = await server.inspectVariables({
      tabId,
      expression
    });
    
    expect(result.success).toBe(true);
    expect(result.variableInspection.result.preview).toBeDefined();
    expect(result.variableInspection.result.subtype).toBe('node');
  });
});