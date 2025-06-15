import {
  createRetryWrapper,
  isConnectionStale,
  shouldReconnect,
  updateConnectionActivity,
  markDisconnected,
  markConnected,
  createConnectionState,
  isDataStale,
  filterStaleEntries,
  cleanupOldData,
  safeArrayAccess,
  chunkArray,
  processInChunks,
  throttle
} from '../../src/utils/retry-wrapper';

describe('Retry Wrapper Utilities', () => {
  describe('createRetryWrapper', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('retries function on failure', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve('success');
      });

      const wrapped = createRetryWrapper(fn);
      
      const promise = wrapped();
      
      // Fast-forward through retries
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('respects max retries', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      const wrapped = createRetryWrapper(fn, { maxRetries: 2, retryDelay: 10 });
      
      await expect(wrapped()).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      jest.useFakeTimers(); // Restore fake timers
    });

    test('uses shouldRetry predicate', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Not retryable'));
      
      const wrapped = createRetryWrapper(fn, {
        shouldRetry: (error) => error.message === 'Retryable',
        retryDelay: 10
      });
      
      await expect(wrapped()).rejects.toThrow('Not retryable');
      expect(fn).toHaveBeenCalledTimes(2);
      
      jest.useFakeTimers(); // Restore fake timers
    });

    test('calls onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const wrapped = createRetryWrapper(fn, { onRetry });
      
      const promise = wrapped();
      await jest.runAllTimersAsync();
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error));
    });

    test('respects retry delay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const wrapped = createRetryWrapper(fn, { retryDelay: 500 });
      
      const promise = wrapped();
      
      // Should not retry immediately
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Advance time by less than delay
      jest.advanceTimersByTime(400);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Advance past delay
      jest.advanceTimersByTime(200);
      await jest.runAllTimersAsync();
      
      await promise;
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection state management', () => {
    test('detects stale connections', () => {
      const freshState = {
        isConnected: true,
        lastActivity: Date.now() - 1000,
        reconnectAttempts: 0,
        tabId: 'tab1'
      };
      expect(isConnectionStale(freshState)).toBe(false);

      const staleState = {
        isConnected: true,
        lastActivity: Date.now() - 40000,
        reconnectAttempts: 0,
        tabId: 'tab1'
      };
      expect(isConnectionStale(staleState)).toBe(true);

      const disconnectedState = {
        isConnected: false,
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        tabId: 'tab1'
      };
      expect(isConnectionStale(disconnectedState)).toBe(true);
    });

    test('determines reconnect eligibility', () => {
      expect(shouldReconnect({
        isConnected: false,
        lastActivity: 0,
        reconnectAttempts: 1,
        tabId: 'tab1'
      })).toBe(true);

      expect(shouldReconnect({
        isConnected: false,
        lastActivity: 0,
        reconnectAttempts: 3,
        tabId: 'tab1'
      })).toBe(false);

      expect(shouldReconnect({
        isConnected: true,
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        tabId: 'tab1'
      })).toBe(false);
    });

    test('updates connection activity', () => {
      const before = Date.now();
      const state = {
        isConnected: true,
        lastActivity: 0,
        reconnectAttempts: 0,
        tabId: 'tab1'
      };
      
      const updated = updateConnectionActivity(state);
      
      expect(updated.lastActivity).toBeGreaterThanOrEqual(before);
      expect(updated.isConnected).toBe(true);
      expect(updated.reconnectAttempts).toBe(0);
    });

    test('marks connection as disconnected', () => {
      const state = {
        isConnected: true,
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        tabId: 'tab1'
      };
      
      const disconnected = markDisconnected(state);
      
      expect(disconnected.isConnected).toBe(false);
      expect(disconnected.reconnectAttempts).toBe(1);
    });

    test('marks connection as connected', () => {
      const before = Date.now();
      const state = {
        isConnected: false,
        lastActivity: 0,
        reconnectAttempts: 5,
        tabId: 'tab1'
      };
      
      const connected = markConnected(state);
      
      expect(connected.isConnected).toBe(true);
      expect(connected.reconnectAttempts).toBe(0);
      expect(connected.lastActivity).toBeGreaterThanOrEqual(before);
    });

    test('creates initial connection state', () => {
      const state = createConnectionState('tab123');
      
      expect(state.tabId).toBe('tab123');
      expect(state.isConnected).toBe(false);
      expect(state.lastActivity).toBe(0);
      expect(state.reconnectAttempts).toBe(0);
    });
  });

  describe('Data staleness utilities', () => {
    test('identifies stale data', () => {
      const freshTimestamp = Date.now() - 1000;
      const staleTimestamp = Date.now() - 4000000;
      
      expect(isDataStale(freshTimestamp)).toBe(false);
      expect(isDataStale(staleTimestamp)).toBe(true);
      expect(isDataStale(freshTimestamp, 500)).toBe(true);
    });

    test('filters stale entries', () => {
      const entries = [
        { id: 1, timestamp: Date.now() - 1000 },
        { id: 2, timestamp: Date.now() - 4000000 },
        { id: 3 }, // No timestamp
        { id: 4, timestamp: Date.now() - 2000 }
      ];
      
      const filtered = filterStaleEntries(entries);
      
      expect(filtered).toHaveLength(3);
      expect(filtered.map(e => e.id)).toEqual([1, 3, 4]);
    });

    test('cleans up old data from maps', () => {
      const map1 = new Map<string, any[]>();
      const map2 = new Map<string, any[]>();
      
      map1.set('tab1', [
        { msg: 'fresh', timestamp: Date.now() - 1000 },
        { msg: 'old', timestamp: Date.now() - 4000000 }
      ]);
      map1.set('tab2', [
        { msg: 'all old', timestamp: Date.now() - 5000000 }
      ]);
      
      map2.set('tab3', [
        { msg: 'no timestamp' },
        { msg: 'fresh', timestamp: Date.now() }
      ]);
      
      cleanupOldData([map1, map2]);
      
      expect(map1.has('tab1')).toBe(true);
      expect(map1.get('tab1')).toHaveLength(1);
      expect(map1.has('tab2')).toBe(false);
      expect(map2.get('tab3')).toHaveLength(2);
    });
  });

  describe('Array utilities', () => {
    test('provides safe concurrent array access', () => {
      const array = [1, 2, 3, 4, 5];
      
      const result = safeArrayAccess(array, (items) => {
        // Modify the snapshot
        items.push(6);
        return items.length;
      });
      
      expect(result).toBe(6);
      expect(array).toHaveLength(5); // Original unchanged
    });

    test('chunks arrays correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const chunks = chunkArray(array, 3);
      
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    test('processes arrays in chunks', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const processor = jest.fn().mockImplementation((chunk: number[]) => 
        Promise.resolve(chunk.map(n => n * 2))
      );
      
      const results = await processInChunks(items, processor, 3);
      
      expect(processor).toHaveBeenCalledTimes(4);
      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    });

    test('continues processing when chunk fails', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const processor = jest.fn()
        .mockResolvedValueOnce([2, 4])
        .mockRejectedValueOnce(new Error('Chunk failed'))
        .mockResolvedValueOnce([10, 12]);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const results = await processInChunks(items, processor, 2);
      
      expect(results).toEqual([2, 4, 10, 12]);
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('throttles function calls', async () => {
      const fn = jest.fn().mockImplementation((x: number) => x * 2);
      const throttled = throttle(fn, 1000);
      
      // First call goes through immediately
      expect(throttled(1)).toBe(2);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Second call is throttled
      const promise = throttled(2);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Advance time
      jest.advanceTimersByTime(1000);
      await jest.runAllTimersAsync();
      
      expect(await promise).toBe(4);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('handles multiple throttled calls', async () => {
      const fn = jest.fn().mockImplementation((x: number) => x);
      const throttled = throttle(fn, 500);
      
      throttled(1); // Immediate
      throttled(2); // Throttled
      const p3 = throttled(3); // Replaces previous throttled
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(500);
      await jest.runAllTimersAsync();
      
      // Only the last throttled call should execute
      expect(await p3).toBe(3);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(3);
    });
  });
});