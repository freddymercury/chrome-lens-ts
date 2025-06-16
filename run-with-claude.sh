#!/bin/bash

# Chrome Lens with Claude Integration Runner
# Usage: ./run-with-claude.sh [api-key]

if [ -z "$1" ]; then
  echo "Usage: $0 <anthropic-api-key>"
  echo "Example: $0 sk-ant-api03-..."
  exit 1
fi

export ANTHROPIC_API_KEY="$1"
export CLAUDE_ANALYSIS_ENABLED=true
export CLAUDE_MODEL="${2:-claude-3-opus-20240229}"
export CLAUDE_MAX_TOKENS="${3:-1000}"

echo "Starting Chrome Lens with Claude Integration..."
echo "- Model: $CLAUDE_MODEL"
echo "- Max Tokens: $CLAUDE_MAX_TOKENS"

cd "$(dirname "$0")"
node dist/server.js