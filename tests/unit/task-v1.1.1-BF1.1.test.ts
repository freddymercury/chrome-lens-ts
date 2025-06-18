import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF1.1: Add DOM Agent Auto-Enable Logic', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const mockTabId = 'A1B2C3D4E5F67890123456789012345F';

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

  test('should automatically enable DOM agent on first call to list_source_files', async () => {
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Verify DOM.enable was called
    expect(mockClient.DOM.enable).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  test('should not re-enable DOM agent if already enabled', async () => {
    // First call
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Reset mock call count
    mockClient.DOM.enable.mockClear();

    // Second call
    await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Verify DOM.enable was NOT called again
    expect(mockClient.DOM.enable).not.toHaveBeenCalled();
  });

  test('should handle DOM.enable failure gracefully', async () => {
    // Mock DOM.enable to fail
    mockClient.DOM.enable.mockRejectedValue(new Error('DOM agent failed to enable'));

    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Should return error response, not throw
    expect(result.success).toBe(false);
    expect(result.message).toContain('DOM agent');
    expect(result.sourceFiles.error).toBeDefined();
    expect(result.sourceFiles.error.type).toBe('DOMEnableError');
  });

  test('should verify isDOMEnabled flag is set after successful enable', async () => {
    // This test assumes we have a way to check DOM state
    // Will fail initially as the flag doesn't exist yet
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    expect(result.success).toBe(true);
    
    // Check if DOM is enabled (this will need implementation)
    const tabState = (server as any).getTabState?.(mockTabId);
    expect(tabState?.isDOMEnabled).toBe(true);
  });

  test('should call DOM.getDocument after enabling DOM', async () => {
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false,
      fileTypes: ['html'] // Request HTML to trigger DOM usage
    });

    // Verify sequence: enable then getDocument
    const enableOrder = mockClient.DOM.enable.mock.invocationCallOrder[0];
    const getDocumentOrder = mockClient.DOM.getDocument.mock.invocationCallOrder[0];
    expect(enableOrder).toBeLessThan(getDocumentOrder);
    expect(mockClient.DOM.getDocument).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});