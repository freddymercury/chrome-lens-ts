# Chrome DevTools MCP Server - Granular MVP Build Plan

## 🧪 **TEST DRIVEN DEVELOPMENT (TDD) REQUIRED**
**ALL TASKS MUST FOLLOW RED-GREEN-REFACTOR CYCLE**
- **RED**: Write failing tests first that define expected behavior (in TypeScript)
- **GREEN**: Write minimal TypeScript code to make tests pass
- **REFACTOR**: Improve code quality while keeping tests green

## 📋 **NODE.JS VERSION REQUIREMENT**
**MUST USE NODE.JS 22.x (LTS as of June 2025)**
- Use `.nvmrc` file to specify exact version
- Install with: `nvm use` or `nvm install`
- Verify with: `node --version`

## 🧪 **TESTING DIRECTORY STRUCTURE**
```
tests/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for system interactions
├── e2e/          # End-to-end tests for complete workflows
├── debug/        # Debug and troubleshooting utilities
└── temp/         # Temporary test files (gitignored)
```

## 🔒 **ENVIRONMENT VARIABLES MANDATORY**
**ALL CONFIGURATION MUST USE .env FILES**
- Never hardcode secrets, ports, or configuration values
- Always use `process.env.VARIABLE_NAME`
- Update .env.example with any new variables
- NEVER delete .env or .env.example files

## Phase 1: Foundation Setup

