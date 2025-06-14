# Chrome DevTools MCP Server

An MCP (Model Context Protocol) server that provides **direct access to Chrome's DevTools Protocol**, offering granular real-time debugging capabilities that go beyond traditional testing frameworks and browser automation tools.

## Why This MCP vs. Existing Solutions?

While Playwright MCP and other browser automation tools handle most testing scenarios, this MCP provides **raw Chrome DevTools Protocol access** for scenarios requiring deeper browser insight:

### **Edge Cases This Solves:**
- **Production Debugging**: Connect to live Chrome instances (not just test browsers)
- **Development-Time Monitoring**: Real-time browser debugging while coding
- **Enhanced Test Analysis**: Deeper insight than testing frameworks provide
- **Non-Automated Debugging**: Manual testing scenarios with full diagnostic data
- **Forensic Browser Analysis**: Complete request/response data, detailed stack traces, timing information

### **What Makes This Different:**
- **Raw CDP Data**: Unfiltered Chrome DevTools Protocol information
- **Real-Time Streaming**: Live event monitoring during development
- **Complete Network Details**: Full headers, timing, redirect chains (not just basic request/response)
- **Detailed Error Context**: Full stack traces with source maps and execution context
- **Production Connectivity**: Debug running applications, not just test environments

## Features

- **Granular Console Analysis**: Complete console data with timestamps, source files, line numbers, and execution context
- **Comprehensive Network Monitoring**: Full request/response headers, timing data, redirect chains, and WebSocket traffic
- **Detailed Runtime Errors**: JavaScript errors with complete stack traces, source maps, and call frames
- **Live JavaScript Execution**: Execute arbitrary JavaScript in any Chrome tab and inspect results
- **Production DOM Inspection**: Real-time DOM snapshots and element querying in live applications
- **Real-time Event Streaming**: Live monitoring of browser activity as it happens
- **Comprehensive Security Auditing**: Multi-layered security analysis including XSS, CSRF, mixed content, exposed secrets, and more

## Comparison with Existing Tools

| Feature | Playwright MCP | Chrome DevTools MCP | Use Case |
|---------|----------------|-------------------|----------|
| Test Automation | ✅ Excellent | ⚠️ Limited | Choose Playwright for test automation |
| Production Debugging | ❌ No | ✅ Full Access | Debug live applications |
| Network Detail | ⚠️ Basic | ✅ Complete Headers/Timing | API debugging, performance analysis |
| Console Analysis | ⚠️ Basic Logs | ✅ Full Context + Sources | Complex error debugging |
| Development Monitoring | ❌ No | ✅ Real-time | Live development debugging |
| Raw Browser Data | ❌ Filtered | ✅ Unfiltered CDP | Forensic analysis, edge cases |
| Security Auditing | ❌ No | ✅ Comprehensive | Security testing, compliance checks |

## When to Use This MCP

### ✅ **Perfect For:**
- **Production Issue Debugging**: Connect to running applications to diagnose live issues
- **Development-Time Monitoring**: Real-time browser debugging while coding
- **Enhanced Test Analysis**: Get deeper insight than test frameworks provide during test execution
- **API Integration Debugging**: Complete request/response analysis with full headers and timing
- **Performance Investigation**: Detailed network timing, resource loading analysis
- **Complex Error Diagnosis**: Full stack traces with source mapping and execution context
- **Manual Testing Enhancement**: Comprehensive browser state inspection during manual QA
- **Security Auditing**: Automated security vulnerability scanning and compliance checking

### ❌ **Not Recommended For:**
- **Basic Test Automation**: Use Playwright MCP instead - it's designed for this
- **Simple Screenshot/DOM Queries**: Existing browser automation tools are sufficient
- **Headless Testing**: Testing frameworks handle this better

### 🤝 **Complementary Use:**
- **Alongside Playwright**: Use both - Playwright for automation, this for deep debugging
- **With Existing Test Suites**: Run your normal tests, use this MCP for failure analysis
- **During Development**: Monitor browser while building features

## Key Advantages Over Testing Frameworks

### **Granular Console Data**
```javascript
// Testing frameworks give you:
"console.log: error occurred"

// This MCP gives you:
{
  "timestamp": "2025-06-06T10:30:00Z",
  "level": "error",
  "text": "Cannot read property 'length' of undefined", 
  "source": "other-console-api",
  "line": 42,
  "column": 15,
  "url": "https://myapp.com/js/vendor.js",
  "stackTrace": { /* full call stack */ }
}
```

### **Complete Network Analysis**
```javascript
// Testing frameworks: Basic request/response
// This MCP: Complete diagnostic data
{
  "request": {
    "headers": { "Authorization": "Bearer xyz", "Custom-Header": "value" },
    "timing": { "dnsLookup": 45, "tcpConnect": 120, "sslHandshake": 200 }
  },
  "response": {
    "headers": { "Set-Cookie": "session=abc", "Cache-Control": "no-cache" },
    "redirectChain": [/* full redirect history */],
    "certificateInfo": { /* SSL certificate details */ }
  }
}
```

