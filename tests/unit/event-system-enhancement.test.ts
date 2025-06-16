import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { EventStreamManager } from '../../src/event-system/event-stream-manager.js';
import { EventStreamConfig, StreamEvent } from '../../src/types/event-system.js';

describe('Event System Enhancement - Event Stream Manager', () => {
  let streamManager: EventStreamManager;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      Console: {
        enable: jest.fn(() => Promise.resolve({})),
        messageAdded: jest.fn()
      },
      Network: {
        enable: jest.fn(() => Promise.resolve({})),
        requestWillBeSent: jest.fn(),
        responseReceived: jest.fn()
      },
      DOM: {
        enable: jest.fn(() => Promise.resolve({})),
        childNodeInserted: jest.fn(),
        attributeModified: jest.fn()
      },
      Runtime: {
        enable: jest.fn(() => Promise.resolve({})),
        consoleAPICalled: jest.fn(),
        exceptionThrown: jest.fn()
      },
      on: jest.fn(),
      off: jest.fn()
    };
  });

  describe('EventStreamManager creation', () => {
    test('should create with default configuration', () => {
      streamManager = new EventStreamManager(mockClient);
      expect(streamManager).toBeDefined();
      expect(streamManager.getActiveStreams()).toEqual([]);
      expect(streamManager.isStreaming()).toBe(false);
    });

    test('should create with custom configuration', () => {
      const config: EventStreamConfig = {
        bufferSize: 1000,
        throttleMs: 50,
        enableCompression: true,
        eventTypes: ['console', 'network']
      };
      
      streamManager = new EventStreamManager(mockClient, config);
      const actualConfig = streamManager.getConfig();
      expect(actualConfig.bufferSize).toEqual(config.bufferSize);
      expect(actualConfig.throttleMs).toEqual(config.throttleMs);
      expect(actualConfig.enableCompression).toEqual(config.enableCompression);
      expect(actualConfig.eventTypes).toEqual(config.eventTypes);
    });
  });

  describe('Stream lifecycle', () => {
    beforeEach(() => {
      streamManager = new EventStreamManager(mockClient);
    });

    test('should start streaming with specific event types', async () => {
      const streamId = await streamManager.startStream({
        eventTypes: ['console', 'network'],
        filters: {}
      });

      expect(streamId).toBeTruthy();
      expect(streamManager.isStreaming()).toBe(true);
      expect(streamManager.getActiveStreams()).toContain(streamId);
      
      // Verify domains are enabled
      expect(mockClient.Console.enable).toHaveBeenCalled();
      expect(mockClient.Network.enable).toHaveBeenCalled();
      expect(mockClient.DOM.enable).not.toHaveBeenCalled();
    });

    test('should stop specific stream', async () => {
      const streamId = await streamManager.startStream({
        eventTypes: ['console'],
        filters: {}
      });

      const stopped = await streamManager.stopStream(streamId);
      expect(stopped).toBe(true);
      expect(streamManager.getActiveStreams()).not.toContain(streamId);
      expect(streamManager.isStreaming()).toBe(false);
    });

    test('should handle multiple concurrent streams', async () => {
      const stream1 = await streamManager.startStream({
        eventTypes: ['console'],
        filters: { level: 'error' }
      });

      const stream2 = await streamManager.startStream({
        eventTypes: ['network'],
        filters: { method: 'POST' }
      });

      expect(streamManager.getActiveStreams()).toHaveLength(2);
      expect(streamManager.isStreaming()).toBe(true);

      await streamManager.stopStream(stream1);
      expect(streamManager.getActiveStreams()).toHaveLength(1);
      expect(streamManager.isStreaming()).toBe(true);

      await streamManager.stopStream(stream2);
      expect(streamManager.isStreaming()).toBe(false);
    });
  });

  describe('Event filtering and processing', () => {
    beforeEach(() => {
      streamManager = new EventStreamManager(mockClient);
    });

    test('should filter console events by level', async () => {
      const events: StreamEvent[] = [];
      await streamManager.startStream({
        eventTypes: ['console'],
        filters: { level: 'error' },
        onEvent: (event) => events.push(event)
      });

      // Simulate console messages
      const errorMessage = {
        level: 'error',
        text: 'Error occurred',
        timestamp: Date.now()
      };
      const infoMessage = {
        level: 'info',
        text: 'Info message',
        timestamp: Date.now()
      };

      // Trigger event handlers
      const consoleHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Console.messageAdded'
      )?.[1];

      consoleHandler?.({ message: errorMessage });
      consoleHandler?.({ message: infoMessage });

      // Only error message should pass filter
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual(errorMessage);
      expect(events[0].type).toBe('console');
    });

    test('should filter network events by URL pattern', async () => {
      const events: StreamEvent[] = [];
      await streamManager.startStream({
        eventTypes: ['network'],
        filters: { urlPattern: /api\/.*/ },
        onEvent: (event) => events.push(event)
      });

      // Simulate network requests
      const apiRequest = {
        request: { url: 'https://example.com/api/users' },
        timestamp: Date.now()
      };
      const pageRequest = {
        request: { url: 'https://example.com/page.html' },
        timestamp: Date.now()
      };

      // Trigger event handlers
      const networkHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Network.requestWillBeSent'
      )?.[1];

      networkHandler?.(apiRequest);
      networkHandler?.(pageRequest);

      // Only API request should pass filter
      expect(events).toHaveLength(1);
      expect(events[0].data).toEqual(apiRequest);
    });
  });

  describe('Event buffering and throttling', () => {
    beforeEach(() => {
      streamManager = new EventStreamManager(mockClient, {
        bufferSize: 5,
        throttleMs: 100
      });
    });

    test('should respect buffer size limit', async () => {
      const events: StreamEvent[] = [];
      await streamManager.startStream({
        eventTypes: ['console'],
        onEvent: (event) => events.push(event)
      });

      const consoleHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Console.messageAdded'
      )?.[1];

      // Send more events than buffer size
      for (let i = 0; i < 10; i++) {
        consoleHandler?.({ 
          message: { 
            level: 'log', 
            text: `Message ${i}`,
            timestamp: Date.now()
          } 
        });
      }

      // Buffer should maintain size limit
      const buffer = streamManager.getEventBuffer();
      expect(buffer.length).toBeLessThanOrEqual(5);
    });

    test('should throttle event emissions', async () => {
      jest.useFakeTimers();
      const events: StreamEvent[] = [];
      
      await streamManager.startStream({
        eventTypes: ['console'],
        onEvent: (event) => events.push(event)
      });

      const consoleHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Console.messageAdded'
      )?.[1];

      // Send multiple events rapidly
      for (let i = 0; i < 5; i++) {
        consoleHandler?.({ 
          message: { 
            level: 'log', 
            text: `Message ${i}`,
            timestamp: Date.now()
          } 
        });
      }

      // Immediately, should have throttled
      expect(events.length).toBeLessThan(5);

      // After throttle period, all events should be processed
      jest.advanceTimersByTime(100);
      expect(events.length).toBe(5);

      jest.useRealTimers();
    });
  });

  describe('Stream statistics and monitoring', () => {
    beforeEach(() => {
      streamManager = new EventStreamManager(mockClient);
    });

    test('should track stream statistics', async () => {
      const streamId = await streamManager.startStream({
        eventTypes: ['console', 'network']
      });

      const consoleHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Console.messageAdded'
      )?.[1];
      const networkHandler = mockClient.on.mock.calls.find(
        (call: any) => call[0] === 'Network.requestWillBeSent'
      )?.[1];

      // Generate some events
      consoleHandler?.({ message: { level: 'log', text: 'Test' } });
      consoleHandler?.({ message: { level: 'error', text: 'Error' } });
      networkHandler?.({ request: { url: 'https://example.com' } });

      const stats = streamManager.getStreamStatistics(streamId);
      expect(stats).toEqual({
        streamId,
        eventCounts: {
          console: 2,
          network: 1
        },
        totalEvents: 3,
        startTime: expect.any(Number),
        duration: expect.any(Number),
        averageEventRate: expect.any(Number)
      });
    });

    test('should provide global statistics', async () => {
      await streamManager.startStream({ eventTypes: ['console'] });
      await streamManager.startStream({ eventTypes: ['network'] });

      const globalStats = streamManager.getGlobalStatistics();
      expect(globalStats).toEqual({
        activeStreams: 2,
        totalStreamsCreated: 2,
        totalEventsProcessed: 0,
        uptime: expect.any(Number)
      });
    });
  });
});