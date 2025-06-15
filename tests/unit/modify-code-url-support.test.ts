import { ChromeDevToolsMCPServer } from '../../server';
import { jest } from '@jest/globals';

describe('modify_code URL support', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;
  const VALID_TAB_ID = '1234567890ABCDEF1234567890ABCDEF';

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    server = new ChromeDevToolsMCPServer();
    
    mockClient = {
      send: jest.fn(),
      Debugger: {
        enable: jest.fn(),
        getScriptSource: jest.fn(),
        setScriptSource: jest.fn()
      },
      Runtime: {
        enable: jest.fn(),
        compileScript: jest.fn()
      },
      on: jest.fn()
    };
    
    mockClient.send.mockResolvedValue({});
    mockClient.Debugger.enable.mockResolvedValue({});
    mockClient.Runtime.enable.mockResolvedValue({});
    
    (server as any)['clients'].set(VALID_TAB_ID, mockClient);
    
    // Set up source files
    const sourceRegistry = new Map();
    sourceRegistry.set('script123', {
      scriptId: 'script123',
      url: 'http://localhost:3000/src/app.js',
      hasSourceURL: false,
      isModule: false,
      length: 1000
    });
    sourceRegistry.set('script456', {
      scriptId: 'script456',
      url: 'http://localhost:3000/src/utils.js',
      hasSourceURL: false,
      isModule: false,
      length: 500
    });
    
    (server as any)['sourceFiles'].set(VALID_TAB_ID, sourceRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('URL-based source identification', () => {
    test('accepts URL as sourceId parameter', async () => {
      const newCode = 'console.log("Modified by URL");';
      
      mockClient.Debugger.getScriptSource.mockResolvedValue({
        scriptSource: 'console.log("Original code");'
      });
      
      mockClient.Debugger.setScriptSource.mockResolvedValue({
        status: 'Ok'
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'http://localhost:3000/src/app.js', // URL instead of script ID
        newContent: newCode,
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script123', // Should resolve to actual script ID
        scriptSource: newCode
      });
    });

    test('accepts partial URL match', async () => {
      const newCode = 'console.log("Modified by partial URL");';
      
      mockClient.Debugger.getScriptSource.mockResolvedValue({
        scriptSource: 'console.log("Original code");'
      });
      
      mockClient.Debugger.setScriptSource.mockResolvedValue({
        status: 'Ok'
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: '/src/utils.js', // Partial URL
        newContent: newCode,
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script456',
        scriptSource: newCode
      });
    });

    test('still accepts script IDs directly', async () => {
      const newCode = 'console.log("Modified by script ID");';
      
      mockClient.Debugger.getScriptSource.mockResolvedValue({
        scriptSource: 'console.log("Original code");'
      });
      
      mockClient.Debugger.setScriptSource.mockResolvedValue({
        status: 'Ok'
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'script123', // Direct script ID
        newContent: newCode,
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script123',
        scriptSource: newCode
      });
    });

    test('returns helpful error for non-existent URL', async () => {
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'http://localhost:3000/nonexistent.js',
        newCode: 'console.log("test");',
        skipValidation: true
      });
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Could not find source file');
      expect(result.error.availableSources).toBeDefined();
      expect(result.error.availableSources).toHaveLength(2);
    });

    test('handles multiple URL matches', async () => {
      // Add another file with similar URL
      const sourceRegistry = (server as any)['sourceFiles'].get(VALID_TAB_ID);
      sourceRegistry.set('script789', {
        scriptId: 'script789',
        url: 'http://localhost:3000/dist/app.js',
        hasSourceURL: false,
        isModule: false,
        length: 2000
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'app.js', // Ambiguous - matches multiple files
        newCode: 'console.log("test");',
        skipValidation: true
      });
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Multiple sources found');
      expect(result.error.matches).toBeDefined();
      expect(result.error.matches).toHaveLength(2);
      expect(result.error.suggestion).toContain('more specific');
    });

    test('provides source discovery help', async () => {
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: '',
        newCode: 'console.log("test");',
        skipValidation: true
      });
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('sourceId is required');
      expect(result.error.hint).toContain('list_source_files');
    });
  });

  describe('Source resolution priority', () => {
    test('prefers exact script ID match over URL match', async () => {
      // Add a source where script ID looks like a URL
      const sourceRegistry = (server as any)['sourceFiles'].get(VALID_TAB_ID);
      sourceRegistry.set('src/app.js', {
        scriptId: 'src/app.js', // Script ID that looks like URL
        url: 'http://localhost:3000/different.js',
        hasSourceURL: false,
        isModule: false,
        length: 800
      });
      
      mockClient.Debugger.getScriptSource.mockResolvedValue({
        scriptSource: 'console.log("Original");'
      });
      
      mockClient.Debugger.setScriptSource.mockResolvedValue({
        status: 'Ok'
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'src/app.js',
        newContent: 'console.log("Modified");',
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'src/app.js', // Should use exact match, not URL search
        scriptSource: expect.any(String)
      });
    });

    test('URL match is case-insensitive', async () => {
      const newCode = 'console.log("Case insensitive");';
      
      mockClient.Debugger.getScriptSource.mockResolvedValue({
        scriptSource: 'console.log("Original");'
      });
      
      mockClient.Debugger.setScriptSource.mockResolvedValue({
        status: 'Ok'
      });
      
      const result = await server.modifySourceCode({
        tabId: VALID_TAB_ID,
        sourceId: 'HTTP://LOCALHOST:3000/SRC/APP.JS', // Different case
        newContent: newCode,
        skipValidation: true
      });
      
      expect(result.success).toBe(true);
      expect(mockClient.Debugger.setScriptSource).toHaveBeenCalledWith({
        scriptId: 'script123',
        scriptSource: newCode
      });
    });
  });
});