### **Runtime Error Details**
```javascript
// Testing frameworks: "TypeError occurred"
// This MCP: Full forensic analysis
{
  "exceptionDetails": {
    "text": "Cannot read property 'length' of undefined",
    "url": "https://myapp.com/js/main.js",
    "lineNumber": 42,
    "columnNumber": 15,
    "stackTrace": {
      "callFrames": [
        { "functionName": "validateForm", "url": "main.js", "lineNumber": 42 },
        { "functionName": "handleSubmit", "url": "main.js", "lineNumber": 28 }
      ]
    },
    "executionContextId": 1
  }
}
```

1. **Clone/Create the project**:
```bash
mkdir chrome-devtools-mcp
cd chrome-devtools-mcp
```

2. **Install dependencies**:
```bash
npm install
```

3. **Make the server executable**:
```bash
chmod +x server.js
```

## Setup Chrome for Debugging

Launch Chrome with remote debugging enabled:

```bash
# On macOS/Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# On Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug

# Alternative: Use existing Chrome instance (will restart Chrome)
google-chrome --remote-debugging-port=9222
```

**Important**: You need to close all existing Chrome instances before launching with debugging enabled, or use a separate user data directory.

## MCP Client Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "node",
      "args": ["/path/to/chrome-devtools-mcp/server.js"],
      "env": {}
    }
  }
}
```

### For Other MCP Clients

Use the stdio transport with the server executable:
```bash
node server.js
```

## Available Tools

### 1. `connect_to_chrome`
Connect to Chrome DevTools instance.
```json
{
  "port": 9222,
  "host": "localhost"
}
```

### 2. `list_tabs`
List all open Chrome tabs with their IDs, titles, and URLs.

### 3. `start_monitoring`
Start monitoring a specific tab for real-time activity.
```json
{
  "tabId": "tab-id-here"
}
```

### 4. `get_console_messages`
Get console output from a tab.
```json
{
  "tabId": "tab-id-here",
  "limit": 100,
  "level": "error"
}
```

Available levels: `log`, `warn`, `error`, `info`, `debug`

### 5. `get_network_activity`
Get network requests and responses.
```json
{
  "tabId": "tab-id-here",
  "limit": 50
}
```

### 6. `get_runtime_errors`
Get JavaScript runtime errors.
```json
{
  "tabId": "tab-id-here",
  "limit": 20
}
```

### 7. `execute_js`
Execute JavaScript in a tab and get the result.
```json
{
  "tabId": "tab-id-here",
  "expression": "document.title"
}
```

### 8. `get_dom_snapshot`
Get DOM content from a tab.
```json
{
  "tabId": "tab-id-here",
  "selector": ".error-message"
}
```

### 9. `stop_monitoring`
Stop monitoring a tab.
```json
{
  "tabId": "tab-id-here"
}
```

### 10. `security_audit`
Perform comprehensive security audit of a web page.
```json
{
  "tabId": "tab-id-here",
  "auditType": "full",
  "depth": "detailed"
}
```

Available audit types: `full`, `content`, `network`, `headers`, `cookies`, `csp`, `xss`, `secrets`
Available depths: `basic`, `detailed`, `comprehensive`

### 11. `check_vulnerabilities`
Check for specific security vulnerabilities.
```json
{
  "tabId": "tab-id-here",
  "vulnerabilityTypes": ["xss", "csrf", "clickjacking", "mixed-content"]
}
```

Available types: `xss`, `csrf`, `clickjacking`, `mixed-content`, `weak-crypto`, `exposed-secrets`, `insecure-forms`

### 12. `analyze_permissions`
Analyze browser permissions and feature usage.
```json
{
  "tabId": "tab-id-here"
}
```

## Usage Examples

### Basic Workflow

1. **Start Chrome with debugging**:
   ```bash
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

2. **Connect to Chrome**:
   ```
   Use the connect_to_chrome tool
   ```

3. **List available tabs**:
   ```
   Use the list_tabs tool to see all open tabs
   ```

4. **Start monitoring a tab**:
   ```
   Use start_monitoring with the desired tab ID
   ```

5. **Query console output**:
   ```
   Use get_console_messages to see console logs
   ```

### Debugging a Website

1. Navigate to the website in Chrome
2. Start monitoring the tab
3. Reproduce the issue
4. Query console messages, network activity, and runtime errors
5. Execute JavaScript to inspect the current state

## Troubleshooting

### Chrome Connection Issues

- **Error: "Failed to connect to Chrome"**
  - Ensure Chrome is running with `--remote-debugging-port=9222`
  - Check that port 9222 is not blocked by firewall
  - Try navigating to `http://localhost:9222` in a browser to verify

### No Data Appearing

- **Console messages not showing**
  - Make sure you've called `start_monitoring` for the tab
  - Check that the tab is actively generating console output
  - Verify the tab ID is correct

### Permission Issues

- **Chrome won't start with debugging**
  - Close all existing Chrome instances completely
  - Use a different user data directory
  - Check file permissions on the user data directory

## Security Considerations

- **Local Development Only**: This server provides full access to browser debugging APIs
- **Network Access**: By default, Chrome debugging only accepts local connections
- **Data Exposure**: Console messages and network traffic may contain sensitive information

## Development

To modify or extend the server:

1. **Add new tools** in the `setupToolHandlers()` method
2. **Extend monitoring** by adding more CDP event listeners
3. **Add data filtering** in the query methods
4. **Implement caching** for frequently accessed data

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `chrome-remote-interface`: Chrome DevTools Protocol client
- `ws`: WebSocket support for real-time communication

## License

MIT License - feel free to modify and distribute.