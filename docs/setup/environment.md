# Development Environment Setup

This guide covers setting up the development environment for the Chrome DevTools MCP Server.

## Prerequisites

### Node.js Version Management
This project requires Node.js 22.x (LTS as of June 2025).

1. **Install nvm (Node Version Manager)**:
   ```bash
   # macOS/Linux
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Restart terminal or source profile
   source ~/.bashrc  # or ~/.zshrc
   ```

2. **Install and use Node.js 22.x**:
   ```bash
   # Install Node.js 22.x
   nvm install 22
   
   # Use Node.js 22.x for this project
   nvm use 22
   
   # Verify version
   node --version  # Should show v22.x.x
   npm --version   # Should show npm 10.x.x
   ```

3. **Create .nvmrc file** (if not exists):
   ```bash
   echo "22" > .nvmrc
   ```

### Chrome Remote Debugging Setup
Chrome must be launched with remote debugging enabled for development:

```bash
# macOS/Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=c:\temp\chrome-debug
```

**Verify Setup**: Visit http://localhost:9222 in a browser to see Chrome DevTools Protocol interface.

## Project Setup

### 1. Install Dependencies
```bash
# Ensure correct Node.js version
nvm use

# Install all dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Key variables:
# - NODE_ENV=development
# - MCP_SERVER_NAME=chrome-devtools-mcp
# - MCP_SERVER_VERSION=1.0.0
# - LOG_LEVEL=debug
# - CHROME_DEBUG_PORT=9222
```

### 3. TypeScript Configuration
Verify TypeScript is properly configured:
```bash
# Check TypeScript version
npx tsc --version

# Compile TypeScript (should have no errors)
npm run build

# Run type checking
npm run typecheck
```

## Development Workflow

### Testing Setup
The project uses a structured testing approach:

```
tests/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for system interactions  
├── e2e/          # End-to-end tests for complete workflows
├── debug/        # Debug and troubleshooting utilities
└── temp/         # Temporary test files (gitignored)
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Type check without compilation
npm run typecheck
```

## Troubleshooting

### Common Issues

1. **Node.js Version Mismatch**:
   ```bash
   nvm use  # Ensure correct Node.js version
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Chrome Connection Issues**:
   - Ensure Chrome is running with `--remote-debugging-port=9222`
   - Check http://localhost:9222 is accessible
   - Verify no other processes are using port 9222

3. **TypeScript Compilation Errors**:
   ```bash
   # Clean build
   npm run clean
   npm run build
   
   # Check TypeScript configuration
   npx tsc --showConfig
   ```

4. **Permission Issues (macOS/Linux)**:
   ```bash
   # Fix npm permissions
   sudo chown -R $(whoami) ~/.npm
   ```

## IDE Configuration

### VS Code (Recommended)
Install these extensions:
- TypeScript and JavaScript Language Features (built-in)
- ESLint
- Prettier - Code formatter
- Jest Test Explorer

### Settings
Add to `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": true
  }
}
```