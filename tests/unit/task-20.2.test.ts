import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.EVENT_MONITORING_ENABLED = 'true';
process.env.MAX_EVENT_BUFFER_SIZE = '1000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 20.2: Real-time Event Monitoring', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client with event emitters
    const eventHandlers = new Map();
    mockClient = {
      send: jest.fn(),
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        eventHandlers.set(event, handler);
      }),
      off: jest.fn((event: string) => {
        eventHandlers.delete(event);
      }),
      emit: (event: string, data: any) => {
        const handler = eventHandlers.get(event);
        if (handler) handler(data);
      },
      DOM: {
        enable: jest.fn(() => Promise.resolve({})),
        getDocument: jest.fn(() => Promise.resolve({ root: { nodeId: 1 } }))
      },
      Console: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      Network: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      Runtime: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      Performance: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      Security: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      DOMStorage: {
        enable: jest.fn(() => Promise.resolve({}))
      },
      Debugger: {
        enable: jest.fn(() => Promise.resolve({}))
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should enable event monitoring for specified event types', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.monitorEvents({
      tabId,
      eventTypes: ['dom', 'console', 'network'],
      realtime: true
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.DOM.enable).toHaveBeenCalled();
    expect(mockClient.Console.enable).toHaveBeenCalled();
    expect(mockClient.Network.enable).toHaveBeenCalled();
    expect(result.eventMonitoring.monitoring).toBe(true);
    expect(result.eventMonitoring.eventTypes).toEqual(['dom', 'console', 'network']);
  });

  test('should monitor DOM events', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['dom'],
      bufferSize: 10
    });
    
    // Get event monitor
    const monitor = server.getEventMonitor(tabId);
    expect(monitor).toBeDefined();
    
    // Simulate DOM mutation event
    const domEvent = {
      nodeId: 123,
      type: 'childNodeInserted',
      parentNodeId: 1,
      previousNodeId: 122
    };
    
    mockClient.emit('DOM.childNodeInserted', domEvent);
    
    // Check event was captured
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('dom');
    expect(events[0].eventName).toBe('childNodeInserted');
    expect(events[0].data.nodeId).toBe(123);
  });

  test('should monitor console events with severity filtering', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['console'],
      filters: {
        severity: 'warning'
      }
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate console events
    mockClient.emit('Console.messageAdded', {
      message: {
        level: 'info',
        text: 'Info message',
        source: 'console-api'
      }
    });
    
    mockClient.emit('Console.messageAdded', {
      message: {
        level: 'warning',
        text: 'Warning message',
        source: 'console-api'
      }
    });
    
    mockClient.emit('Console.messageAdded', {
      message: {
        level: 'error',
        text: 'Error message',
        source: 'console-api'
      }
    });
    
    // Only warning and error should be captured
    const events = monitor!.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].data.level).toBe('warning');
    expect(events[1].data.level).toBe('error');
  });

  test('should monitor network events with URL filtering', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['network'],
      filters: {
        url: 'api/'
      }
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate network events
    mockClient.emit('Network.requestWillBeSent', {
      requestId: 'req-1',
      request: {
        url: 'http://example.com/style.css',
        method: 'GET'
      },
      timestamp: Date.now() / 1000
    });
    
    mockClient.emit('Network.requestWillBeSent', {
      requestId: 'req-2',
      request: {
        url: 'http://example.com/api/data',
        method: 'GET'
      },
      timestamp: Date.now() / 1000
    });
    
    // Only API request should be captured
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].data.url).toContain('api/');
  });

  test('should monitor script events', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['script']
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate script parsing
    mockClient.emit('Debugger.scriptParsed', {
      scriptId: 'script-123',
      url: 'http://example.com/app.js',
      startLine: 0,
      startColumn: 0,
      endLine: 100,
      endColumn: 0,
      hash: 'abc123'
    });
    
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('script');
    expect(events[0].eventName).toBe('scriptParsed');
    expect(events[0].data.scriptId).toBe('script-123');
  });

  test('should monitor performance events', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['performance']
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate performance metrics
    mockClient.emit('Performance.metrics', {
      metrics: [
        { name: 'JSHeapUsedSize', value: 1000000 },
        { name: 'JSHeapTotalSize', value: 2000000 }
      ],
      title: 'Performance Metrics'
    });
    
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('performance');
    expect(events[0].data.metrics).toBeDefined();
  });

  test('should monitor security events', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['security']
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate security state change
    mockClient.emit('Security.securityStateChanged', {
      securityState: 'insecure',
      schemeIsCryptographic: false,
      explanations: [{
        securityState: 'insecure',
        title: 'Mixed Content',
        summary: 'Page loaded over HTTPS but contains HTTP resources'
      }]
    });
    
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('security');
    expect(events[0].data.securityState).toBe('insecure');
  });

  test('should monitor storage events', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['storage']
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Simulate localStorage change
    mockClient.emit('DOMStorage.domStorageItemAdded', {
      storageId: {
        securityOrigin: 'http://example.com',
        isLocalStorage: true
      },
      key: 'user',
      newValue: 'john'
    });
    
    const events = monitor!.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('storage');
    expect(events[0].data.key).toBe('user');
  });

  test('should respect buffer size limit', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const bufferSize = 5;
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['console'],
      bufferSize,
      realtime: false
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Emit more events than buffer size
    for (let i = 0; i < 10; i++) {
      mockClient.emit('Console.messageAdded', {
        message: {
          level: 'log',
          text: `Message ${i}`,
          source: 'console-api'
        }
      });
    }
    
    // Should only keep last 5 events
    const events = monitor!.getEvents();
    expect(events.length).toBe(bufferSize);
    expect(events[0].data.text).toBe('Message 5');
    expect(events[4].data.text).toBe('Message 9');
  });

  test('should stream events in real-time mode', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.monitorEvents({
      tabId,
      eventTypes: ['all'],
      realtime: true
    });
    
    expect(result.success).toBe(true);
    expect(result.eventMonitoring.mode).toBe('realtime');
    
    // In real-time mode, events should be available immediately
    const monitor = server.getEventMonitor(tabId);
    expect(monitor).toBeDefined();
    expect(monitor!.isRealtime()).toBe(true);
  });

  test('should stop monitoring when requested', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['console']
    });
    
    // Stop monitoring
    const stopResult = await server.stopEventMonitoring(tabId);
    expect(stopResult.success).toBe(true);
    
    // Emit event after stopping
    mockClient.emit('Console.messageAdded', {
      message: { level: 'log', text: 'Should not capture' }
    });
    
    // No new events should be captured
    const monitor = server.getEventMonitor(tabId);
    expect(monitor).toBeUndefined();
  });

  test('should handle tab not connected error', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.monitorEvents({
      tabId,
      eventTypes: ['all']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should filter events by name pattern', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    await server.monitorEvents({
      tabId,
      eventTypes: ['dom'],
      filters: {
        eventName: 'Node'
      }
    });
    
    const monitor = server.getEventMonitor(tabId);
    
    // Emit various DOM events
    mockClient.emit('DOM.childNodeInserted', { nodeId: 1 });
    mockClient.emit('DOM.attributeModified', { nodeId: 2 });
    mockClient.emit('DOM.childNodeRemoved', { nodeId: 3 });
    
    // Only node-related events should be captured
    const events = monitor!.getEvents();
    expect(events.length).toBe(2);
    expect(events[0].eventName).toContain('Node');
    expect(events[1].eventName).toContain('Node');
  });
});