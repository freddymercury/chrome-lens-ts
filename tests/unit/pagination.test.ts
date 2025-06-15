import {
  calculateResponseSize,
  createContinuationToken,
  parseContinuationToken,
  paginateResults,
  filterSourceFiles,
  sortSourceFiles,
  createSourceFileSummary
} from '../../src/utils/pagination';

describe('Pagination Utilities', () => {
  describe('calculateResponseSize', () => {
    test('calculates size of various data types', () => {
      expect(calculateResponseSize('test')).toBe(6); // "test"
      expect(calculateResponseSize(123)).toBe(3); // 123
      expect(calculateResponseSize(true)).toBe(4); // true
      expect(calculateResponseSize(null)).toBe(4); // null
      expect(calculateResponseSize([])).toBe(2); // []
      expect(calculateResponseSize({})).toBe(2); // {}
    });

    test('calculates size of complex objects', () => {
      const obj = { name: 'test', value: 123, nested: { a: 1 } };
      const size = calculateResponseSize(obj);
      expect(size).toBeGreaterThan(30);
    });

    test('handles circular references', () => {
      const obj: any = { a: 1 };
      obj.circular = obj;
      expect(calculateResponseSize(obj)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('continuation tokens', () => {
    test('creates and parses valid tokens', () => {
      const token = createContinuationToken('tab123', 2, { path: '/src' });
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      
      const parsed = parseContinuationToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed!.tabId).toBe('tab123');
      expect(parsed!.page).toBe(2);
      expect(parsed!.filters).toEqual({ path: '/src' });
    });

    test('rejects expired tokens', () => {
      const oldToken = Buffer.from(JSON.stringify({
        tabId: 'tab123',
        page: 1,
        timestamp: Date.now() - 3700000 // Over 1 hour old
      })).toString('base64');
      
      expect(parseContinuationToken(oldToken)).toBeNull();
    });

    test('handles invalid tokens gracefully', () => {
      expect(parseContinuationToken('invalid')).toBeNull();
      expect(parseContinuationToken('')).toBeNull();
      expect(parseContinuationToken('!!!!')).toBeNull();
    });
  });

  describe('paginateResults', () => {
    const testItems = Array.from({ length: 250 }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }));

    test('paginates with default options', () => {
      const result = paginateResults(testItems);
      
      expect(result.items).toHaveLength(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(100);
      expect(result.pagination.totalItems).toBe(250);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    test('handles different pages', () => {
      const page2 = paginateResults(testItems, { page: 2 });
      expect(page2.items).toHaveLength(100);
      expect(page2.items[0].id).toBe(100);
      expect(page2.pagination.hasNextPage).toBe(true);
      expect(page2.pagination.hasPrevPage).toBe(true);
      
      const page3 = paginateResults(testItems, { page: 3 });
      expect(page3.items).toHaveLength(50);
      expect(page3.pagination.hasNextPage).toBe(false);
    });

    test('respects custom page size', () => {
      const result = paginateResults(testItems, { pageSize: 25 });
      expect(result.items).toHaveLength(25);
      expect(result.pagination.totalPages).toBe(10);
    });

    test('reduces page size for large responses', () => {
      const largeItems = Array.from({ length: 100 }, () => ({
        id: 'x',
        data: 'x'.repeat(10000) // 10KB each
      }));
      
      const result = paginateResults(largeItems, {
        pageSize: 100,
        maxResponseSize: 100000 // 100KB limit
      });
      
      expect(result.items.length).toBeLessThan(100);
      expect(result.pagination.responseSize).toBeLessThanOrEqual(100000);
    });

    test('uses continuation token', () => {
      const token = createContinuationToken('tab123', 3);
      const result = paginateResults(testItems, {
        continuationToken: token,
        pageSize: 50
      });
      
      expect(result.pagination.page).toBe(3);
      expect(result.items[0].id).toBe(100); // Page 3 with pageSize 50
    });
  });

  describe('filterSourceFiles', () => {
    const testFiles = [
      { url: 'http://localhost/src/app.js', length: 1000 },
      { url: 'http://localhost/src/utils.ts', length: 2000 },
      { url: 'http://localhost/dist/bundle.js', length: 50000 },
      { url: 'http://localhost/test/spec.js', length: 500 },
      { url: 'http://localhost/styles.css', length: 3000 }
    ];

    test('filters by path', () => {
      const result = filterSourceFiles(testFiles, { path: '/src' });
      expect(result).toHaveLength(2);
      expect(result.every(f => f.url.includes('/src'))).toBe(true);
    });

    test('filters by extension', () => {
      const result = filterSourceFiles(testFiles, { extension: '.js' });
      expect(result).toHaveLength(3);
      expect(result.every(f => f.url.endsWith('.js'))).toBe(true);
    });

    test('filters by size', () => {
      const result = filterSourceFiles(testFiles, {
        minSize: 1000,
        maxSize: 5000
      });
      expect(result).toHaveLength(3);
      expect(result.every(f => f.length >= 1000 && f.length <= 5000)).toBe(true);
    });

    test('filters by pattern', () => {
      const result = filterSourceFiles(testFiles, { pattern: '\\.(ts|tsx)$' });
      expect(result).toHaveLength(1);
      expect(result[0].url).toContain('utils.ts');
    });

    test('combines multiple filters', () => {
      const result = filterSourceFiles(testFiles, {
        path: '/src',
        extension: '.js',
        minSize: 500
      });
      expect(result).toHaveLength(1);
      expect(result[0].url).toContain('app.js');
    });
  });

  describe('sortSourceFiles', () => {
    const testFiles = [
      { url: 'http://localhost/b.js', length: 2000 },
      { url: 'http://localhost/a.js', length: 1000 },
      { url: 'http://localhost/c.ts', length: 3000 }
    ];

    test('sorts by URL', () => {
      const result = sortSourceFiles(testFiles, 'url', 'asc');
      expect(result[0].url).toContain('a.js');
      expect(result[1].url).toContain('b.js');
      expect(result[2].url).toContain('c.ts');
    });

    test('sorts by size', () => {
      const result = sortSourceFiles(testFiles, 'size', 'asc');
      expect(result[0].length).toBe(1000);
      expect(result[1].length).toBe(2000);
      expect(result[2].length).toBe(3000);
    });

    test('sorts by type/extension', () => {
      const result = sortSourceFiles(testFiles, 'type', 'asc');
      expect(result[0].url).toContain('.js');
      expect(result[1].url).toContain('.js');
      expect(result[2].url).toContain('.ts');
    });

    test('sorts in descending order', () => {
      const result = sortSourceFiles(testFiles, 'size', 'desc');
      expect(result[0].length).toBe(3000);
      expect(result[1].length).toBe(2000);
      expect(result[2].length).toBe(1000);
    });
  });

  describe('createSourceFileSummary', () => {
    const testFiles = [
      { url: 'http://localhost/app.js', length: 5000 },
      { url: 'http://localhost/utils.js', length: 3000 },
      { url: 'http://localhost/main.ts', length: 8000 },
      { url: 'http://localhost/styles.css', length: 2000 },
      { url: 'http://localhost/index.html', length: 1000 }
    ];

    test('creates accurate summary', () => {
      const summary = createSourceFileSummary(testFiles);
      
      expect(summary.totalFiles).toBe(5);
      expect(summary.totalSize).toBe(19000);
      expect(Object.keys(summary.byExtension)).toHaveLength(4);
    });

    test('groups by extension correctly', () => {
      const summary = createSourceFileSummary(testFiles);
      
      expect(summary.byExtension.js).toEqual({
        count: 2,
        totalSize: 8000
      });
      expect(summary.byExtension.ts).toEqual({
        count: 1,
        totalSize: 8000
      });
      expect(summary.byExtension.css).toEqual({
        count: 1,
        totalSize: 2000
      });
    });

    test('identifies largest files', () => {
      const summary = createSourceFileSummary(testFiles);
      
      expect(summary.largestFiles).toHaveLength(5);
      expect(summary.largestFiles[0].url).toContain('main.ts');
      expect(summary.largestFiles[0].size).toBe(8000);
    });

    test('handles empty input', () => {
      const summary = createSourceFileSummary([]);
      
      expect(summary.totalFiles).toBe(0);
      expect(summary.totalSize).toBe(0);
      expect(Object.keys(summary.byExtension)).toHaveLength(0);
      expect(summary.largestFiles).toHaveLength(0);
    });
  });
});