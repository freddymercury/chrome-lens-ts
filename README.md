# Chrome Lens - Chrome DevTools MCP Server

**Direct access to Chrome's DevTools Protocol for granular real-time debugging through Model Context Protocol (MCP)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-0.6.0-purple.svg)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 **Overview**

Chrome Lens is a Model Context Protocol (MCP) server that provides **AI agents and LLMs** with direct access to Chrome's DevTools Protocol. It enables real-time browser debugging, security auditing, performance monitoring, and application analysis through simple tool calls.

**Perfect for**: AI-driven debugging, automated testing, security analysis, performance optimization, and LLM-powered development workflows.

## ✨ **Features**

### **🔧 Core Debugging Tools**
- **Chrome Connection Management** - Connect to any Chrome instance with debugging enabled
- **Tab Management** - List, monitor, and control multiple browser tabs
- **JavaScript Execution** - Run code directly in browser context with full error handling
- **Real-time Monitoring** - Capture console messages, network requests, and runtime errors

### **🔒 Security & Performance**
- **Security Auditing** - Comprehensive vulnerability detection (XSS, headers, HTTPS)
- **Performance Monitoring** - Core Web Vitals analysis with optimization recommendations
- **Vulnerability Scanning** - Targeted security checks with remediation guidance

### **🤖 AI/LLM Ready**
- **Natural Language Interface** - AI agents can debug applications through simple tool calls
- **Structured Responses** - JSON-formatted results perfect for LLM processing
- **Error Context** - Rich error information with source mapping and suggestions

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js 22.x** (LTS) - Use `nvm use` or `nvm install`
- **Chrome/Chromium** with remote debugging enabled

### **1. Launch Chrome with Debugging**
```bash
# macOS/Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
```

### **2. Install and Build**
```bash
git clone <repository-url>
cd chrome-lens-ts
npm install
npm run build
```

