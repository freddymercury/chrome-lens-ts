# Project Bootstrap Prompt

Use this prompt to initialize a Chrome DevTools MCP Server project with proper TypeScript structure:

## Bootstrap Instructions

Create a Chrome DevTools MCP (Model Context Protocol) Server project with these exact specifications:

### Core Requirements
- **TypeScript only** - NO JavaScript files (.js) allowed in source code
- **Node.js 22.x** (LTS as of June 2025) with .nvmrc file
- **Test-Driven Development** (TDD) - RED-GREEN-REFACTOR cycle mandatory
- **Environment variables** for all configuration via .env files

### Project Structure
```
chrome-lens-ts/
├── .nvmrc                    # Node.js 22
├── package.json              # TypeScript dependencies
├── tsconfig.json            # Strict TypeScript config
├── .env.example             # Environment template
├── .gitignore               # Standard Node.js + TypeScript
├── CLAUDE.md                # AI agent instructions
├── tests/
│   ├── unit/                # Unit tests (.test.ts)
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   ├── debug/               # Debug utilities
│   └── temp/                # Temporary test files (gitignored)
└── docs/
    ├── core/                # PRD, task lists, architecture
    ├── setup/               # Environment setup guides
    ├── features/            # Feature specifications
    ├── fixes/               # Bug fix documentation
    ├── bugs/                # Bug reports
    ├── tech_debt/           # Technical debt analysis
    ├── refactors/           # Refactoring documentation
    ├── releases/            # Release notes
    ├── reports/             # Testing/performance/security reports
    ├── security/            # Security policies, threat models
    ├── rca/                 # Root cause analysis
    ├── deployment/          # Deployment guides
    ├── code_reviews/        # Code review templates
    ├── agent_guides/        # AI agent instructions
    │   └── code_review/     # Code review guidelines for AI
    └── history/             # Development session logs
        └── dev_agent_session_summaries/
```

### Core Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "chrome-remote-interface": "latest",
    "ws": "latest",
    "dotenv": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "ts-node": "latest",
    "jest": "latest",
    "@types/jest": "latest",
    "ts-jest": "latest",
    "@types/node": "latest"
  }
}
```

### Key Files to Create

1. **.nvmrc**: `22`

2. **tsconfig.json**: Strict TypeScript configuration

3. **.env.example**:
```
NODE_ENV=development
MCP_SERVER_NAME=chrome-devtools-mcp
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=debug
CHROME_DEBUG_PORT=9222
```

4. **CLAUDE.md**: AI agent instructions specifying TypeScript-only development, TDD requirements, and documentation structure

5. **Chrome Setup**: Chrome must run with `--remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug`

### MCP Tools to Implement
- `connect_to_chrome`: Establish Chrome DevTools connection
- `list_tabs`: Get all open Chrome tabs
- `start_monitoring`: Begin real-time tab monitoring
- `get_console_messages`: Retrieve console output with filtering
- `get_network_activity`: Get network requests/responses
- `execute_js`: Run JavaScript in tab context
- `security_audit`: Comprehensive vulnerability analysis
- `check_vulnerabilities`: Targeted vulnerability detection

### Development Workflow
1. **TDD Cycle**: Write failing TypeScript tests first, then minimal code to pass
2. **Environment**: All config via process.env variables
3. **Testing**: 80%+ coverage, all tests in TypeScript
4. **Commands**: `npm test`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`

### Chrome Integration
- Real-time WebSocket monitoring of Chrome tabs
- DevTools Protocol communication via chrome-remote-interface
- Security auditing for XSS, CSRF, headers analysis
- In-memory storage for console messages, network logs, runtime errors

This creates a production-ready TypeScript MCP server for Chrome DevTools debugging with comprehensive testing and documentation structure.