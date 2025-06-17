import ChromeDevToolsMCPServer from '../../server';
import { jest } from '@jest/globals';

describe('Task v1.1.3: Response Size Management', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
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
      on: jest.fn()
    };
    
    // Mock responses
    mockClient.send.mockResolvedValue({});
    mockClient.Debugger.enable.mockResolvedValue({});
    mockClient.DOM.enable.mockResolvedValue({});
    mockClient.Page.enable.mockResolvedValue({});
    
    // Set up client
    (server as any)['clients'].set('test-tab', mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Function: calculateResponseSize', () => {
    const calculateResponseSize = (data: any): number => {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    };

    test('calculates size of objects', () => {
      expect(calculateResponseSize({ a: 1, b: 'test' })).toBeGreaterThan(10);
      expect(calculateResponseSize([])).toBeLessThan(10);
      expect(calculateResponseSize('test string')).toBeGreaterThan(10);
    });

    test('handles large data', () => {
      const largeArray = Array(1000).fill({ id: 'script123', url: 'http://example.com/script.js' });
      const size = calculateResponseSize(largeArray);
      expect(size).toBeGreaterThan(50000);
    });
  });

  describe('Pure Function: paginateResults', () => {
    interface PaginationOptions {
      page?: number;
      pageSize?: number;
      maxResponseSize?: number;
    }

    const paginateResults = <T>(items: T[], options: PaginationOptions = {}) => {
      const { page = 1, pageSize = 100, maxResponseSize = 500000 } = options;
      
      // First, try with requested page size
      const startIndex = (page - 1) * pageSize;
      let endIndex = startIndex + pageSize;
      let pageItems = items.slice(startIndex, endIndex);
      
      // Check if response would be too large
      const calculateSize = (data: any) => new TextEncoder().encode(JSON.stringify(data)).length;
      
      // If too large, reduce page size
      while (pageItems.length > 0 && calculateSize(pageItems) > maxResponseSize) {
        pageItems = pageItems.slice(0, Math.floor(pageItems.length * 0.8));
      }
      
      const actualPageSize = pageItems.length;
      const totalPages = Math.ceil(items.length / actualPageSize);
      
      return {
        items: pageItems,
        pagination: {
          page,
          pageSize: actualPageSize,
          totalItems: items.length,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          responseSize: calculateSize(pageItems)
        }
      };
    };

    test('paginates simple array', () => {
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const result = paginateResults(items, { pageSize: 100 });
      
      expect(result.items).toHaveLength(100);
      expect(result.pagination.totalItems).toBe(250);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    test('handles last page correctly', () => {
      const items = Array.from({ length: 250 }, (_, i) => ({ id: i }));
      const result = paginateResults(items, { page: 3, pageSize: 100 });
      
      expect(result.items).toHaveLength(50);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    test('reduces page size when response too large', () => {
      const largeItems = Array.from({ length: 100 }, () => ({
        id: 'script123',
        url: 'http://example.com/very/long/path/to/script.js',
        content: 'x'.repeat(10000) // Large content
      }));
      
      const result = paginateResults(largeItems, { 
        pageSize: 100, 
        maxResponseSize: 50000 
      });
      
      expect(result.items.length).toBeLessThan(100);
      expect(result.pagination.responseSize).toBeLessThanOrEqual(50000);
    });
  });

  describe('Pure Function: createContinuationToken', () => {
    const createContinuationToken = (tabId: string, page: number, filters?: any): string => {
      const tokenData = { tabId, page, filters, timestamp: Date.now() };
      return Buffer.from(JSON.stringify(tokenData)).toString('base64');
    };

    const parseContinuationToken = (token: string): any => {
      try {
        return JSON.parse(Buffer.from(token, 'base64').toString());
      } catch {
        return null;
      }
    };

    test('creates and parses tokens', () => {
      const token = createContinuationToken('tab123', 2, { path: '/src' });
      const parsed = parseContinuationToken(token);
      
      expect(parsed).toBeTruthy();
      expect(parsed.tabId).toBe('tab123');
      expect(parsed.page).toBe(2);
      expect(parsed.filters).toEqual({ path: '/src' });
    });

    test('handles invalid tokens', () => {
      expect(parseContinuationToken('invalid')).toBeNull();
      expect(parseContinuationToken('')).toBeNull();
    });
  });

  describe('listSourceFiles with pagination', () => {
    beforeEach(() => {
      // Mock large number of source files
      const sourceFiles = Array.from({ length: 500 }, (_, i) => ({
        scriptId: `script${i}`,
        url: `http://localhost/src/file${i}.js`,
        hasSourceURL: false,
        isModule: true,
        length: 1000 + i * 100
      }));
      
      // Create source registry
      const sourceRegistry = new Map();
      sourceFiles.forEach(file => {
        sourceRegistry.set(file.scriptId, file);
      });
      
      (server as any)['sourceFiles'] = new Map([['test-tab', sourceRegistry]]);
      
      // Mock DOM queries
      mockClient.DOM.getDocument.mockResolvedValue({
        root: { nodeId: 1 }
      });
      
      mockClient.DOM.querySelectorAll.mockResolvedValue({
        nodeIds: sourceFiles.slice(0, 10).map((_, i) => i + 100)
      });
      
      // Mock resource tree
      mockClient.Page.getResourceTree.mockResolvedValue({
        frameTree: {
          frame: { id: 'frame1', url: 'http://localhost' },
          resources: sourceFiles.slice(0, 20).map(f => ({
            url: f.url,
            type: 'Script',
            mimeType: 'application/javascript'
          }))
        }
      });
    });

    test('returns paginated results by default', async () => {
      const result = await server.listSourceFiles({ tabId: 'test-tab' });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.totalItems).toBeGreaterThan(100);
      expect(result.continuationToken).toBeDefined();
    });

    test('respects pageSize parameter', async () => {
      const result = await server.listSourceFiles({ 
        tabId: 'test-tab',
        pageSize: 50
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThanOrEqual(50);
    });

    test('continues from token', async () => {
      // Get first page
      const firstPage = await server.listSourceFiles({ tabId: 'test-tab' });
      expect(firstPage.continuationToken).toBeDefined();
      
      // Get second page
      const secondPage = await server.listSourceFiles({ 
        tabId: 'test-tab',
        continuationToken: firstPage.continuationToken
      });
      
      expect(secondPage.success).toBe(true);
      expect(secondPage.pagination.page).toBe(2);
      expect(secondPage.sourceFiles).toBeDefined();
    });

    test('filters results', async () => {
      const result = await server.listSourceFiles({ 
        tabId: 'test-tab',
        filters: {
          path: '/src/file1',
          extension: '.js'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThan(500);
    });

    test('limits response size', async () => {
      const result = await server.listSourceFiles({ 
        tabId: 'test-tab',
        maxResponseSize: 50000 // 50KB limit
      });
      
      expect(result.success).toBe(true);
      expect(result.responseSize).toBeLessThanOrEqual(50000);
      expect(result.sourceFiles.scriptFiles.length).toBeLessThan(500);
    });
  });

  describe('Integration with existing functionality', () => {
    test('maintains backward compatibility without pagination params', async () => {
      // Set up minimal source files
      const sourceRegistry = new Map();
      sourceRegistry.set('script1', { 
        scriptId: 'script1',
        url: 'http://localhost/app.js',
        hasSourceURL: false
      });
      
      (server as any)['sourceFiles'] = new Map([['test-tab', sourceRegistry]]);
      
      const result = await server.listSourceFiles({ tabId: 'test-tab' });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles).toBeDefined();
      // Should not break existing functionality
    });

    test('handles empty results', async () => {
      (server as any)['sourceFiles'] = new Map([['test-tab', new Map()]]);
      
      const result = await server.listSourceFiles({ 
        tabId: 'test-tab',
        page: 1,
        pageSize: 100
      });
      
      expect(result.success).toBe(true);
      expect(result.sourceFiles.scriptFiles).toHaveLength(0);
      expect(result.pagination.totalItems).toBe(0);
    });
  });
});