### **3. Configure for Claude Desktop**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "chrome-lens-ts": {
      "command": "node",
      "args": ["/path/to/chrome-lens-ts/dist/server.js"],
      "env": {
        "CHROME_DEBUG_PORT": "9222",
        "CHROME_DEBUG_HOST": "localhost",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### **4. Verify Setup**
```bash
# Check Chrome debug port
curl http://localhost:9222/json/list

# Test MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/server.js
```

## 🛠 **Available Tools**

| Tool | Description | Status |
|------|-------------|---------|
| `connect_to_chrome` | Establish Chrome DevTools connection | ✅ Working |
| `list_tabs` | Get all open Chrome tabs | ✅ Working |
| `start_monitoring` | Begin real-time tab monitoring | ✅ Working |
| `get_console_messages` | Retrieve console output with filtering | ✅ Fixed |
| `get_network_activity` | Monitor HTTP requests/responses | ✅ Fixed |
| `execute_js` | Run JavaScript in tab context | ✅ Working |
| `security_audit` | Comprehensive security analysis | ✅ Working |
| `check_vulnerabilities` | Targeted vulnerability detection | ✅ Working |
| `get_performance_metrics` | Core Web Vitals and performance analysis | ✅ Working |
| `list_source_files` | List source files loaded in tab | ✅ New |

## 📖 **Usage Examples**

### **Basic Debugging Workflow**
```typescript
// 1. Connect to Chrome
await callTool('connect_to_chrome', { port: 9222 })

// 2. List available tabs
const tabs = await callTool('list_tabs', {})

// 3. Start monitoring a tab
await callTool('start_monitoring', { tabId: tabs[0].id })

// 4. Execute JavaScript for debugging
const result = await callTool('execute_js', {
  tabId: tabs[0].id,
  expression: 'document.querySelector("#error-element").textContent'
})

// 5. Get console messages
const logs = await callTool('get_console_messages', {
  tabId: tabs[0].id,
  level: 'error'
})
```

### **Security Analysis**
```typescript
// Comprehensive security audit
const audit = await callTool('security_audit', {
  tabId: 'ABC123',
  auditType: 'comprehensive',
  includeRecommendations: true
})

// Check for specific vulnerabilities
const xssCheck = await callTool('check_vulnerabilities', {
  tabId: 'ABC123',
  vulnerabilityType: 'xss'
})
```

### **Performance Monitoring**
```typescript
// Get Core Web Vitals
const metrics = await callTool('get_performance_metrics', {
  tabId: 'ABC123',
  includeDetails: true
})

console.log(`LCP: ${metrics.performance.metrics.coreWebVitals.LCP.value}s`)
console.log(`Recommendations: ${metrics.performance.recommendations.length}`)
```

### **Source File Analysis**
```typescript
// List all source files in a tab
const sourceFiles = await callTool('list_source_files', {
  tabId: 'ABC123',
  fileTypes: ['js', 'ts', 'css'],
  includeContent: false
})

console.log(`Found ${sourceFiles.sourceFiles.summary.totalFiles} files`)
console.log(`JS files: ${sourceFiles.sourceFiles.summary.breakdown.javascript}`)

// Get source file content for debugging
const sourceWithContent = await callTool('list_source_files', {
  tabId: 'ABC123',
  fileTypes: ['js'],
  includeContent: true
})
```

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Chrome Connection
CHROME_DEBUG_PORT=9222
CHROME_DEBUG_HOST=localhost

# Server Configuration  
MCP_SERVER_NAME=chrome-lens-ts
MCP_SERVER_VERSION=0.1.0
LOG_LEVEL=info

# Performance & Limits
MAX_TOOLS=20
TOOL_TIMEOUT_MS=30000
MAX_STORAGE_SIZE=10485760
```

### **Development Commands**
```bash
# Development
npm run dev          # Run with ts-node
npm run build        # Compile TypeScript
npm run typecheck    # Type checking only

# Testing
npm test             # Run all tests
npm run lint         # Code linting

# Production
npm start            # Run compiled server
```

## 🧪 **Testing**

Chrome Lens follows **Test-Driven Development (TDD)** with comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suite
npm test tests/unit/task-15.1.test.ts

# Coverage report
npm test -- --coverage
```

**Test Structure**:
- **Unit Tests**: Individual component testing
- **Integration Tests**: System interaction testing  
- **E2E Tests**: Complete workflow validation
- **Client Tests**: Real-world application testing

## 🔮 **Roadmap**

### **V1.0.1 - Critical Fixes** ✅ COMPLETED
- ✅ Fix console message capture (changed from deprecated Console to Runtime.consoleAPICalled)
- ✅ Fix network request monitoring (changed from assignment to proper event listeners)
- ✅ Add source file listing capability (new `list_source_files` tool)

### **V1.1 - Enhanced Debugging** (Next) ⭐ **FAST-TRACKED**
- 🔄 Real-time code modification with hot reload
- 🔄 Breakpoint management and step debugging
- 🔄 Variable inspection and runtime analysis
- 🔄 Enhanced error analysis with source mapping

### **V1.2 - LLM Intelligence** (Future) 🏆 **"BEST-IN-CLASS"**
- 🔄 Intelligent debugging strategy suggestions
- 🔄 Session management and context persistence
- 🔄 Impact analysis for code changes
- 🔄 Automated test generation

**Client Review**: Betfarm rated V1.1 as 8/10 and V1.2 as 10/10 "best-in-class" for LLM debugging workflows.

## 🚨 **Known Issues**

### **Fixed Issues (V1.0.1)**
- ~~**Console Message Capture**: Event listeners not capturing messages~~ ✅ **FIXED** - Now using `Runtime.consoleAPICalled`
- ~~**Network Monitoring**: Request/response handlers not working~~ ✅ **FIXED** - Now using proper `.on()` event listeners

### **Current Status**
All core debugging tools are now functional. Console message capture and network monitoring have been fixed and should show significant improvement in success rates.

## 🤝 **Contributing**

### **Development Setup**
1. **Use Node.js 22.x**: `nvm use`
2. **Follow TDD**: Write tests first (RED-GREEN-REFACTOR)
3. **TypeScript Only**: No JavaScript files in source
4. **Environment Variables**: All configuration via `.env`

### **Code Standards**
- **ESLint**: Modern TypeScript standards
- **Strict TypeScript**: Full type safety required
- **Test Coverage**: 80% minimum coverage
- **Documentation**: JSDoc for all public methods

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 **Links**

- **Model Context Protocol**: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)
- **Chrome DevTools Protocol**: [https://chromedevtools.github.io/devtools-protocol/](https://chromedevtools.github.io/devtools-protocol/)
- **Claude Desktop**: [https://claude.ai/code](https://claude.ai/code)

## 💡 **Use Cases**

### **For AI/LLM Engineers**
- Debug applications through natural language
- Automated testing and validation
- Real-time performance monitoring
- Security vulnerability assessment

### **For Developers**
- Remote debugging of production applications
- Automated performance auditing
- Security testing integration
- Browser automation workflows

### **For QA Teams**
- Automated regression testing
- Performance benchmarking
- Security compliance checking
- Cross-browser compatibility testing

---

**Built with ❤️ for the AI debugging revolution**