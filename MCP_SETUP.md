# Chrome Lens MCP Server Setup

## Quick Start

The MCP server can be started in several ways:

1. **Standard method** (recommended):
   ```bash
   npm start
   ```

2. **Direct execution**:
   ```bash
   node mcp-server.js
   ```

3. **With launcher** (handles directory issues):
   ```bash
   node mcp-launcher.js
   ```

4. **Diagnostic mode** (for troubleshooting):
   ```bash
   npm run start:diagnostic
   ```

## Claude Code Configuration

To use this MCP server with Claude Code, you need to configure it in your Claude Code settings.

### Option 1: NPM Start (Recommended)
```json
{
  "command": "npm",
  "args": ["start"],
  "cwd": "/Users/dennis/dev/rsrc/chrome-lens-ts"
}
```

### Option 1b: NPM Start with Claude Integration
```json
{
  "command": "npm",
  "args": ["start"],
  "cwd": "/Users/dennis/dev/rsrc/chrome-lens-ts",
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-api03-...",
    "CLAUDE_ANALYSIS_ENABLED": "true",
    "CLAUDE_MODEL": "claude-3-opus-20240229"
  }
}
```

### Option 2: Direct Node
```json
{
  "command": "node",
  "args": ["/Users/dennis/dev/rsrc/chrome-lens-ts/mcp-server.js"]
}
```

### Option 3: Using Launcher
```json
{
  "command": "/Users/dennis/dev/rsrc/chrome-lens-ts/mcp-launcher.js"
}
```

## Troubleshooting

If the server fails to start:

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **Run diagnostic**:
   ```bash
   npm run start:diagnostic
   ```

3. **Check logs**:
   - Look in `/Users/dennis/Library/Caches/claude-cli-nodejs/`
   - Check for chrome-lens-ts related logs

4. **Test server manually**:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node mcp-server.js
   ```

## Common Issues

1. **"Connection closed" errors**: Usually means the server crashed on startup
2. **Module not found errors**: Run `npm install` in the project directory
3. **ES Module errors**: Ensure Node.js 18+ and `"type": "module"` in package.json