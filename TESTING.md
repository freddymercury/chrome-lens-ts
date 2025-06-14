# Chrome DevTools MCP Server - Testing Guide

This document provides step-by-step instructions for manually testing all implemented features of the Chrome DevTools MCP Server.

## Prerequisites

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Verify Node.js version (required: 22.x)
node --version

# Create environment file
cp .env.example .env
```

### 2. Chrome Setup
Chrome must be launched with remote debugging enabled:

```bash
# macOS/Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows  
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
```

### 3. Verify Chrome Debugging
Visit http://localhost:9222 in a browser to confirm Chrome debugging is active.

## Manual Testing Procedures

### Phase 1: Environment & Configuration

#### Test 1.1: Environment Variables
```bash
# Run tests to verify environment configuration
npm test -- tests/unit/task-1.1.test.ts

# Expected: All tests pass, environment variables loaded correctly
```

#### Test 1.2: TypeScript Configuration  
```bash
# Verify TypeScript compilation
npm run build

# Expected: Clean compilation with no errors
# Check: dist/ directory created with compiled JavaScript
```

#### Test 1.3: Server Instantiation
```bash
# Test server creation
npm test -- tests/unit/task-1.3.test.ts

# Expected: Server creates successfully with proper configuration
```

### Phase 2: Core Server Infrastructure

#### Test 2.1: Storage Management
```bash
# Test storage maps initialization
npm test -- tests/unit/task-2.1.test.ts

# Expected: All storage maps (clients, consoleMessages, networkLogs, errors) initialized
```

#### Test 2.2: Error Handling
```bash
# Test graceful shutdown and error handling
npm test -- tests/unit/task-2.2.test.ts

# Expected: Process handlers setup correctly, graceful shutdown works
```

#### Test 2.3: Server Connection
```bash
# Test server connection capabilities  
npm test -- tests/unit/task-2.3.test.ts

# Expected: Server can connect and run without errors
```

### Phase 3: Tool Framework

#### Test 3.1: Tool Handler Setup
```bash
# Test tool infrastructure
npm test -- tests/unit/task-3.1.test.ts

# Expected: Tool handlers initialized, framework ready
```

#### Test 3.2: Tool Listing
```bash
# Test tool enumeration
npm test -- tests/unit/task-3.2.test.ts  

# Expected: listTools() returns properly formatted tool definitions
```

#### Test 3.3: Tool Calling
```bash
# Test tool execution framework
npm test -- tests/unit/task-3.3.test.ts

# Expected: callTool() validates parameters and routes correctly
```

### Phase 4: Chrome Connection

#### Test 4.1: connect_to_chrome Tool Definition
```bash
# Test tool definition
npm test -- tests/unit/task-4.1.test.ts

# Expected: connect_to_chrome tool appears in tool list with correct schema
```

#### Test 4.2: Chrome Connection Method
```bash
# Test actual Chrome connection (requires Chrome debugging)
npm test -- tests/unit/task-4.2.test.ts

# Expected: Successfully connects to Chrome or fails gracefully
```

#### Manual Test 4.2: Live Chrome Connection
```bash
# 1. Ensure Chrome is running with --remote-debugging-port=9222
# 2. Create a test script:
cat > test-chrome-connection.js << 'EOF'
const { ChromeDevToolsMCPServer } = require('./dist/server');

