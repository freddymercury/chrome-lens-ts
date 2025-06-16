# Claude Desktop Configuration for Chrome Lens v1.2

## Configuration File Location

The Claude Desktop MCP configuration is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Basic Configuration (Without Claude Integration)

```json
{
  "mcpServers": {
    "chrome-lens": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/dennis/dev/rsrc/chrome-lens-ts"
    }
  }
}
```

## Configuration with Claude Integration

```json
{
  "mcpServers": {
    "chrome-lens": {
      "command": "node",
      "args": ["dist/server.js"],
      "cwd": "/Users/dennis/dev/rsrc/chrome-lens-ts",
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-api03-YOUR-KEY-HERE",
        "CLAUDE_ANALYSIS_ENABLED": "true",
        "CLAUDE_MODEL": "claude-3-opus-20240229",
        "CLAUDE_MAX_TOKENS": "1000"
      }
    }
  }
}
```

## Important Notes

1. **Replace the API Key**: Make sure to replace `sk-ant-api03-YOUR-KEY-HERE` with your actual Anthropic API key

2. **Build Required**: Ensure Chrome Lens is built before using:
   ```bash
   cd /Users/dennis/dev/rsrc/chrome-lens-ts
   npm install
   npm run build
   ```

3. **Chrome Must Be Running**: Launch Chrome with debugging enabled:
   ```bash
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

## Verifying Configuration

After updating the configuration:

1. Restart Claude Desktop
2. In a conversation, you should see Chrome Lens tools available
3. When using `suggest_debugging_strategy`, it will use Claude for enhanced analysis

## Environment Variables Explained

- **`ANTHROPIC_API_KEY`**: Your Anthropic API key (required for Claude features)
- **`CLAUDE_ANALYSIS_ENABLED`**: Set to "true" to enable Claude integration
- **`CLAUDE_MODEL`**: Which Claude model to use (default: claude-3-opus-20240229)
  - Options: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
- **`CLAUDE_MAX_TOKENS`**: Maximum tokens for Claude responses (default: 1000)

## Troubleshooting

If Claude integration isn't working:

1. Check Claude Desktop logs for errors
2. Verify API key has credits (check at https://console.anthropic.com)
3. Test manually:
   ```bash
   cd /Users/dennis/dev/rsrc/chrome-lens-ts
   ANTHROPIC_API_KEY=your-key CLAUDE_ANALYSIS_ENABLED=true node dist/test-claude-integration.js
   ```

## Security Note

The API key in this configuration file is stored in plain text. Ensure:
- Your computer is secure
- The configuration file has appropriate permissions
- Don't share or commit this configuration file