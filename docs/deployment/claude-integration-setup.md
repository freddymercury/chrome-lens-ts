# Chrome Lens v1.2 - Claude Integration Setup

## Overview
Chrome Lens v1.2 includes optional Claude API integration for enhanced AI-driven debugging strategies. This guide covers how to configure Claude integration for deployment.

## Environment Variables

The Claude integration requires the following environment variables:

```bash
# Required for Claude integration
ANTHROPIC_API_KEY=sk-ant-api03-...    # Your Anthropic API key

# Optional configuration
CLAUDE_ANALYSIS_ENABLED=true           # Enable/disable Claude integration (default: false)
CLAUDE_MODEL=claude-3-opus-20240229    # Claude model to use (default: claude-3-opus-20240229)
CLAUDE_MAX_TOKENS=1000                 # Max tokens for Claude responses (default: 1000)
```

## Deployment Methods

### 1. MCP Server with Claude Desktop

When using Chrome Lens as an MCP server with Claude Desktop, add environment variables to your MCP configuration:

```json
{
  "chrome-lens": {
    "command": "npm",
    "args": ["start"],
    "cwd": "/path/to/chrome-lens-ts",
    "env": {
      "ANTHROPIC_API_KEY": "sk-ant-api03-...",
      "CLAUDE_ANALYSIS_ENABLED": "true",
      "CLAUDE_MODEL": "claude-3-opus-20240229",
      "CLAUDE_MAX_TOKENS": "1000"
    }
  }
}
```

### 2. Standalone Server

When running the server standalone, set environment variables before starting:

```bash
# Option 1: Export variables
export ANTHROPIC_API_KEY=sk-ant-api03-...
export CLAUDE_ANALYSIS_ENABLED=true
npm start

# Option 2: Inline with command
ANTHROPIC_API_KEY=sk-ant-api03-... CLAUDE_ANALYSIS_ENABLED=true npm start

# Option 3: Use .env file (development only)
# Create .env file with variables, then:
npm start
```

### 3. Docker Deployment

For Docker deployments, pass environment variables via docker run:

```bash
docker run -d \
  -e ANTHROPIC_API_KEY=sk-ant-api03-... \
  -e CLAUDE_ANALYSIS_ENABLED=true \
  -e CLAUDE_MODEL=claude-3-opus-20240229 \
  -p 9222:9222 \
  chrome-lens:v1.2
```

Or use a docker-compose.yml:

```yaml
version: '3.8'
services:
  chrome-lens:
    image: chrome-lens:v1.2
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - CLAUDE_ANALYSIS_ENABLED=true
      - CLAUDE_MODEL=claude-3-opus-20240229
    ports:
      - "9222:9222"
```

### 4. Cloud Deployment (AWS/GCP/Azure)

Store the API key in a secure secrets manager:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name chrome-lens/anthropic-api-key \
  --secret-string "sk-ant-api03-..."

# Google Secret Manager
gcloud secrets create chrome-lens-anthropic-key \
  --data-file=- <<< "sk-ant-api03-..."

# Azure Key Vault
az keyvault secret set \
  --vault-name MyKeyVault \
  --name anthropic-api-key \
  --value "sk-ant-api03-..."
```

Then reference in your deployment configuration.

## Security Best Practices

1. **Never commit API keys to source control**
   - Use `.gitignore` to exclude `.env` files
   - Use environment variables or secrets managers

2. **Limit API key permissions**
   - Create project-specific API keys
   - Set usage limits in Anthropic console

3. **Rotate keys regularly**
   - Update keys every 90 days
   - Use automated rotation where possible

4. **Monitor usage**
   - Track API calls and costs
   - Set up alerts for unusual activity

## Testing Claude Integration

To verify Claude integration is working:

```bash
# Run the test script (requires built project)
npm run build
node dist/test-claude-integration.js

# Or check in application logs
# Look for: "🤖 Enhancing with Claude analysis..."
```

## Fallback Behavior

When Claude integration is disabled or unavailable:
- Chrome Lens uses template-based debugging strategies
- All core functionality remains available
- Performance is unaffected
- No external API calls are made

## Cost Considerations

Claude API usage incurs costs based on:
- Input tokens (prompts)
- Output tokens (responses)
- Model selection (Opus, Sonnet, Haiku)

Estimated usage per debugging session:
- Simple problem: ~500-1000 tokens
- Complex problem: ~1000-2000 tokens
- With context: ~2000-4000 tokens

## Troubleshooting

### API Key Not Working
1. Verify key format: `sk-ant-api03-...`
2. Check account has credits
3. Ensure key has necessary permissions

### Claude Not Being Used
1. Verify `CLAUDE_ANALYSIS_ENABLED=true`
2. Check logs for "Claude analysis error"
3. Ensure API key is properly set

### Performance Issues
1. Adjust `CLAUDE_MAX_TOKENS` lower
2. Consider using faster model (Haiku)
3. Implement caching for repeated problems

## Monitoring

Add logging to track Claude usage:

```javascript
// In your deployment, monitor:
- Claude API calls per hour
- Average response time
- Error rates
- Token usage
```

## Future Enhancements

- Caching layer for common problems
- Batch processing for multiple issues
- Custom fine-tuned models
- Integration with other AI providers