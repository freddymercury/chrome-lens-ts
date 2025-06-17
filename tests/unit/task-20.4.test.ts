import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.STATE_MONITORING_ENABLED = 'true';
process.env.MAX_WATCH_EXPRESSIONS = '100';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 20.4: State Change Monitoring Implementation', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client with state evaluation
    mockClient = {
      send: jest.fn(),
      Runtime: {
        enable: jest.fn(() => Promise.resolve({})),
        evaluate: jest.fn(),
        callFunctionOn: jest.fn(),
        getProperties: jest.fn()
      },
      Debugger: {
        enable: jest.fn(() => Promise.resolve({})),
        pause: jest.fn(() => Promise.resolve({})),
        resume: jest.fn(() => Promise.resolve({})),
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

  test('should start watching state changes for specified expressions', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock evaluate responses
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { type: 'string', value: 'initial' } })
      .mockResolvedValueOnce({ result: { type: 'number', value: 42 } });
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [
        { name: 'location', expression: 'window.location.href' },
        { name: 'counter', expression: 'window.myCounter' }
      ],
      interval: 500
    });
    
    expect(result.success).toBe(true);
    expect(result.stateWatching.watching).toBe(true);
    expect(result.stateWatching.expressions).toHaveLength(2);
    expect(result.stateWatching.interval).toBe(500);
    expect(mockClient.Runtime.evaluate).toHaveBeenCalledTimes(2);
  });

  test('should detect state changes when values change', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock changing values
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { type: 'string', value: 'initial' } })
      .mockResolvedValueOnce({ result: { type: 'string', value: 'changed' } });
    
    await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'test', expression: 'window.testValue' }],
      interval: 100
    });
    
    // Get state watcher
    const watcher = server.getStateWatcher(tabId);
    expect(watcher).toBeDefined();
    
    // Wait for change detection
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const changes = watcher!.getChanges();
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].name).toBe('test');
    expect(changes[0].oldValue).toBe('initial');
    expect(changes[0].newValue).toBe('changed');
  });

  test('should perform deep equality checks when deepWatch is enabled', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock object values
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 3 } }; // Deep change
    
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { type: 'object', value: obj1, objectId: 'obj1' } })
      .mockResolvedValueOnce({ result: { type: 'object', value: obj2, objectId: 'obj2' } });
    
    mockClient.Runtime.callFunctionOn
      .mockResolvedValue({ result: { type: 'string', value: JSON.stringify(obj1) } })
      .mockResolvedValue({ result: { type: 'string', value: JSON.stringify(obj2) } });
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'obj', expression: 'window.myObject' }],
      deepWatch: true,
      interval: 100
    });
    
    expect(result.success).toBe(true);
    expect(result.stateWatching.deepWatch).toBe(true);
  });

  test('should evaluate expressions in local context when specified', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock debugger state
    const debuggerState = {
      isPaused: true,
      callFrames: [{
        callFrameId: 'frame-1',
        functionName: 'testFunction',
        scopeChain: [{ type: 'local' }]
      }]
    };
    server.updateDebuggerState(tabId, debuggerState);
    
    mockClient.Debugger.evaluateOnCallFrame
      .mockResolvedValue({ result: { type: 'string', value: 'local value' } });
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'localVar', expression: 'myLocalVar', context: 'local' }],
      interval: 500
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.evaluateOnCallFrame).toHaveBeenCalledWith({
      callFrameId: 'frame-1',
      expression: 'myLocalVar',
      returnByValue: false
    });
  });

  test('should include call stack when changes are detected and includeCallStack is true', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock changing value and call stack
    mockClient.Runtime.evaluate
      .mockResolvedValueOnce({ result: { type: 'number', value: 1 } })
      .mockResolvedValueOnce({ result: { type: 'number', value: 2 } })
      .mockResolvedValueOnce({
        result: {
          type: 'object',
          value: [
            { functionName: 'updateCounter', url: 'app.js', lineNumber: 10 },
            { functionName: 'main', url: 'app.js', lineNumber: 5 }
          ]
        }
      });
    
    await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'counter', expression: 'window.counter' }],
      interval: 100,
      includeCallStack: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const watcher = server.getStateWatcher(tabId);
    const changes = watcher!.getChanges();
    
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].callStack).toBeDefined();
  });

  test('should stop watching when requested', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    mockClient.Runtime.evaluate
      .mockResolvedValue({ result: { type: 'string', value: 'test' } });
    
    await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'test', expression: 'window.test' }]
    });
    
    const stopResult = await server.stopStateWatching(tabId);
    expect(stopResult.success).toBe(true);
    
    const watcher = server.getStateWatcher(tabId);
    expect(watcher).toBeUndefined();
  });

  test('should handle evaluation errors gracefully', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock evaluation error
    mockClient.Runtime.evaluate
      .mockResolvedValue({
        exceptionDetails: {
          text: 'ReferenceError: undefinedVar is not defined'
        }
      });
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'bad', expression: 'undefinedVar' }]
    });
    
    expect(result.success).toBe(true);
    expect(result.stateWatching.expressions[0].error).toBeDefined();
    expect(result.stateWatching.expressions[0].error).toContain('ReferenceError');
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'test', expression: 'window.test' }]
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should enforce maximum watch expressions limit', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Create more than max expressions
    const expressions = [];
    for (let i = 0; i < 150; i++) {
      expressions.push({ name: `expr${i}`, expression: `window.var${i}` });
    }
    
    const result = await server.watchStateChanges({
      tabId,
      expressions,
      interval: 1000
    });
    
    // Should succeed but limit expressions
    expect(result.success).toBe(true);
    expect(result.stateWatching.expressions.length).toBeLessThanOrEqual(100);
  });

  test('should handle circular references in objects when deepWatch is enabled', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock circular object
    mockClient.Runtime.evaluate
      .mockResolvedValue({
        result: {
          type: 'object',
          objectId: 'circular-obj',
          description: 'Object with circular reference'
        }
      });
    
    mockClient.Runtime.callFunctionOn
      .mockResolvedValue({
        result: {
          type: 'string',
          value: '{"a":1,"b":{"c":"[Circular]"}}'
        }
      });
    
    const result = await server.watchStateChanges({
      tabId,
      expressions: [{ name: 'circular', expression: 'window.circularObj' }],
      deepWatch: true
    });
    
    expect(result.success).toBe(true);
    // Should handle circular reference without crashing
  });
});