async function testConnection() {
  const server = new ChromeDevToolsMCPServer();
  server.setupToolHandlers();
  
  try {
    const result = await server.callTool('connect_to_chrome', {});
    console.log('Connection result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
EOF

# 3. Run test
node test-chrome-connection.js

# Expected: Success response with tab count and connection details
```

#### Test 4.3: Tool Integration
```bash
# Test connect_to_chrome via callTool
npm test -- tests/unit/task-4.3.test.ts

# Expected: Tool properly integrated into callTool switch statement
```

### Phase 5: Tab Listing

#### Test 5.1: list_tabs Tool Definition
```bash
# Test tool definition
npm test -- tests/unit/task-5.1.test.ts

# Expected: list_tabs tool appears with correct schema
```

#### Test 5.2: Tab Listing Method
```bash
# Test tab enumeration
npm test -- tests/unit/task-5.2.test.ts

# Expected: Returns formatted list of Chrome tabs
```

#### Manual Test 5.2: Live Tab Listing
```bash
# 1. Open multiple tabs in Chrome (with debugging enabled)
# 2. Create test script:
cat > test-list-tabs.js << 'EOF'
const { ChromeDevToolsMCPServer } = require('./dist/server');

async function testListTabs() {
  const server = new ChromeDevToolsMCPServer();
  server.setupToolHandlers();
  
  try {
    const result = await server.callTool('list_tabs', {});
    console.log('Tabs found:', result.tabs.length);
    result.tabs.forEach((tab, i) => {
      console.log(`Tab ${i + 1}: ${tab.title} (${tab.url})`);
    });
  } catch (error) {
    console.error('Failed to list tabs:', error.message);
  }
}

testListTabs();
EOF

# 3. Run test
node test-list-tabs.js

# Expected: List of all open Chrome tabs with titles and URLs
```

#### Test 5.3: Tool Integration
```bash
# Test list_tabs via callTool
npm test -- tests/unit/task-5.3.test.ts

# Expected: Tool properly integrated and functional
```

### Phase 6: Tab Monitoring Foundation

#### Test 6.1: start_monitoring Tool Definition
```bash
# Test tool definition
npm test -- tests/unit/task-6.1.test.ts

# Expected: start_monitoring tool appears with correct schema including tabId
```

#### Test 6.2: connectToTab Method
```bash
# Test tab connection method
npm test -- tests/unit/task-6.2.test.ts

# Expected: Can connect to specific tabs, enable domains
```

#### Test 6.3: startMonitoring Method
```bash
# Test monitoring initiation
npm test -- tests/unit/task-6.3.test.ts

# Expected: Calls connectToTab, stores client connections
```

#### Manual Test 6.3: Live Tab Monitoring
```bash
# 1. Get a tab ID from list_tabs first
# 2. Create test script:
cat > test-start-monitoring.js << 'EOF'
const { ChromeDevToolsMCPServer } = require('./dist/server');

async function testMonitoring() {
  const server = new ChromeDevToolsMCPServer();
  server.setupToolHandlers();
  
  try {
    // First get tabs
    const tabsResult = await server.callTool('list_tabs', {});
    if (tabsResult.tabs.length === 0) {
      console.log('No tabs found. Open a tab in Chrome first.');
      return;
    }
    
    const tabId = tabsResult.tabs[0].id;
    console.log(`Starting monitoring for tab: ${tabsResult.tabs[0].title}`);
    
    // Start monitoring
    const result = await server.callTool('start_monitoring', { tabId });
    console.log('Monitoring result:', JSON.stringify(result, null, 2));
    
    // Check storage
    const storage = server.getStorageInfo();
    console.log('Clients stored:', storage.clients.size);
    
  } catch (error) {
    console.error('Failed to start monitoring:', error.message);
  }
}

testMonitoring();
EOF

# 3. Run test
node test-start-monitoring.js

# Expected: Successfully starts monitoring, stores client connection
```

#### Test 6.4: Tool Integration
```bash
# Test start_monitoring via callTool
npm test -- tests/unit/task-6.4.test.ts

# Expected: Tool properly integrated and functional
```

### Phase 7: Console Message Collection

#### Test 7.1: Console Event Listener
```bash
# Test console message capture
npm test -- tests/unit/task-7.1.test.ts

# Expected: Console.messageAdded listeners set up, messages stored
```

#### Test 7.2: get_console_messages Tool Definition
```bash
# Test tool definition
npm test -- tests/unit/task-7.2.test.ts

# Expected: get_console_messages tool appears with filtering parameters
```

#### Test 7.3: getConsoleMessages Method
```bash
# Test console message retrieval
npm test -- tests/unit/task-7.3.test.ts

# Expected: Returns stored console messages with filtering and pagination
```

#### Manual Test 7.3: Live Console Message Collection
```bash
# 1. Create comprehensive test script:
cat > test-console-messages.js << 'EOF'
const { ChromeDevToolsMCPServer } = require('./dist/server');

async function testConsoleMessages() {
  const server = new ChromeDevToolsMCPServer();
  server.setupToolHandlers();
  
  try {
    // Get first tab
    const tabsResult = await server.callTool('list_tabs', {});
    if (tabsResult.tabs.length === 0) {
      console.log('No tabs found. Open a tab in Chrome first.');
      return;
    }
    
    const tabId = tabsResult.tabs[0].id;
    console.log(`Testing console messages for: ${tabsResult.tabs[0].title}`);
    
    // Start monitoring
    const monitorResult = await server.callTool('start_monitoring', { tabId });
    console.log('Monitoring started:', monitorResult.success);
    
    // Wait a moment for any existing console messages
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get console messages
    const messagesResult = await server.callTool('get_console_messages', { tabId });
    console.log('Console messages retrieved:', messagesResult.success);
    console.log('Total messages:', messagesResult.console.totalMessages);
    console.log('Messages:', messagesResult.console.messages);
    
    // Test with limit
    const limitedResult = await server.callTool('get_console_messages', { 
      tabId, 
      limit: 5 
    });
    console.log('Limited messages:', limitedResult.console.returned);
    
    // Test with level filter
    const errorResult = await server.callTool('get_console_messages', { 
      tabId, 
      level: 'error' 
    });
    console.log('Error messages:', errorResult.console.returned);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testConsoleMessages();
EOF

# 2. Run test
node test-console-messages.js

# Expected: Successfully retrieves console messages, filters work
# Note: To see messages, open browser dev tools and run:
# console.log('Test log message');
# console.warn('Test warning');  
# console.error('Test error');
```

#### Test 7.4: Tool Integration
```bash
# Test get_console_messages via callTool
npm test -- tests/unit/task-7.4.test.ts

# Expected: Tool properly integrated and functional
```

### Complete End-to-End Workflow Test

#### Manual Test: Full Workflow
```bash
# Create comprehensive workflow test:
cat > test-full-workflow.js << 'EOF'
const { ChromeDevToolsMCPServer } = require('./dist/server');

async function fullWorkflowTest() {
  console.log('=== Chrome DevTools MCP Server - Full Workflow Test ===\n');
  
  const server = new ChromeDevToolsMCPServer();
  server.setupToolHandlers();
  
  try {
    // Step 1: Test Chrome Connection
    console.log('1. Testing Chrome connection...');
    const connectResult = await server.callTool('connect_to_chrome', {});
    console.log(`   Result: ${connectResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Message: ${connectResult.message}`);
    if (connectResult.success) {
      console.log(`   Tabs found: ${connectResult.connection.tabCount}`);
    }
    console.log();
    
    // Step 2: List Chrome Tabs
    console.log('2. Listing Chrome tabs...');
    const tabsResult = await server.callTool('list_tabs', {});
    console.log(`   Result: ${tabsResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Tabs found: ${tabsResult.tabs.length}`);
    tabsResult.tabs.forEach((tab, i) => {
      console.log(`   Tab ${i + 1}: ${tab.title.substring(0, 50)}... (${tab.type})`);
    });
    console.log();
    
    if (tabsResult.tabs.length === 0) {
      console.log('⚠️  No tabs found. Please open at least one tab in Chrome.');
      return;
    }
    
    // Step 3: Start Monitoring
    const tabId = tabsResult.tabs[0].id;
    console.log(`3. Starting monitoring for tab: ${tabsResult.tabs[0].title.substring(0, 30)}...`);
    const monitorResult = await server.callTool('start_monitoring', { tabId });
    console.log(`   Result: ${monitorResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Message: ${monitorResult.message}`);
    if (monitorResult.success) {
      console.log(`   Domains enabled: ${monitorResult.monitoring.domains.join(', ')}`);
    }
    console.log();
    
    // Step 4: Check Storage
    console.log('4. Checking storage state...');
    const storage = server.getStorageInfo();
    console.log(`   Active clients: ${storage.clients.size}`);
    console.log(`   Console message tabs: ${storage.consoleMessages.size}`);
    console.log();
    
    // Step 5: Get Console Messages
    console.log('5. Retrieving console messages...');
    const messagesResult = await server.callTool('get_console_messages', { tabId });
    console.log(`   Result: ${messagesResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Total messages: ${messagesResult.console.totalMessages}`);
    console.log(`   Returned messages: ${messagesResult.console.returned}`);
    
    if (messagesResult.console.messages.length > 0) {
      console.log('   Recent messages:');
      messagesResult.console.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`     ${i + 1}. [${msg.level}] ${msg.text.substring(0, 60)}...`);
      });
    } else {
      console.log('   ℹ️  No console messages found. Try opening browser dev tools and running:');
      console.log('      console.log("Test message");');
      console.log('      console.warn("Test warning");');
      console.log('      console.error("Test error");');
    }
    console.log();
    
    // Step 6: Test Filtering
    console.log('6. Testing console message filtering...');
    
    // Test limit
    const limitedResult = await server.callTool('get_console_messages', { 
      tabId, 
      limit: 2 
    });
    console.log(`   Limited to 2: ${limitedResult.console.returned} messages returned`);
    
    // Test level filter
    const errorResult = await server.callTool('get_console_messages', { 
      tabId, 
      level: 'error' 
    });
    console.log(`   Error level only: ${errorResult.console.returned} messages returned`);
    console.log();
    
    console.log('🎉 Full workflow test completed successfully!');
    console.log('\n=== Summary ===');
    console.log(`✅ Chrome connection: ${connectResult.success ? 'Working' : 'Failed'}`);
    console.log(`✅ Tab listing: ${tabsResult.success ? 'Working' : 'Failed'}`);
    console.log(`✅ Tab monitoring: ${monitorResult.success ? 'Working' : 'Failed'}`);
    console.log(`✅ Console messages: ${messagesResult.success ? 'Working' : 'Failed'}`);
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

fullWorkflowTest();
EOF

# Run the complete workflow test
node test-full-workflow.js

# Expected: All steps complete successfully with proper status reporting
```

## Running All Tests

### Unit Test Suite
```bash
# Run complete test suite
npm test

# Expected: All 160+ tests pass
# Current test count: 23 test suites, 160 tests
```

### Build Verification
```bash
# Verify TypeScript compilation
npm run build

# Expected: Clean build with no TypeScript errors
```

### Linting and Type Checking
```bash
# Run linting (if configured)
npm run lint

# Run type checking (if configured)  
npm run typecheck

# Expected: No linting errors or type issues
```

## Troubleshooting

### Chrome Connection Issues
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Verify http://localhost:9222 is accessible
- Check firewall settings
- Try different port if 9222 is in use

### Test Failures
- Verify Node.js version is 22.x: `node --version`
- Clean install: `rm -rf node_modules && npm install`
- Check environment variables in `.env` file

### Console Message Testing
- Console messages only captured after monitoring starts
- Generate test messages in browser dev tools:
  ```javascript
  console.log('Test log message');
  console.warn('Test warning message');
  console.error('Test error message');
  console.info('Test info message');
  ```

## Performance Notes

- Console message storage is in-memory only
- Each tab maintains separate message storage
- Default limit of 100 messages per request (configurable 1-1000)
- Chrome connection uses 5-second timeout for tab connections

## Security Considerations

- Server provides full access to browser debugging APIs
- Intended for local development only  
- Console messages may contain sensitive information
- Network traffic monitoring (future phases) will capture all requests

---

**Next Steps**: After verifying all manual tests pass, the server is ready for Phase 9 (Network Monitoring) and Phase 10 (JavaScript Execution) implementation.