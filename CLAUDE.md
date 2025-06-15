# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome DevTools MCP (Model Context Protocol) Server written in TypeScript (NO JavaScript - TypeScript only) that provides direct access to Chrome's DevTools Protocol. It offers granular real-time browser debugging capabilities for production debugging, development-time monitoring, and security auditing.

**Current Version**: v1.1.1 (~98% success rate in production)
**Target Version**: v1.2 (Intelligence Layer + LLM Debugging)

## Key Architecture

- **MCP Server**: Uses @modelcontextprotocol/sdk for protocol implementation
- **Chrome Integration**: Uses chrome-remote-interface for DevTools Protocol communication
- **Real-time Monitoring**: WebSocket-based event streaming from Chrome tabs
- **Security Auditing**: Comprehensive vulnerability detection including XSS, CSRF, security headers
- **Data Storage**: In-memory Maps for console messages, network logs, and runtime errors
- **Pure Functions**: Prefer pure functions for all utilities (testability, predictability)
- **Error Handling**: Comprehensive error messages with alternatives and actionable hints

## Development Requirements

### Node.js Version
- **Required**: Node.js 22.x (LTS as of June 2025)
- Use `.nvmrc` file to specify exact Node.js version
- Install with: `nvm use` or `nvm install`
- Verify version with: `node --version`

### TypeScript Only
- ALL code must be written in TypeScript (.ts files)
- NO JavaScript files (.js) allowed in source code
- Use proper TypeScript types and interfaces
- Enable strict TypeScript compiler options

### Module Format (CRITICAL)
- **Production Build**: ES modules format (ES2022)
- **`"type": "module"`** must ALWAYS be in package.json
- TypeScript compiles to ES2022 modules for MCP SDK compatibility
- Build output uses ES module syntax (`import`/`export`)
- The MCP SDK requires ES modules and will NOT work with CommonJS
- **WARNING**: Never remove `"type": "module"` - this broke the server in v1.1

### Test-Driven Development (TDD) - MANDATORY
ALL development MUST follow RED-GREEN-REFACTOR cycle:
- **RED**: Write failing tests first that define expected behavior (in TypeScript)
- **GREEN**: Write minimal TypeScript code to make tests pass  
- **REFACTOR**: Improve code quality while keeping tests green
- **Coverage**: Aim for 100% test coverage on new code
- **Regression**: Run existing tests before committing changes

### Pure Functions Architecture
Prefer pure functions for all utilities:
```typescript
// ✅ GOOD - Pure function
export function calculateMetric(data: InputData): OutputMetric {
  // No side effects, deterministic output
  return processedMetric;
}

// ❌ BAD - Side effects
function updateGlobalMetric(data: InputData): void {
  globalState.metric = calculate(data); // Side effect!
}
```

### Error Handling Pattern
All errors must provide actionable guidance:
```typescript
return {
  success: false,
  error: {
    type: 'SpecificErrorType',
    message: 'User-friendly description of what went wrong',
    availableSources?: [...], // Show alternatives when applicable
    hint: 'Specific action user can take to resolve',
    suggestion?: 'Alternative approach to achieve goal'
  }
};
```

### Environment Variables
ALL configuration MUST use .env files:
- Never hardcode secrets, ports, or configuration values
- Always use `process.env.VARIABLE_NAME`
- Update .env.example with any new variables
- Use descriptive names: `FEATURE_ENABLED`, not `FE`
- Include defaults in code for optional variables

### Core Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation (ES modules required!)
- `chrome-remote-interface`: Chrome DevTools Protocol client
- `ws`: WebSocket support for real-time communication
- `jest` + `@types/jest`: TypeScript testing framework
- `dotenv`: Environment variable management
- `typescript`: TypeScript compiler
- `ts-node`: TypeScript execution environment

## Chrome Setup for Development

Chrome must be launched with remote debugging enabled:
```bash
# macOS/Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows  
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
```

