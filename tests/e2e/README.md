# Chrome Lens E2E Tests

## Overview

End-to-end tests for Chrome Lens MCP Server that verify the complete integration between:
- Chrome DevTools Protocol
- MCP Server implementation
- Intelligence layer features
- Real browser scenarios

## Prerequisites

1. **Chrome/Chromium** installed locally
2. **Node.js** >= 22.0.0
3. **Built distribution** (`npm run build`)

## Running E2E Tests

### Quick Start
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- basic-connection

# Run with visible browser (non-headless)
HEADLESS=false npm run test:e2e

# Run with custom Chrome path
CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
```

### Local Development
```bash
# Start test environment
./tests/e2e/scripts/start-test-env.sh

# Run tests in watch mode
npm run test:e2e:watch

# Clean up test environment
./tests/e2e/scripts/cleanup.sh
```

## Test Structure

### `/fixtures`
Static HTML/JS files that simulate various debugging scenarios:
- `index.html` - Basic page for connection tests
- `errors.html` - Page with various JavaScript errors
- `network.html` - Page that makes API calls
- `performance.html` - Page with performance issues
- `security.html` - Page with security vulnerabilities

### `/scenarios`
Test suites organized by feature:
- `basic-connection.e2e.ts` - Connection and tab management
- `error-debugging.e2e.ts` - Error capture and analysis
- `network-monitoring.e2e.ts` - Network request tracking
- `performance-analysis.e2e.ts` - Performance metrics
- `intelligence-layer.e2e.ts` - AI debugging suggestions

### `/utils`
Helper utilities:
- `chrome-launcher.ts` - Chrome instance management
- `mcp-client.ts` - MCP client for testing
- `test-helpers.ts` - Common test utilities
- `fixture-server.ts` - HTTP server for test pages

## Writing New E2E Tests

### Basic Template
```typescript
import { launchChrome, connectMCP, loadFixture } from '../utils';

describe('Feature Name', () => {
  let chrome: ChromeInstance;
  let mcp: MCPTestClient;
  
  beforeAll(async () => {
    chrome = await launchChrome();
    mcp = await connectMCP(chrome.debugPort);
  });
  
  afterAll(async () => {
    await mcp.disconnect();
    await chrome.close();
  });
  
  test('should do something', async () => {
    // Arrange
    const { tabId } = await loadFixture(chrome, 'test.html');
    
    // Act
    const result = await mcp.call('tool_name', { tabId });
    
    // Assert
    expect(result).toMatchObject({
      // expected structure
    });
  });
});
```

### Best Practices

1. **Use fixtures** instead of external websites
2. **Clean up resources** in afterAll/afterEach
3. **Use explicit waits** instead of sleep()
4. **Test one feature** per test case
5. **Mock external dependencies** when possible

## Debugging E2E Tests

### Enable Debug Logging
```bash
DEBUG=chrome-lens:* npm run test:e2e
```

### Keep Browser Open
```bash
KEEP_BROWSER_OPEN=true npm run test:e2e
```

### Use Chrome DevTools
```bash
# Connect to test Chrome instance
chrome://inspect -> Configure -> localhost:9222
```

### Common Issues

**Chrome fails to launch**
- Check Chrome is installed: `which google-chrome`
- Try different binary: `CHROME_PATH=/path/to/chrome`
- Check port conflicts: `lsof -i :9222`

**Tests timeout**
- Increase timeout: `jest.setTimeout(30000)`
- Check network issues
- Verify fixtures are loading

**Flaky tests**
- Add retry logic
- Use better wait conditions
- Check for race conditions

## CI/CD Integration

E2E tests run automatically on:
- Pull requests (subset of critical tests)
- Main branch commits (full suite)
- Release tags (full suite + performance)

See `.github/workflows/e2e.yml` for configuration.

## Performance Benchmarks

Expected test execution times:
- Basic connection: < 2s
- Feature tests: < 5s each
- Full suite: < 3 minutes

## Contributing

1. Add fixtures for new scenarios
2. Write focused test cases
3. Update this README
4. Ensure tests pass locally
5. Submit PR with test results