import 'dotenv/config';
import ChromeDevToolsMCPServer from '../../server';

jest.mock('chrome-remote-interface');

describe('Task v1.1.1-BF1.3: Add Graceful Error Recovery', () => {
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
  });

  afterEach(() => {
    server.clearStorage();
  });

  test('should recover from DOM.enable failure with meaningful error message', async () => {
    // Mock DOM.enable to fail
    const errorMessage = 'DOM agent is not available';
    mockClient.DOM.enable.mockRejectedValue(new Error(errorMessage));
    
    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Should return error response, not throw
    expect(result.success).toBe(false);
    expect(result.message).toContain('DOM agent failed to enable');
    expect(result.sourceFiles.error).toBeDefined();
    expect(result.sourceFiles.error.type).toBe('DOMEnableError');
    expect(result.sourceFiles.error.message).toContain(errorMessage);
    expect(result.sourceFiles.error.details).toBeDefined();
  });

  test('should handle stale DOM state and re-enable if needed', async () => {
    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    // First call succeeds
    await server.listSourceFiles({ tabId: mockTabId, includeContent: false });
    expect(mockClient.DOM.enable).toHaveBeenCalledTimes(1);
    
    // Simulate DOM becoming stale (e.g., page navigation)
    mockClient.DOM.getDocument.mockRejectedValueOnce(new Error('Could not find node with given id'));
    
    // Next call should handle the error gracefully
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false,
      fileTypes: ['html'] // Trigger DOM.getDocument
    });
    
    // Should still succeed despite DOM.getDocument error
    expect(result.success).toBe(true);
    expect(result.sourceFiles.files).toBeDefined();
    
    // HTML file should be included but without DOM node ID
    const htmlFile = result.sourceFiles.files.find((f: any) => f.type === 'html');
    expect(htmlFile).toBeDefined();
    expect(htmlFile.domNodeId).toBeUndefined(); // Failed to get DOM node
  });

  test('should provide clear error messages for different failure scenarios', async () => {
    const scenarios = [
      {
        error: new Error('Inspector is not connected'),
        expectedMessage: 'not connected',
        expectedType: 'DOMEnableError'
      },
      {
        error: new Error('Target closed'),
        expectedMessage: 'Target closed',
        expectedType: 'DOMEnableError'
      },
      {
        error: new Error('Protocol error'),
        expectedMessage: 'Protocol error',
        expectedType: 'DOMEnableError'
      }
    ];
    
    for (const scenario of scenarios) {
      jest.clearAllMocks();
      mockClient.DOM.enable.mockRejectedValue(scenario.error);
      
      // Add tab to connected clients
      server.clearStorage();
      server.addStorageEntry('clients', mockTabId, mockClient);
      
      const result = await server.listSourceFiles({ 
        tabId: mockTabId,
        includeContent: false 
      });
      
      expect(result.success).toBe(false);
      expect(result.sourceFiles.error.type).toBe(scenario.expectedType);
      expect(result.sourceFiles.error.message).toContain(scenario.expectedMessage);
    }
  });

  test('should suggest recovery actions in error messages', async () => {
    // Mock DOM.enable to fail
    mockClient.DOM.enable.mockRejectedValue(new Error('DOM agent failed'));
    
    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false 
    });

    // Error should include recovery suggestions
    expect(result.sourceFiles.error.recovery).toBeDefined();
    expect(result.sourceFiles.error.recovery).toContain('Try reconnecting');
    expect(result.sourceFiles.error.recovery).toContain('start_monitoring');
  });

  test('should handle DOM.getDocument failure gracefully without affecting other files', async () => {
    // Add tab to connected clients
    server.addStorageEntry('clients', mockTabId, mockClient);
    
    // Mock DOM.getDocument to fail
    mockClient.DOM.getDocument.mockRejectedValue(new Error('DOM not available'));
    
    // Mock Runtime.evaluate to return scripts
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        value: {
          scripts: [
            { src: 'app.js', inline: false },
            { src: null, inline: true, content: 'console.log("test");' }
          ],
          stylesheets: [
            { href: 'style.css', inline: false }
          ],
          documentURL: 'http://example.com',
          title: 'Test Page'
        }
      }
    });
    
    const result = await server.listSourceFiles({ 
      tabId: mockTabId,
      includeContent: false,
      fileTypes: ['js', 'css', 'html']
    });
    
    // Should still succeed
    expect(result.success).toBe(true);
    
    // Should have JS and CSS files
    const files = result.sourceFiles.files;
    expect(files.some((f: any) => f.type === 'js')).toBe(true);
    expect(files.some((f: any) => f.type === 'css')).toBe(true);
    
    // HTML file should still be included with basic info
    const htmlFile = files.find((f: any) => f.type === 'html');
    expect(htmlFile).toBeDefined();
    expect(htmlFile.url).toBe('http://example.com');
    expect(htmlFile.title).toBe('Test Page');
    expect(htmlFile.domError).toContain('DOM not available');
  });
});