Verify Chrome debugging is working by visiting http://localhost:9222 in a browser.

## Critical Implementation Notes

### Tool Initialization (v1.1.1 Learning)
- **CRITICAL**: The `setupToolHandlers()` method MUST be called in the constructor
- Without this call, the tools array will be empty and the MCP server will report 0 tools
- Always verify tool count in tests: expect 18+ tools for v1.2

### Tab ID Validation
Chrome tab IDs are ALWAYS 32-character hexadecimal strings:
```typescript
if (!/^[A-F0-9]{32}$/i.test(tabId)) {
  throw new Error(`Invalid tab ID format: ${tabId}. Tab ID must be a 32-character hexadecimal string.`);
}
```

### Response Size Management (v1.1.1 Pattern)
Use pagination for any list responses:
```typescript
import { paginateResults } from './src/utils/pagination.js';

const paginated = paginateResults(items, {
  pageSize: parameters.pageSize || 100,
  maxResponseSize: parameters.maxResponseSize || 500000
});
```

### Connection Reliability (v1.1.1 Pattern)
Wrap unreliable operations with retry logic:
```typescript
import { createRetryWrapper } from './src/utils/retry-wrapper.js';

const reliableOperation = createRetryWrapper(
  () => client.method(params),
  { maxRetries: 3, initialDelay: 100 }
);
```

### URL-Based Source Identification (v1.1.1 Feature)
The modify_source_code tool accepts both script IDs and URLs:
- Direct script ID: `script123`
- Full URL: `http://localhost:3000/src/app.js`
- Partial URL: `/src/app.js`
- Case-insensitive matching

## MCP Tools Architecture

### v1.1 Tools (18 total):
- `connect_to_chrome`: Establish connection to Chrome DevTools
- `list_tabs`: Get all open Chrome tabs
- `start_monitoring`: Begin real-time monitoring of a specific tab
- `get_console_messages`: Retrieve console output with filtering
- `get_network_activity`: Get network requests/responses with full headers
- `execute_js`: Run JavaScript in tab context
- `security_audit`: Comprehensive security vulnerability analysis
- `check_vulnerabilities`: Targeted vulnerability detection
- `get_performance_metrics`: Performance profiling data
- `list_source_files`: Get available source files (with pagination)
- `modify_source_code`: Real-time code modification (accepts URLs)
- `manage_breakpoints`: Breakpoint management
- `debug_step_control`: Step debugging controls
- `inspect_variables`: Runtime variable inspection
- `analyze_runtime_state`: Comprehensive runtime analysis
- `analyze_errors`: Enhanced error analysis
- `monitor_events`: Real-time event monitoring
- `watch_state_changes`: Variable state monitoring

### v1.2 New Tools (5+ planned):
- `suggest_debugging_strategy`: AI-driven debugging workflows
- `manage_debug_session`: Session persistence
- `analyze_change_impact`: Impact prediction
- `generate_test_case`: Automated test generation
- `analyze_dependencies`: Dependency analysis

## Development Commands

