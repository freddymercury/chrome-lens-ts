/**
 * Pure functions for retry logic and connection management
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Create a retry wrapper for async functions
 */
export function createRetryWrapper<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): () => Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 100,
    shouldRetry = () => true,
    onRetry
  } = options;

  return async (): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && shouldRetry(error)) {
          if (onRetry) {
            onRetry(attempt + 1, error);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  };
}

/**
 * Connection state management
 */
export interface ConnectionState {
  isConnected: boolean;
  lastActivity: number;
  reconnectAttempts: number;
  tabId: string;
}

/**
 * Check if a connection is stale
 */
export function isConnectionStale(
  state: ConnectionState, 
  maxIdleTime: number = 30000
): boolean {
  if (!state.isConnected) return true;
  return Date.now() - state.lastActivity > maxIdleTime;
}

/**
 * Determine if reconnection should be attempted
 */
export function shouldReconnect(
  state: ConnectionState, 
  maxAttempts: number = 3
): boolean {
  return !state.isConnected && state.reconnectAttempts < maxAttempts;
}

/**
 * Update connection state after activity
 */
export function updateConnectionActivity(
  state: ConnectionState
): ConnectionState {
  return {
    ...state,
    lastActivity: Date.now()
  };
}

/**
 * Mark connection as disconnected
 */
export function markDisconnected(
  state: ConnectionState
): ConnectionState {
  return {
    ...state,
    isConnected: false,
    reconnectAttempts: state.reconnectAttempts + 1
  };
}

/**
 * Mark connection as connected
 */
export function markConnected(
  state: ConnectionState
): ConnectionState {
  return {
    ...state,
    isConnected: true,
    reconnectAttempts: 0,
    lastActivity: Date.now()
  };
}

/**
 * Create initial connection state
 */
export function createConnectionState(tabId: string): ConnectionState {
  return {
    isConnected: false,
    lastActivity: 0,
    reconnectAttempts: 0,
    tabId
  };
}

/**
 * Check if data is too old
 */
export function isDataStale(
  timestamp: number,
  maxAge: number = 3600000 // 1 hour default
): boolean {
  return Date.now() - timestamp > maxAge;
}

/**
 * Filter stale entries from an array
 */
export function filterStaleEntries<T extends { timestamp?: number }>(
  entries: T[],
  maxAge: number = 3600000
): T[] {
  const now = Date.now();
  return entries.filter(entry => {
    if (!entry.timestamp) return true; // Keep entries without timestamps
    return (now - entry.timestamp) < maxAge;
  });
}

/**
 * Cleanup old data from maps
 */
export function cleanupOldData<T>(
  maps: Map<string, T[]>[],
  maxAge: number = 3600000
): void {
  const now = Date.now();
  
  maps.forEach(map => {
    for (const [key, entries] of map.entries()) {
      if (Array.isArray(entries)) {
        const filtered = entries.filter(e => {
          if (!(e as any).timestamp) return true;
          return (now - (e as any).timestamp) < maxAge;
        });
        
        if (filtered.length === 0) {
          map.delete(key);
        } else if (filtered.length < entries.length) {
          map.set(key, filtered);
        }
      }
    }
  });
}

/**
 * Safely access array with concurrent read protection
 */
export function safeArrayAccess<T>(
  array: T[],
  operation: (items: T[]) => any
): any {
  // Create a shallow copy to prevent concurrent modification issues
  const snapshot = [...array];
  return operation(snapshot);
}

/**
 * Chunk large arrays for processing
 */
export function chunkArray<T>(
  array: T[],
  chunkSize: number
): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process array in chunks with error handling
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = 100
): Promise<R[]> {
  const chunks = chunkArray(items, chunkSize);
  const results: R[] = [];
  
  for (const chunk of chunks) {
    try {
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
    } catch (error) {
      // Continue processing other chunks even if one fails
      console.error('Chunk processing failed:', error);
    }
  }
  
  return results;
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
    
    // Schedule for later
    if (timeout) clearTimeout(timeout);
    
    return new Promise((resolve) => {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        resolve(fn(...args));
      }, delay - timeSinceLastCall);
    });
  }) as T;
}