#!/bin/bash
# MCP Server Runner Script
# This ensures the server runs from the correct directory

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory
cd "$SCRIPT_DIR"

# Run the MCP server
exec node mcp-server.js