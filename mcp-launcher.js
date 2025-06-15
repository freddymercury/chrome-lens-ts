#!/usr/bin/env node
/**
 * MCP Server Launcher
 * This launcher ensures the server runs correctly regardless of where it's invoked from
 */

const { spawn } = require('child_process');
const path = require('path');

// Change to the directory containing this script
process.chdir(__dirname);

// Log startup information for debugging
if (process.env.MCP_DEBUG) {
  console.error('MCP Launcher starting...');
  console.error('Node version:', process.version);
  console.error('Working directory:', process.cwd());
  console.error('Script directory:', __dirname);
}

// Spawn the actual MCP server
const serverPath = path.join(__dirname, 'mcp-server.js');
const child = spawn(process.execPath, [serverPath], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, NODE_PATH: path.join(__dirname, 'node_modules') }
});

// Handle errors
child.on('error', (err) => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});

// Forward exit code
child.on('exit', (code) => {
  process.exit(code || 0);
});