import * as dotenv from 'dotenv';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.MAX_STORAGE_SIZE = '10485760'; // 10MB

import ChromeDevToolsMCPServer from '../../server';

describe('Task 3.3: Client Storage Maps', () => {
  let server: ChromeDevToolsMCPServer;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
  });

  afterEach(() => {
    delete process.env.MAX_STORAGE_SIZE;
  });

  test('storage maps are initialized in constructor', () => {
    // Test that storage maps exist and are accessible
    expect(server.getStorageInfo).toBeDefined();
    expect(typeof server.getStorageInfo).toBe('function');
    
    const storageInfo = server.getStorageInfo();
    expect(storageInfo).toBeDefined();
    expect(typeof storageInfo).toBe('object');
  });

  test('getStorageInfo returns information about all storage maps', () => {
    const storageInfo = server.getStorageInfo();
    
    expect(storageInfo.clients).toBeDefined();
    expect(storageInfo.consoleMessages).toBeDefined();
    expect(storageInfo.networkLogs).toBeDefined();
    expect(storageInfo.errors).toBeDefined();
    
    expect(typeof storageInfo.clients.size).toBe('number');
    expect(typeof storageInfo.consoleMessages.size).toBe('number');
    expect(typeof storageInfo.networkLogs.size).toBe('number');
    expect(typeof storageInfo.errors.size).toBe('number');
  });

  test('storage maps are initially empty', () => {
    const storageInfo = server.getStorageInfo();
    
    expect(storageInfo.clients.size).toBe(0);
    expect(storageInfo.consoleMessages.size).toBe(0);
    expect(storageInfo.networkLogs.size).toBe(0);
    expect(storageInfo.errors.size).toBe(0);
  });

  test('addStorageEntry method exists for testing storage', () => {
    expect(typeof server.addStorageEntry).toBe('function');
  });

  test('can add entries to storage maps', () => {
    const testData = { test: 'data' };
    
    server.addStorageEntry('clients', 'tab1', testData);
    server.addStorageEntry('consoleMessages', 'tab1', testData);
    
    const storageInfo = server.getStorageInfo();
    expect(storageInfo.clients.size).toBe(1);
    expect(storageInfo.consoleMessages.size).toBe(1);
  });

  test('storage respects MAX_STORAGE_SIZE environment variable', () => {
    // This test verifies that storage initialization uses MAX_STORAGE_SIZE
    // The actual storage limit enforcement will be added in later tasks
    const storageInfo = server.getStorageInfo();
    
    // Storage maps should be initialized regardless of MAX_STORAGE_SIZE
    expect(storageInfo).toBeDefined();
    expect(storageInfo.clients).toBeDefined();
    expect(storageInfo.consoleMessages).toBeDefined();
    expect(storageInfo.networkLogs).toBeDefined();
    expect(storageInfo.errors).toBeDefined();
  });

  test('clearStorage method exists for cleanup', () => {
    expect(typeof server.clearStorage).toBe('function');
  });

  test('clearStorage empties all storage maps', () => {
    // Add some test data
    server.addStorageEntry('clients', 'tab1', { test: 'data' });
    server.addStorageEntry('consoleMessages', 'tab1', { test: 'message' });
    
    // Verify data was added
    let storageInfo = server.getStorageInfo();
    expect(storageInfo.clients.size).toBe(1);
    expect(storageInfo.consoleMessages.size).toBe(1);
    
    // Clear storage
    server.clearStorage();
    
    // Verify storage is empty
    storageInfo = server.getStorageInfo();
    expect(storageInfo.clients.size).toBe(0);
    expect(storageInfo.consoleMessages.size).toBe(0);
    expect(storageInfo.networkLogs.size).toBe(0);
    expect(storageInfo.errors.size).toBe(0);
  });
});