### Task 1.1: Initialize TypeScript Project
**Goal**: Create basic TypeScript project structure with package.json and tsconfig.json
**TDD**: Write tests for valid package.json and TypeScript configuration first
**Environment**: Create .env.example template and .nvmrc for Node.js version
**Unit Tests**: 
- `tests/unit/task-1.1.test.ts`
- Test package.json validity, TypeScript config, .gitignore patterns, .env.example structure, .nvmrc version
**Test**: `npm init` succeeds, package.json exists with correct fields, tsconfig.json configured for strict TypeScript, .env.example created, .nvmrc specifies Node.js 22.x
**Files**: 
- `package.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `.nvmrc`
**Start**: Empty directory
**End**: Valid TypeScript project that can compile and install dependencies with environment setup and Node.js version pinning

### Task 1.2: Install Core Dependencies
**Goal**: Add MCP SDK and Chrome Remote Interface dependencies
**TDD**: Write tests to verify dependencies are installable and importable
**Environment**: Verify .env loading works correctly
**Unit Tests**:
- `tests/unit/task-1.2.test.ts` 
- Test dependency installation, TypeScript import functionality, version compatibility
**Test**: `npm install` succeeds without errors, node_modules populated, all imports work
**Dependencies**: 
- `@modelcontextprotocol/sdk`
- `chrome-remote-interface`
- `ws`
- `jest` + `@types/jest` (for TypeScript testing)
- `ts-jest` (TypeScript Jest transformer)
- `dotenv` (for environment variables)
- `typescript` (TypeScript compiler)
- `ts-node` (TypeScript execution)
**Start**: package.json exists
**End**: All dependencies installed and importable

### Task 1.3: Create Basic Server File Structure
**Goal**: Create main server.ts file with basic TypeScript imports and exports
**TDD**: Write tests for valid TypeScript syntax and import structure first
**Environment**: Use `process.env.NODE_ENV` for environment detection
**Unit Tests**:
- `tests/unit/task-1.3.test.ts`
- Test TypeScript file syntax validity, import statements, basic class structure
**Test**: `npx ts-node server.ts` runs without syntax errors (may exit immediately)
**Files**: `server.ts` with TypeScript imports only
**Start**: Dependencies installed
**End**: TypeScript server file exists and compiles successfully

## Phase 2: MCP Server Skeleton

### Task 2.1: Implement Basic MCP Server Class
**Goal**: Create ChromeDevToolsMCPServer class with constructor
**TDD**: Write tests for class instantiation and basic configuration first
**Environment**: Use `process.env.MCP_SERVER_NAME` and `process.env.MCP_SERVER_VERSION`
**Unit Tests**:
- `tests/unit/task-2.1.test.ts`
- Test TypeScript class instantiation, server configuration, constructor parameters
**Test**: Can instantiate class without errors
**Code**: 
```typescript
class ChromeDevToolsMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server({
      name: process.env.MCP_SERVER_NAME || 'chrome-devtools-mcp',
      version: process.env.MCP_SERVER_VERSION || '0.1.0'
    });
  }
}
```
**Start**: Empty server.ts
**End**: Class instantiates successfully

### Task 2.2: Add Error Handling Setup
**Goal**: Implement setupErrorHandling method
**TDD**: Write tests for error handling scenarios first
**Environment**: Use `process.env.LOG_LEVEL` for logging configuration
**Unit Tests**:
- `tests/unit/task-2.2.test.ts`
- Test SIGINT handling, error logging, graceful shutdown
**Test**: Process doesn't crash on SIGINT, logs errors properly
**Code**: Error handlers for server.onerror and process.on('SIGINT')
**Start**: Basic class exists
**End**: Error handling works (test with `kill -INT <pid>`)

### Task 2.3: Add Server Run Method
**Goal**: Implement run() method with stdio transport
**TDD**: Write tests for server startup and transport connection first
**Environment**: Use `process.env.MCP_TRANSPORT` for transport configuration
**Unit Tests**:
- `tests/unit/task-2.3.test.ts`
- Test server startup, stdio transport, connection handling
**Test**: Server starts and listens on stdio without crashing
**Code**: StdioServerTransport connection
**Start**: Error handling implemented
**End**: `npx ts-node server.ts` starts MCP server successfully

## Phase 3: Basic Tool Infrastructure

### Task 3.1: Implement Empty Tool Handler Setup
**Goal**: Add setupToolHandlers method with empty tool list
**TDD**: Write tests for tool list response format first
**Environment**: Use `process.env.MAX_TOOLS` for tool limit configuration
**Unit Tests**:
- `tests/unit/task-3.1.test.ts`
- Test ListToolsRequest handler, empty array response, proper MCP format
**Test**: ListToolsRequest returns empty array
**Code**: setRequestHandler for ListToolsRequestSchema
**Start**: Server runs successfully
**End**: MCP client can request tools (gets empty list)

### Task 3.2: Add CallTool Handler Structure
**Goal**: Implement CallToolRequestSchema handler with switch statement
**TDD**: Write tests for unknown tool error handling first
**Environment**: Use `process.env.TOOL_TIMEOUT_MS` for tool execution timeout
**Unit Tests**:
- `tests/unit/task-3.2.test.ts`
- Test CallTool handler, error responses, proper MCP error codes
**Test**: Calling unknown tool returns proper error
**Code**: Switch statement that throws MethodNotFound for any tool
**Start**: ListTools handler exists
**End**: Tool calls fail gracefully with proper error codes

### Task 3.3: Add Client Storage Maps
**Goal**: Initialize data storage Maps in constructor
**TDD**: Write tests for Map initialization and accessibility first
**Environment**: Use `process.env.MAX_STORAGE_SIZE` for memory limits
**Unit Tests**:
- `tests/unit/task-3.3.test.ts`
- Test Map initialization, memory management, data structure
**Test**: Maps exist and are accessible
**Code**: this.clients, this.consoleMessages, this.networkLogs, this.errors Maps
**Start**: Basic handlers exist
**End**: Storage maps initialized and accessible

## Phase 4: Chrome Connection

### Task 4.1: Add connect_to_chrome Tool Definition
**Goal**: Add tool definition to ListTools response
**TDD**: Write tests for tool schema validation first
**Environment**: Use `process.env.CHROME_DEBUG_PORT` and `process.env.CHROME_DEBUG_HOST`
**Unit Tests**:
- `tests/unit/task-4.1.test.ts`
- Test tool definition structure, parameter validation, schema compliance
**Test**: ListTools returns connect_to_chrome tool with correct schema
**Code**: Tool definition object in tools array
**Start**: Empty tools list
**End**: connect_to_chrome appears in tool list

### Task 4.2: Implement connectToChrome Method (Basic)
**Goal**: Basic CDP.List() call to test Chrome connection
**TDD**: Write tests for Chrome connection scenarios first
**Environment**: Use `process.env.CHROME_DEBUG_PORT` and `process.env.CHROME_DEBUG_HOST`
**Unit Tests**:
- `tests/unit/task-4.2.test.ts`
- Test Chrome connection, error handling, response formatting
**Test**: Returns success when Chrome running with --remote-debugging-port=9222
**Code**: Simple CDP.List() call, return formatted response
**Start**: Tool defined
**End**: Can connect to running Chrome instance

### Task 4.3: Add connectToChrome to CallTool Handler
**Goal**: Wire connectToChrome method to switch statement
**TDD**: Write tests for tool execution path first
**Environment**: Inherit Chrome connection settings from environment
**Unit Tests**:
- `tests/unit/task-4.3.test.ts`
- Test switch case execution, parameter passing, response handling
**Test**: Calling connect_to_chrome tool executes method
**Code**: Case for 'connect_to_chrome' in switch statement
**Start**: Method exists
**End**: Tool call executes connectToChrome method

## Phase 5: Tab Listing

### Task 5.1: Add list_tabs Tool Definition
**Goal**: Add list_tabs to tool definitions
**Test**: Tool appears in ListTools response
**Code**: list_tabs tool definition object
**Start**: connect_to_chrome tool working
**End**: list_tabs in tool list

### Task 5.2: Implement listTabs Method
**Goal**: Return formatted list of Chrome tabs
**Test**: Returns tab list with id, title, url, type fields
**Code**: CDP.List() with proper formatting
**Start**: Tool defined
**End**: Returns properly formatted tab data

### Task 5.3: Wire listTabs to Handler
**Goal**: Add case to switch statement
**Test**: list_tabs tool call works
**Code**: Case for 'list_tabs'
**Start**: Method exists
**End**: Tool execution works end-to-end

## Phase 6: Tab Connection

### Task 6.1: Add start_monitoring Tool Definition
**Goal**: Define start_monitoring tool with tabId parameter
**Test**: Tool schema validation works
**Code**: Tool definition with tabId required parameter
**Start**: list_tabs working
**End**: start_monitoring tool defined

### Task 6.2: Implement connectToTab Method (Basic)
**Goal**: Establish CDP connection to specific tab
**Test**: Can connect to tab, enable basic domains
**Code**: CDP({ tab: tabId }), enable Console/Runtime domains
**Start**: Tool defined
**End**: Can connect to individual tab

### Task 6.3: Implement startMonitoring Method
**Goal**: Call connectToTab and store client
**Test**: Client stored in this.clients Map
**Code**: Call connectToTab, store in Map
**Start**: connectToTab works
**End**: Tab monitoring state tracked

### Task 6.4: Wire startMonitoring to Handler
**Goal**: Add to switch statement
**Test**: start_monitoring tool call works
**Code**: Case for 'start_monitoring'
**Start**: Method exists
**End**: Can start monitoring tab via tool call

## Phase 7: Console Message Collection

### Task 7.1: Add Console Event Listener to connectToTab
**Goal**: Listen for Console.messageAdded events
**Test**: Console messages stored when tab generates output
**Code**: client.Console.messageAdded event handler
**Start**: Tab connection works
**End**: Console messages captured and stored

### Task 7.2: Add get_console_messages Tool Definition
**Goal**: Define tool for retrieving console messages
**Test**: Tool appears in list with proper schema
**Code**: Tool definition with tabId, limit, level parameters
**Start**: Console collection works
**End**: Tool properly defined

### Task 7.3: Implement getConsoleMessages Method
**Goal**: Return stored console messages for tab
**Test**: Returns formatted console message array
**Code**: Retrieve from this.consoleMessages Map, apply filters
**Start**: Tool defined
**End**: Returns console message data

### Task 7.4: Wire getConsoleMessages to Handler
**Goal**: Add to switch statement
**Test**: get_console_messages tool call works
**Code**: Case for 'get_console_messages'
**Start**: Method exists
**End**: Can retrieve console messages via tool

## Phase 8: Basic Testing & Validation

### Task 8.1: Add Manual Test Documentation
**Goal**: Document how to test each implemented feature
**Test**: Can follow instructions to verify all features work
**Files**: `TESTING.md` with step-by-step testing instructions
**Start**: Console messages working
**End**: Clear testing procedures documented

### Task 8.2: Add Error Handling to All Methods
**Goal**: Wrap all methods in try/catch with proper MCP errors
**Test**: Invalid inputs return proper error messages
**Code**: Try/catch blocks, McpError throwing
**Start**: Basic functionality works
**End**: All methods handle errors gracefully

### Task 8.3: Test End-to-End Workflow
**Goal**: Verify complete workflow works
**Test**: Can connect → list tabs → start monitoring → get console messages
**Steps**: Full workflow test with actual Chrome instance
**Start**: All basic tools implemented
**End**: Complete basic workflow functional

## Phase 9: Network Monitoring Foundation

### Task 9.1: Add Network Domain to connectToTab
**Goal**: Enable Network domain and add request listeners
**Test**: Network requests captured when tab makes requests
**Code**: client.Network.enable(), requestWillBeSent listener
**Start**: Console monitoring works
**End**: Network requests being captured

### Task 9.2: Add Response Listener
**Goal**: Capture network responses
**Test**: Both requests and responses stored
**Code**: client.Network.responseReceived listener
**Start**: Request capture works
**End**: Complete request/response cycle captured

### Task 9.3: Add get_network_activity Tool Definition
**Goal**: Define tool for network data retrieval
**Test**: Tool appears with correct schema
**Code**: Tool definition with tabId, limit parameters
**Start**: Network capture works
**End**: Tool defined for network retrieval

### Task 9.4: Implement getNetworkActivity Method
**Goal**: Return stored network activity
**Test**: Returns formatted network request/response data
**Code**: Retrieve from this.networkLogs Map
**Start**: Tool defined
**End**: Network data retrievable

### Task 9.5: Wire getNetworkActivity to Handler
**Goal**: Add to switch statement
**Test**: get_network_activity tool works
**Code**: Case for 'get_network_activity'
**Start**: Method exists
**End**: Network monitoring complete

## Phase 10: TypeScript/JavaScript Execution

### Task 10.1: Add execute_js Tool Definition
**Goal**: Define TypeScript/JavaScript execution tool
**Test**: Tool schema includes tabId and expression parameters
**Code**: Tool definition with required parameters
**Start**: Network monitoring complete
**End**: Tool defined for TypeScript/JS execution

### Task 10.2: Implement executeJS Method
**Goal**: Execute TypeScript/JavaScript in tab context
**Test**: Can execute simple expressions and get results
**Code**: client.Runtime.evaluate() call
**Start**: Tool defined
**End**: TypeScript/JavaScript execution works

### Task 10.3: Wire executeJS to Handler
**Goal**: Add to switch statement
**Test**: execute_js tool call works
**Code**: Case for 'execute_js'
**Start**: Method exists
**End**: TypeScript/JS execution available via tool

## Phase 11: Security Audit Foundation

### Task 11.1: Add security_audit Tool Definition
**Goal**: Define comprehensive security audit tool
**Test**: Tool appears with auditType and depth parameters
**Code**: Tool definition with enum parameters
**Start**: TypeScript/JS execution works
**End**: Security audit tool defined

### Task 11.2: Implement getPageSecurityInfo Method
**Goal**: Get basic page security information
**Test**: Returns URL, protocol, HTTPS status
**Code**: Basic Runtime.evaluate calls for page info
**Start**: Tool defined
**End**: Basic page security info retrievable

### Task 11.3: Implement performSecurityAudit Skeleton
**Goal**: Basic audit framework with one check
**Test**: Calls getPageSecurityInfo and returns formatted result
**Code**: Basic audit structure calling getPageSecurityInfo
**Start**: getPageSecurityInfo works
**End**: Security audit returns basic results

### Task 11.4: Wire Security Audit to Handler
**Goal**: Add to switch statement
**Test**: security_audit tool call works
**Code**: Case for 'security_audit'
**Start**: Method exists
**End**: Basic security audit functional

## Phase 12: Security Header Analysis

### Task 12.1: Implement auditSecurityHeaders Method
**Goal**: Check for security headers in network responses
**Test**: Detects presence/absence of security headers
**Code**: Parse this.networkLogs for response headers
**Start**: Basic audit framework works
**End**: Security header analysis functional

### Task 12.2: Add Security Header Check to Main Audit
**Goal**: Include header audit in performSecurityAudit
**Test**: Security audit returns header analysis
**Code**: Call auditSecurityHeaders in main audit method
**Start**: Header method exists
**End**: Headers included in audit results

### Task 12.3: Add Security Score Calculation
**Goal**: Calculate numeric security score
**Test**: Returns score 0-100 based on findings
**Code**: calculateSecurityScore method
**Start**: Header audit working
**End**: Audit includes security score

## Phase 13: XSS Vulnerability Detection

### Task 13.1: Implement checkXSSVulnerabilities Method
**Goal**: Basic XSS vulnerability detection
**Test**: Detects inline scripts, event handlers
**Code**: Runtime.evaluate with DOM analysis
**Start**: Security framework exists
**End**: XSS detection functional

### Task 13.2: Add XSS Check to Main Audit
**Goal**: Include XSS analysis in security audit
**Test**: Audit results include XSS findings
**Code**: Call checkXSSVulnerabilities in audit
**Start**: XSS method exists
**End**: XSS included in audit

### Task 13.3: Add check_vulnerabilities Tool Definition
**Goal**: Define targeted vulnerability checking tool
**Test**: Tool appears with vulnerability type parameters
**Code**: Tool definition with vulnerabilityTypes array
**Start**: XSS audit working
**End**: Vulnerability check tool defined

### Task 13.4: Implement checkVulnerabilities Method
**Goal**: Targeted vulnerability checking
**Test**: Can check specific vulnerability types
**Code**: Switch based on vulnerability types
**Start**: Tool defined
**End**: Targeted vulnerability checking works

### Task 13.5: Wire Vulnerability Check to Handler
**Goal**: Add to switch statement
**Test**: check_vulnerabilities tool works
**Code**: Case for 'check_vulnerabilities'
**Start**: Method exists
**End**: Vulnerability checking functional

## Phase 14: Documentation & Polish

### Task 14.1: Create Complete README
**Goal**: Comprehensive documentation
**Test**: README explains all features and usage
**Files**: Complete README.md
**Start**: All core features working
**End**: Documentation complete

### Task 14.2: Add Usage Examples
**Goal**: Real-world usage examples
**Test**: Examples work when followed
**Code**: Example code snippets in README
**Start**: README exists
**End**: Examples demonstrate functionality

### Task 14.3: Final Integration Test
**Goal**: Complete end-to-end testing
**Test**: All tools work in realistic scenario
**Steps**: Full workflow with security audit
**Start**: All features implemented
**End**: MVP fully functional

## MVP Completion Criteria

**Core Features Working**:
- ✅ Chrome connection and tab listing
- ✅ Console message monitoring
- ✅ Network activity tracking  
- ✅ TypeScript/JavaScript execution
- ✅ Basic security auditing
- ✅ XSS vulnerability detection
- ✅ Security header analysis

**Testing Requirements**:
- All tools callable via MCP protocol
- Unit tests for each task with >80% coverage
- Error handling for invalid inputs
- Graceful handling of Chrome connection issues
- Full regression test suite passes
- TDD approach documented for each component

**Environment Variable Requirements**:
- All configuration through .env files
- No hardcoded secrets or configuration
- .env.example properly maintained
- Environment variable usage documented

**Documentation Requirements**:
- Task completion documents for all 42 tasks
- Diff files showing code changes
- Test results and coverage reports
- Environment setup instructions

**Success Metrics**:
- Can connect to Chrome and monitor tab activity
- Security audit identifies real vulnerabilities
- Console and network data captured accurately
- TypeScript/JavaScript execution returns valid results
- All unit tests pass with comprehensive coverage
- Complete environment variable configuration