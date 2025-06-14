# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome DevTools MCP (Model Context Protocol) Server written in TypeScript (NO JavaScript - TypeScript only) that provides direct access to Chrome's DevTools Protocol. It offers granular real-time browser debugging capabilities for production debugging, development-time monitoring, and security auditing.

## Key Architecture

- **MCP Server**: Uses @modelcontextprotocol/sdk for protocol implementation
- **Chrome Integration**: Uses chrome-remote-interface for DevTools Protocol communication
- **Real-time Monitoring**: WebSocket-based event streaming from Chrome tabs
- **Security Auditing**: Comprehensive vulnerability detection including XSS, CSRF, security headers
- **Data Storage**: In-memory Maps for console messages, network logs, and runtime errors

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

### Test-Driven Development (TDD)
ALL development MUST follow RED-GREEN-REFACTOR cycle:
- **RED**: Write failing tests first that define expected behavior (in TypeScript)
- **GREEN**: Write minimal TypeScript code to make tests pass  
- **REFACTOR**: Improve code quality while keeping tests green

### Environment Variables
ALL configuration MUST use .env files:
- Never hardcode secrets, ports, or configuration values
- Always use `process.env.VARIABLE_NAME`
- Update .env.example with any new variables

### Core Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
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

## MCP Tools Architecture

The server implements these core tools:
- `connect_to_chrome`: Establish connection to Chrome DevTools
- `list_tabs`: Get all open Chrome tabs
- `start_monitoring`: Begin real-time monitoring of a specific tab
- `get_console_messages`: Retrieve console output with filtering
- `get_network_activity`: Get network requests/responses with full headers
- `execute_js`: Run JavaScript in tab context
- `security_audit`: Comprehensive security vulnerability analysis
- `check_vulnerabilities`: Targeted vulnerability detection

## Development Commands

```bash
# Install dependencies
npm install

# Run tests with TDD workflow
npm test

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
- Unit tests required for each task/component (TypeScript only)
- Integration tests for Chrome DevTools Protocol communication
- End-to-end tests for complete MCP tool workflows
- Mock Chrome connections for CI/CD environments
- Test coverage must exceed 80%
- All tests written in TypeScript (.test.ts files)

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

## Security Considerations

- Server provides full access to browser debugging APIs - local development only
- Console messages and network traffic may contain sensitive information
- Environment variables must be used for all configuration
- Never commit secrets or API keys to repository