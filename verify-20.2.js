// Verification script for Task 20.2 implementation
import { ChromeDevToolsMCPServer } from './server.js';

console.log('Testing Task 20.2: Real-time Event Monitoring Implementation...\n');

const server = new ChromeDevToolsMCPServer();
server.setupToolHandlers();

// Mock client setup
const mockClient = {
  on: (event, handler) => console.log(`Registered handler for: ${event}`),
  off: (event) => console.log(`Unregistered handler for: ${event}`),
  DOM: { enable: async () => ({}) },
  Console: { enable: async () => ({}) },
  Network: { enable: async () => ({}) },
  Runtime: { enable: async () => ({}) },
  Performance: { enable: async () => ({}) },
  Security: { enable: async () => ({}) },
  DOMStorage: { enable: async () => ({}) },
  Debugger: { enable: async () => ({}) }
};

// Store mock client
const tabId = 'ABCDEF0123456789ABCDEF0123456789';
server.addStorageEntry('clients', tabId, mockClient);

async function runTests() {
  console.log('1. Testing monitorEvents method exists...');
  if (typeof server.monitorEvents === 'function') {
    console.log('✓ monitorEvents method exists');
  } else {
    console.log('✗ monitorEvents method not found');
    return;
  }

  console.log('\n2. Testing event monitoring setup...');
  const result = await server.monitorEvents({
    tabId,
    eventTypes: ['dom', 'console', 'network'],
    filters: { severity: 'warning' },
    bufferSize: 50,
    realtime: true
  });

  if (result.success) {
    console.log('✓ Event monitoring started successfully');
    console.log(`  - Monitoring: ${result.eventMonitoring.eventTypes.join(', ')}`);
    console.log(`  - Mode: ${result.eventMonitoring.mode}`);
    console.log(`  - Buffer size: ${result.eventMonitoring.bufferSize}`);
  } else {
    console.log('✗ Failed to start monitoring:', result.error);
    return;
  }

  console.log('\n3. Testing getEventMonitor method...');
  const monitor = server.getEventMonitor(tabId);
  if (monitor) {
    console.log('✓ Event monitor retrieved successfully');
    console.log(`  - Is enabled: ${monitor.isEnabled()}`);
    console.log(`  - Is realtime: ${monitor.isRealtime()}`);
    console.log(`  - Initial events: ${monitor.getEvents().length}`);
  } else {
    console.log('✗ Failed to retrieve event monitor');
  }

  console.log('\n4. Testing stopEventMonitoring method...');
  const stopResult = await server.stopEventMonitoring(tabId);
  if (stopResult.success) {
    console.log('✓ Event monitoring stopped successfully');
  } else {
    console.log('✗ Failed to stop monitoring:', stopResult.error);
  }

  console.log('\n5. Testing tab not connected error...');
  const errorResult = await server.monitorEvents({
    tabId: 'FEDCBA9876543210FEDCBA9876543210',
    eventTypes: ['all']
  });
  if (!errorResult.success && errorResult.error.includes('Tab not connected')) {
    console.log('✓ Correctly handles tab not connected error');
  } else {
    console.log('✗ Failed to handle tab not connected error');
  }

  console.log('\nAll tests completed!');
}

runTests().catch(console.error);