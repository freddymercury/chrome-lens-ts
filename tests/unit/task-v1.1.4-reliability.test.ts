import { ChromeDevToolsMCPServer } from '../../server';
import { jest } from '@jest/globals';
import { 
  createRetryWrapper,
  isConnectionStale,
  shouldReconnect,
  cleanupOldData
} from '../../src/utils/retry-wrapper';

describe('Task v1.1.4: Console and Network Reliability', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const VALID_TAB_ID = '1234567890ABCDEF1234567890ABCDEF'; // Valid 32-char hex

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    server = new ChromeDevToolsMCPServer();
    
    mockClient = {
      send: jest.fn(),
      Runtime: {
        enable: jest.fn()
      },
      Console: {
        enable: jest.fn()
      },
      Network: {
        enable: jest.fn()
      },
      on: jest.fn()
    };
    
    mockClient.send.mockResolvedValue({});
    mockClient.Runtime.enable.mockResolvedValue({});
    mockClient.Console.enable.mockResolvedValue({});
    mockClient.Network.enable.mockResolvedValue({});
    
    (server as any)['clients'].set(VALID_TAB_ID, mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    
    // Clear cleanup interval if it exists
    const cleanupInterval = (server as any)['cleanupInterval'];
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });

  describe('Pure Function: createRetryWrapper', () => {
    test('retries function on failure', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const wrapped = createRetryWrapper(fn as () => Promise<string>);
      const result = await wrapped();
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('respects max retries', async () => {
      const fn = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Always fails'));
      const wrapped = createRetryWrapper(fn, { maxRetries: 2 });
      
      await expect(wrapped()).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('uses shouldRetry predicate', async () => {
      const fn = jest.fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Not retryable'));
      
      const wrapped = createRetryWrapper(fn, {
        shouldRetry: (error) => error.message === 'Retryable'
      });
      
      await expect(wrapped()).rejects.toThrow('Not retryable');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pure Function: ensureConnected', () => {
    test('detects stale connections', () => {
      const freshState = {
        isConnected: true,
        lastActivity: Date.now() - 1000,
        reconnectAttempts: 0,
        tabId: VALID_TAB_ID
      };
      expect(isConnectionStale(freshState)).toBe(false);

      const staleState = {
        isConnected: true,
        lastActivity: Date.now() - 40000,
        reconnectAttempts: 0,
        tabId: VALID_TAB_ID
      };
      expect(isConnectionStale(staleState)).toBe(true);
    });

    test('determines reconnect eligibility', () => {
      expect(shouldReconnect({
        isConnected: false,
        lastActivity: 0,
        reconnectAttempts: 1,
        tabId: VALID_TAB_ID
      })).toBe(true);

      expect(shouldReconnect({
        isConnected: false,
        lastActivity: 0,
        reconnectAttempts: 3,
        tabId: VALID_TAB_ID
      })).toBe(false);

      expect(shouldReconnect({
        isConnected: true,
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        tabId: VALID_TAB_ID
      })).toBe(false);
    });
  });

  describe('Console message reliability', () => {
    beforeEach(() => {
      // Pre-populate some console messages
      const messages = [
        { level: 'log', text: 'Test message 1', timestamp: Date.now() - 1000 },
        { level: 'error', text: 'Test error', timestamp: Date.now() - 500 },
        { level: 'warn', text: 'Test warning', timestamp: Date.now() }
      ];
      (server as any)['consoleMessages'].set(VALID_TAB_ID, messages);
    });

    test('handles concurrent access safely', async () => {
      // Simulate concurrent reads
      const promises = Array(10).fill(null).map(() => 
        server.getConsoleMessages({ tabId: VALID_TAB_ID })
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results.every(r => r.success)).toBe(true);
      // All should return same data
      expect(results.every(r => r.console.totalMessages === 3)).toBe(true);
    });

    test('handles message buffer overflow', async () => {
      // Add many messages
      const manyMessages = Array(1500).fill(null).map((_, i) => ({
        level: 'log',
        text: `Message ${i}`,
        timestamp: Date.now() - i
      }));
      
      (server as any)['consoleMessages'].set(VALID_TAB_ID, manyMessages);
      
      const result = await server.getConsoleMessages({ 
        tabId: VALID_TAB_ID,
        limit: 1000 
      });
      
      expect(result.success).toBe(true);
      expect(result.console.returned).toBe(1000);
      expect(result.console.totalMessages).toBe(1500);
    });

    test('maintains message order during updates', async () => {
      const messages = (server as any)['consoleMessages'].get(VALID_TAB_ID);
      
      // Simulate new message arriving during read
      const readPromise = server.getConsoleMessages({ tabId: VALID_TAB_ID });
      
      messages.push({
        level: 'info',
        text: 'New message during read',
        timestamp: Date.now() + 100
      });
      
      const result = await readPromise;
      
      expect(result.success).toBe(true);
      // Original read should be consistent
      expect(result.console.messages.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Network monitoring reliability', () => {
    beforeEach(() => {
      const networkLogs = [
        {
          type: 'request',
          method: 'GET',
          url: 'http://example.com/api',
          timestamp: Date.now() - 1000
        },
        {
          type: 'response',
          status: 200,
          url: 'http://example.com/api',
          timestamp: Date.now() - 500
        }
      ];
      (server as any)['networkLogs'].set(VALID_TAB_ID, networkLogs);
    });

    test('handles large response bodies', async () => {
      const largeResponse = {
        type: 'response',
        status: 200,
        url: 'http://example.com/large',
        body: 'x'.repeat(1000000), // 1MB
        timestamp: Date.now()
      };
      
      const logs = (server as any)['networkLogs'].get(VALID_TAB_ID);
      logs.push(largeResponse);
      
      const result = await server.getNetworkActivity({ 
        tabId: VALID_TAB_ID,
        limit: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.network.returned).toBe(3);
    });

    test('filters incomplete requests safely', async () => {
      // Add incomplete request (no response yet)
      const logs = (server as any)['networkLogs'].get(VALID_TAB_ID);
      logs.push({
        type: 'request',
        method: 'POST',
        url: 'http://example.com/pending',
        timestamp: Date.now()
      });
      
      const result = await server.getNetworkActivity({ 
        tabId: VALID_TAB_ID,
        type: 'response'
      });
      
      expect(result.success).toBe(true);
      expect(result.network.activity.every((e: any) => e.type === 'response')).toBe(true);
    });

    test('handles rapid network activity', async () => {
      const logs = (server as any)['networkLogs'].get(VALID_TAB_ID);
      
      // Simulate burst of network activity
      const burst = Array(100).fill(null).map((_, i) => ({
        type: i % 2 === 0 ? 'request' : 'response',
        method: 'GET',
        url: `http://example.com/burst/${i}`,
        timestamp: Date.now() + i
      }));
      
      logs.push(...burst);
      
      const result = await server.getNetworkActivity({ 
        tabId: VALID_TAB_ID,
        limit: 50
      });
      
      expect(result.success).toBe(true);
      expect(result.network.returned).toBe(50);
      expect(result.network.totalEntries).toBe(102);
    });
  });

  describe('Connection state management', () => {
    test('verifies client connection before operations', async () => {
      // Remove client to simulate disconnection
      (server as any)['clients'].delete(VALID_TAB_ID);
      
      const consoleResult = await server.getConsoleMessages({ tabId: VALID_TAB_ID });
      expect(consoleResult.success).toBe(true); // Should still work with stored data
      
      const networkResult = await server.getNetworkActivity({ tabId: VALID_TAB_ID });
      expect(networkResult.success).toBe(true); // Should still work with stored data
    });

    test('cleans up stale data periodically', () => {
      // Add old data
      const oldTimestamp = Date.now() - 3700000; // Over 1 hour old
      const oldMessages = [
        { level: 'log', text: 'Old message', timestamp: oldTimestamp }
      ];
      
      (server as any)['consoleMessages'].set('old-tab', oldMessages);
      
      // Use the imported cleanupOldData function
      const consoleMap = (server as any)['consoleMessages'];
      cleanupOldData([consoleMap]);
      
      expect(consoleMap.has('old-tab')).toBe(false);
    });
  });

  describe('Error recovery strategies', () => {
    test('gracefully handles Chrome API errors', async () => {
      // Make client methods throw errors
      mockClient.Runtime.enable.mockRejectedValueOnce(new Error('Chrome API error'));
      
      // Should still return stored data
      const result = await server.getConsoleMessages({ tabId: VALID_TAB_ID });
      
      expect(result.success).toBe(true);
      expect(result.console.messages).toBeDefined();
    });

    test('provides fallback for missing data', async () => {
      // No stored data for this tab
      const newTabId = 'ABCDEF1234567890ABCDEF1234567890'; // Different valid tab ID
      const result = await server.getConsoleMessages({ tabId: newTabId });
      
      expect(result.success).toBe(true);
      expect(result.console.totalMessages).toBe(0);
      expect(result.console.messages).toEqual([]);
    });
  });
});