```bash
# Install dependencies
npm install

# Run tests with TDD workflow
npm test

# Run specific test file
npm test -- tests/unit/specific.test.ts

# Run TypeScript in development mode
npm run dev

# Build TypeScript (required - no JavaScript files)
npm run build

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Testing Strategy

### Test Directory Structure
```
tests/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for system interactions
├── e2e/          # End-to-end tests for complete workflows
├── debug/        # Debug and troubleshooting test utilities
└── temp/         # Temporary test files (gitignored)
```

### Testing Requirements
- Unit tests required for EVERY new function (TypeScript only)
- Write tests FIRST (TDD)
- Test both positive and negative cases
- Mock all external dependencies
- Integration tests for Chrome DevTools Protocol communication
- End-to-end tests for complete MCP tool workflows
- Test coverage must exceed 80% (aim for 100% on new code)
- All tests written in TypeScript (.test.ts files)
- Run regression tests before committing

### Test Patterns
```typescript
describe('Feature Name', () => {
  // Group related tests
  describe('Sub-feature', () => {
    test('should handle normal case', () => {
      // Arrange, Act, Assert
    });
    
    test('should handle error case', () => {
      // Test error scenarios
    });
    
    test('should validate inputs', () => {
      // Test input validation
    });
  });
});
```

## Documentation Structure

All documentation is organized under the `docs/` directory:

- **`docs/core/`**: Core project documentation (PRD, task lists, architecture)
- **`docs/setup/`**: Development environment setup and configuration guides
- **`docs/features/`**: Feature specifications and requirements
- **`docs/fixes/`**: Bug fix documentation and analysis
- **`docs/bugs/`**: Bug reports and issue tracking
- **`docs/tech_debt/`**: Technical debt analysis and remediation plans
- **`docs/refactors/`**: Refactoring documentation and rationale
- **`docs/releases/`**: Release notes and version history
- **`docs/reports/`**: Testing reports, performance analysis, security audits
- **`docs/security/`**: Security policies, threat models, vulnerability assessments
- **`docs/rca/`**: Root cause analysis documents for incidents and failures
- **`docs/deployment/`**: Deployment guides, infrastructure, and operational procedures
- **`docs/code_reviews/`**: Code review templates, guidelines, and documented reviews
- **`docs/agent_guides/`**: AI agent instructions and workflow guides
  - **`docs/agent_guides/code_review/`**: Code review guidelines and templates for AI agents
- **`docs/history/`**: Historical records and development session logs
  - **`docs/history/dev_agent_session_summaries/`**: Summaries of AI agent development sessions

## Core Documentation Files

- `docs/core/chrome-lens-prd.md`: Product Requirements Document
- `docs/core/chrome-lens-tasks.md`: Detailed task breakdown and implementation plan
- `docs/core/chrome-lens-v1.1.1-retro.md`: v1.1.1 retrospective and learnings
- `docs/core/chrome-lens-v1.2-intelligence-layer-tasks.md`: Intelligence layer tasks
- `docs/core/chrome-lens-v1.2-llm-debugging-tasks.md`: LLM debugging tasks
- `docs/core/chrome-lens-prompt-doc-v1.2.md`: v1.2 implementation guide

## Security Considerations

- Server provides full access to browser debugging APIs - local development only
- Console messages and network traffic may contain sensitive information
- Environment variables must be used for all configuration
- Never commit secrets or API keys to repository
- Validate all URLs before code modification
- Sanitize expressions before evaluation
- Implement timeouts for all operations
- Create backups before destructive operations

## Common Pitfalls (Learn from v1.1.1)

1. **Module Format**: NEVER remove `"type": "module"` from package.json
2. **Tool Initialization**: ALWAYS call `setupToolHandlers()` in constructor
3. **Tab ID Format**: Validate as 32-character hex string
4. **Response Sizes**: Use pagination for lists
5. **Error Messages**: Always provide actionable hints
6. **Pure Functions**: Prefer over stateful implementations
7. **Test First**: Write failing tests before implementation
8. **Type Safety**: Use TypeScript types, avoid `any`
9. **Async Handling**: Proper error handling in all async operations
10. **Resource Cleanup**: Clean up connections, listeners, intervals

## Performance Guidelines

- Response time targets:
  - Tool execution: <500ms
  - List operations: <100ms with pagination
  - Real-time events: <10ms latency
- Memory limits:
  - Event buffers: <10MB
  - State snapshots: <5MB
  - Session storage: <50MB
- Connection limits:
  - Max concurrent tabs: 10
  - Max breakpoints per tab: 50
  - Max event listeners: 100

## Success Metrics

- Maintain ~98%+ success rate (from v1.1.1)
- 100% test coverage for new code
- Zero breaking changes to existing API
- All tools respond within performance targets
- Clear error messages with recovery paths