import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';

import { ChromeDevToolsMCPServer } from '../../server';
import { 
  validateDomAgentEnabled,
  filterValidSourceFiles,
  sortSourcesByPriority,
  enrichSourceMetadata,
  type Source
} from '../../src/utils/source-file-utils';

describe('Task 21.1: Fix Source File Listing (DOM Agent Dependency)', () => {
  describe('Pure Function Tests - Source File Utils', () => {
    describe('validateDomAgentEnabled', () => {
      it('should return true when DOM agent is enabled', () => {
        const result = validateDomAgentEnabled({ DOM: { enabled: true } });
        expect(result).toBe(true);
      });

      it('should return false when DOM agent is not enabled', () => {
        const result = validateDomAgentEnabled({ DOM: { enabled: false } });
        expect(result).toBe(false);
      });

      it('should return false when DOM agent is missing', () => {
        const result = validateDomAgentEnabled({});
        expect(result).toBe(false);
      });
    });

    describe('filterValidSourceFiles', () => {
      it('should filter out sources with empty URLs', () => {
        const sources: Source[] = [
          { scriptId: '1', url: 'http://example.com/app.js' },
          { scriptId: '2', url: '' },
          { scriptId: '3', url: 'file:///test.js' }
        ];

        const result = filterValidSourceFiles(sources);
        
        expect(result).toHaveLength(2);
        expect(result.every(s => s.url !== '')).toBe(true);
      });

      it('should filter out data URLs', () => {
        const sources: Source[] = [
          { scriptId: '1', url: 'http://example.com/app.js' },
          { scriptId: '2', url: 'data:text/javascript;base64,Y29uc29sZS5sb2c=' },
          { scriptId: '3', url: 'blob:http://example.com/123' }
        ];

        const result = filterValidSourceFiles(sources);
        
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('http://example.com/app.js');
      });

      it('should handle empty array', () => {
        const result = filterValidSourceFiles([]);
        expect(result).toHaveLength(0);
      });
    });

    describe('sortSourcesByPriority', () => {
      it('should prioritize application files over vendor files', () => {
        const sources: Source[] = [
          { scriptId: '1', url: 'http://example.com/node_modules/react/index.js' },
          { scriptId: '2', url: 'http://example.com/src/app.js' },
          { scriptId: '3', url: 'http://example.com/vendor/jquery.js' }
        ];

        const result = sortSourcesByPriority(sources);
        
        expect(result[0].url).toContain('/src/');
        expect(result[result.length - 1].url).toMatch(/node_modules|vendor/);
      });

      it('should prioritize JS/TS files over CSS', () => {
        const sources: Source[] = [
          { scriptId: '1', url: 'http://example.com/style.css' },
          { scriptId: '2', url: 'http://example.com/app.js' },
          { scriptId: '3', url: 'http://example.com/main.ts' }
        ];

        const result = sortSourcesByPriority(sources);
        
        expect(result[0].url).toMatch(/\.(js|ts)$/);
        expect(result[result.length - 1].url).toContain('.css');
      });
    });

    describe('enrichSourceMetadata', () => {
      it('should add file size and type metadata', () => {
        const source: Source = {
          scriptId: '1',
          url: 'http://example.com/app.js',
          content: 'console.log("hello");'
        };

        const result = enrichSourceMetadata(source);
        
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('type', 'javascript');
        expect(result).toHaveProperty('lastModified');
        expect(result.size).toBeGreaterThan(0);
      });

      it('should detect file types correctly', () => {
        const sources: Source[] = [
          { scriptId: '1', url: 'http://example.com/app.js' },
          { scriptId: '2', url: 'http://example.com/style.css' },
          { scriptId: '3', url: 'http://example.com/index.html' },
          { scriptId: '4', url: 'http://example.com/main.ts' }
        ];

        const results = sources.map(enrichSourceMetadata);
        
        expect(results[0].type).toBe('javascript');
        expect(results[1].type).toBe('css');
        expect(results[2].type).toBe('html');
        expect(results[3].type).toBe('typescript');
      });

      it('should handle sources without content', () => {
        const source: Source = {
          scriptId: '1',
          url: 'http://example.com/app.js'
        };

        const result = enrichSourceMetadata(source);
        
        expect(result.size).toBe(0);
        expect(result).toHaveProperty('type');
      });
    });
  });

  describe('Integration Tests - list_source_files Tool', () => {
    let server: ChromeDevToolsMCPServer;

    beforeEach(() => {
      server = new ChromeDevToolsMCPServer();
      server.setupToolHandlers();
    });

    afterEach(() => {
      server.clearStorage();
    });

    it('should auto-enable DOM agent when listing source files', async () => {
      // Mock Chrome connection
      const mockClient = {
        DOM: {
          enable: jest.fn().mockResolvedValue({}),
          disable: jest.fn().mockResolvedValue({})
        },
        Debugger: {
          enable: jest.fn().mockResolvedValue({}),
          getScriptSource: jest.fn().mockResolvedValue({ scriptSource: 'test' })
        },
        Runtime: {
          enable: jest.fn().mockResolvedValue({})
        }
      };

      // Store mock client
      (server as any).clients.set('AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB', mockClient);
      
      // Initialize domStates if needed
      if (!(server as any).domStates) {
        (server as any).domStates = new Map();
      }

      const result = await server.callTool('list_source_files', {
        tabId: 'AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB'
      });

      expect(mockClient.DOM.enable).toHaveBeenCalled();
      expect(result).toHaveProperty('sources');
    });

    it('should cache source file results', async () => {
      // This test would verify that subsequent calls use cached data
      // Implementation depends on caching strategy
    });

    it('should handle DOM agent enable failure gracefully', async () => {
      const mockClient = {
        DOM: {
          enable: jest.fn().mockRejectedValue(new Error('DOM agent failed'))
        },
        Debugger: {
          enable: jest.fn().mockResolvedValue({})
        }
      };

      (server as any).clients.set('AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB', mockClient);
      
      // Initialize domStates if needed
      if (!(server as any).domStates) {
        (server as any).domStates = new Map();
      }

      const result = await server.callTool('list_source_files', {
        tabId: 'AAAABBBBCCCCDDDDEEEEFFFFAAAABBBB'
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('DOM agent failed to enable');
    });
  });
});