import ChromeDevToolsMCPServer from '../../server';
import { jest } from '@jest/globals';

describe('list_source_files pagination integration', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const VALID_TAB_ID = '1234567890ABCDEF1234567890ABCDEF';

  beforeEach(() => {
    // Don't mock console to see errors
    // jest.spyOn(console, 'log').mockImplementation(() => {});
    // jest.spyOn(console, 'error').mockImplementation(() => {});
    
    server = new ChromeDevToolsMCPServer();
    
    mockClient = {
      send: jest.fn(),
      Debugger: {
        enable: jest.fn(),
        getScriptSource: jest.fn()
      },
      DOM: {
        enable: jest.fn(),
        getDocument: jest.fn(),
        querySelectorAll: jest.fn()
      },
      Page: {
        enable: jest.fn(),
        getResourceTree: jest.fn()
      },
      CSS: {
        enable: jest.fn()
      },
      Runtime: {
        enable: jest.fn(),
        evaluate: jest.fn()
      },
      on: jest.fn()
    };
    
    mockClient.send.mockResolvedValue({});
    mockClient.Debugger.enable.mockResolvedValue({});
    mockClient.DOM.enable.mockResolvedValue({});
    mockClient.Page.enable.mockResolvedValue({});
    mockClient.CSS.enable.mockResolvedValue({});
    mockClient.Runtime.enable.mockResolvedValue({});
    
    // Mock Runtime.evaluate for getting scripts and stylesheets
    mockClient.Runtime.evaluate.mockResolvedValue({
      result: {
        value: {
          scripts: [],
          stylesheets: [],
          documentURL: 'http://localhost',
          title: 'Test Page'
        }
      }
    });
    
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

  describe('Response size limiting', () => {
    beforeEach(() => {
      // Create many source files to test pagination
      const sourceFiles = Array.from({ length: 500 }, (_, i) => ({
        scriptId: `script${i}`,
        url: `http://localhost/src/file${i}.js`,
        hasSourceURL: false,
        isModule: true,
        length: 10000 // 10KB each
      }));
      
      const sourceRegistry = new Map();
      sourceFiles.forEach(file => {
        sourceRegistry.set(file.scriptId, file);
      });
      
      (server as any)['sourceFiles'].set(VALID_TAB_ID, sourceRegistry);
      
      // Mock DOM responses
      mockClient.DOM.getDocument.mockResolvedValue({
        root: { nodeId: 1 }
      });
      
      mockClient.DOM.querySelectorAll.mockResolvedValue({
        nodeIds: []
      });
      
      // Mock resource tree
      mockClient.Page.getResourceTree.mockResolvedValue({
        frameTree: {
          frame: { id: 'frame1', url: 'http://localhost' },
          resources: []
        }
      });
    });

    test('limits response size by default', async () => {
      const result = await server.listSourceFiles({ tabId: VALID_TAB_ID });
      
      if (!result.success) {
        console.error('Test failed with error:', result);
      }
      
      expect(result.success).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.totalItems).toBe(501); // 500 scripts + 1 HTML file
      expect(result.pagination.pageSize).toBeLessThan(501); // Should have paginated
      expect(result.responseSize).toBeDefined();
      expect(result.responseSize).toBeLessThanOrEqual(500000); // Default 500KB limit
    });

    test('respects custom page size', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        pageSize: 50
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThanOrEqual(50);
      expect(result.pagination.pageSize).toBeLessThanOrEqual(50);
    });

    test('respects custom response size limit', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        maxResponseSize: 100000 // 100KB limit
      });
      
      expect(result.success).toBe(true);
      expect(result.responseSize).toBeLessThanOrEqual(100000);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThanOrEqual(100); // Should have fewer files
    });

    test('provides continuation token for next page', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        pageSize: 100
      });
      
      expect(result.success).toBe(true);
      expect(result.continuationToken).toBeDefined();
      expect(result.pagination.hasNextPage).toBe(true);
    });

    test('continues from token', async () => {
      // Get first page
      const firstPage = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        pageSize: 100
      });
      
      expect(firstPage.continuationToken).toBeDefined();
      
      // Get second page
      const secondPage = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        continuationToken: firstPage.continuationToken
      });
      
      expect(secondPage.success).toBe(true);
      expect(secondPage.pagination.page).toBe(2);
      expect(secondPage.sourceFiles.scriptFiles[0].scriptId).not.toBe(
        firstPage.sourceFiles.scriptFiles[0].scriptId
      );
    });

    test('filters results with pagination', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        filters: {
          path: '/src/file1' // Should match file10-19, file100-199
        },
        pageSize: 50
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThan(500);
      expect(result.sourceFiles.scriptFiles.every((f: any) => 
        f.url.includes('/src/file1')
      )).toBe(true);
    });

    test('sorts results before pagination', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        sortBy: 'size',
        sortOrder: 'desc',
        pageSize: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles.length).toBe(10);
      
      // Check that files are sorted by size
      for (let i = 1; i < result.sourceFiles.scriptFiles.length; i++) {
        expect(result.sourceFiles.scriptFiles[i-1].length).toBeGreaterThanOrEqual(
          result.sourceFiles.scriptFiles[i].length
        );
      }
    });

    test('provides summary statistics', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        includeSummary: true
      });
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBe(501); // 500 scripts + 1 HTML
      expect(result.summary.totalSize).toBeDefined();
      expect(result.summary.byExtension).toBeDefined();
      expect(result.summary.largestFiles).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('handles empty source files gracefully', async () => {
      (server as any)['sourceFiles'].set(VALID_TAB_ID, new Map());
      
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        pageSize: 100
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles).toHaveLength(1); // Still has HTML file
      expect(result.pagination.totalItems).toBe(1); // HTML file is always added
      expect(result.pagination.hasNextPage).toBe(false);
    });

    test('handles invalid continuation token', async () => {
      const result = await server.listSourceFiles({ 
        tabId: VALID_TAB_ID,
        continuationToken: 'invalid-token'
      });
      
      expect(result.success).toBe(true);
      expect(result.pagination.page).toBe(1); // Falls back to page 1
    });
  });
});