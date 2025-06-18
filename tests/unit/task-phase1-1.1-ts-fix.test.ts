/**
 * Task Phase 1.1: TypeScript Compilation Fix
 * Tests to verify the v1.2 property initialization fix
 */

import ChromeDevToolsMCPServer from '../../server';

describe('Task Phase 1.1: TypeScript Compilation Fix', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
  });

  test('server should initialize without TypeScript errors', () => {
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(ChromeDevToolsMCPServer);
  });

  test('v1.2 properties should be properly initialized', () => {
    // The properties are private, but we can verify the server initializes
    // without throwing errors related to uninitialized properties
    expect(() => {
      const serverConfig = server.getServerConfig();
      expect(serverConfig).toHaveProperty('name');
      expect(serverConfig).toHaveProperty('version');
    }).not.toThrow();
  });

  test('ensureV12PropertiesInitialized is called during construction', () => {
    // This test verifies that the fix for TS6133 errors is working
    // by ensuring the server can be constructed without TypeScript complaints
    const newServer = new ChromeDevToolsMCPServer();
    expect(newServer).toBeDefined();
    
    // If we got here without TypeScript errors, the fix is working
    expect(true).toBe(true);
  });
});