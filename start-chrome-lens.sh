#!/usr/bin/env bash
# Chrome Lens MCP Server Starter
# This script ensures the server starts correctly from any location

# Always change to the chrome-lens-ts directory
cd "$(dirname "$0")"

# Log startup for debugging if needed
if [ -n "$MCP_DEBUG" ]; then
  echo "Starting Chrome Lens MCP Server..." >&2
  echo "Working directory: $(pwd)" >&2
  echo "Node version: $(node --version)" >&2
fi

# Start the server
exec node mcp-server.js