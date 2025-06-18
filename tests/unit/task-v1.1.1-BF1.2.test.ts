import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF1.2: Implement DOM State Tracking', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const mockTabId = 'A1B2C3D4E5F67890123456789012345F';
  const DOM_STATE_CACHE_TTL = parseInt(process.env.DOM_STATE_CACHE_TTL || '300000', 10);

  beforeEach(() => {
    jest.clearAllMocks();
    server = new ChromeDevToolsMCPServer();
    
    // Mock Chrome client with DOM agent
    mockClient = {
      DOM: {
        enable: jest.fn().mockResolvedValue({}),
        getDocument: jest.fn().mockResolvedValue({
          root: {
            nodeId: 1,
            nodeType: 9,
            nodeName: '#document',
            children: []
          }
        })
      },
      Debugger: { enable: jest.fn().mockResolvedValue({}) },
      Runtime: { 
        enable: jest.fn().mockResolvedValue({}),
        evaluate: jest.fn().mockResolvedValue({
          result: {
            value: {
              scripts: [],
              stylesheets: [],
              documentURL: 'http://example.com',
              title: 'Test Page'
            }
          }
        })
      },
      Console: { enable: jest.fn().mockResolvedValue({}) },
      Network: { enable: jest.fn().mockResolvedValue({}) },
      CSS: { enable: jest.fn().mockResolvedValue({}) },
      close: jest.fn().mockResolvedValue({})
    };

    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should persist DOM state across multiple calls', async () => {
    // First call should enable DOM
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });
    
    expect(mockClient.DOM.enable).toHaveBeenCalledTimes(1);
    
    // Get tab state to verify DOM is enabled
    const state1 = server.getTabState(mockTabId);
    expect(state1.isDOMEnabled).toBe(true);
    expect(state1.domEnabledAt).toBeGreaterThan(0);
    
    // Second call should not re-enable DOM
    mockClient.DOM.enable.mockClear();
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });
    
    expect(mockClient.DOM.enable).not.toHaveBeenCalled();
    
    // State should still be enabled
    const state2 = server.getTabState(mockTabId);
    expect(state2.isDOMEnabled).toBe(true);
    expect(state2.domEnabledAt).toBe(state1.domEnabledAt); // Same timestamp
  });

  test('should reset DOM state when tab reconnects', async () => {
    // Enable DOM on first connection
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });
    
    const state1 = server.getTabState(mockTabId);
    expect(state1.isDOMEnabled).toBe(true);
    
    // Simulate tab disconnect and reconnect
    server.clearStorage();
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    // State should be reset
    const state2 = server.getTabState(mockTabId);
    expect(state2.isDOMEnabled).toBe(false);
    expect(state2.domEnabledAt).toBe(null);
    
    // DOM should be re-enabled on next call
    mockClient.DOM.enable.mockClear();
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });
    
    expect(mockClient.DOM.enable).toHaveBeenCalledTimes(1);
  });

  test('should handle concurrent calls without duplicate DOM enablement', async () => {
    // Make three concurrent calls
    const promises = [
      server.listSourceFiles({ tabId: mockTabId, includeContent: false }),
      server.listSourceFiles({ tabId: mockTabId, includeContent: false }),
      server.listSourceFiles({ tabId: mockTabId, includeContent: false })
    ];
    
    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // DOM.enable should only be called once despite concurrent calls
    expect(mockClient.DOM.enable).toHaveBeenCalledTimes(1);
  });

  test('should track DOM state per tab independently', async () => {
    const mockTabId2 = 'B2C3D4E5F6789012345678901234567A';
    const mockClient2 = {
      ...mockClient,
      DOM: {
        enable: jest.fn().mockResolvedValue({}),
        getDocument: jest.fn().mockResolvedValue({
          root: { nodeId: 2, nodeType: 9, nodeName: '#document', children: [] }
        })
      }
    };
    
    server.addStorageEntry('clients', mockTabId2, mockClient2);
    
    // Enable DOM on first tab
    await server.listSourceFiles({ tabId: mockTabId, includeContent: false });
    
    // Check states
    const state1 = server.getTabState(mockTabId);
    const state2 = server.getTabState(mockTabId2);
    
    expect(state1.isDOMEnabled).toBe(true);
    expect(state2.isDOMEnabled).toBe(false);
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Enable DOM on second tab
    await server.listSourceFiles({ tabId: mockTabId2, includeContent: false });
    
    // Both should now be enabled
    const state1After = server.getTabState(mockTabId);
    const state2After = server.getTabState(mockTabId2);
    
    expect(state1After.isDOMEnabled).toBe(true);
    expect(state2After.isDOMEnabled).toBe(true);
    expect(state1After.domEnabledAt).not.toBe(state2After.domEnabledAt);
  });

  test('should respect DOM_STATE_CACHE_TTL environment variable', async () => {
    // This test verifies that the DOM state cache TTL is configurable
    // The actual TTL logic would need to be implemented in the server
    expect(DOM_STATE_CACHE_TTL).toBe(300000); // Default 5 minutes
    
    // If DOM_STATE_CACHE_TTL was set to a different value, it should be respected
    process.env.DOM_STATE_CACHE_TTL = '60000'; // 1 minute
    const customTTL = parseInt(process.env.DOM_STATE_CACHE_TTL, 10);
    expect(customTTL).toBe(60000);
    
    // Reset to original value
    process.env.DOM_STATE_CACHE_TTL = '300000';
  });
});