#!/usr/bin/env node
/**
 * MCP Diagnostic Script (ES Module version)
 * This script helps diagnose issues when the MCP server fails to start
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('=== MCP Server Diagnostic ===');
console.error('Time:', new Date().toISOString());
console.error('Node version:', process.version);
console.error('Platform:', process.platform);
console.error('Current directory:', process.cwd());
console.error('Script location:', __filename);
console.error('Script directory:', __dirname);
console.error('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  MCP_SERVER_NAME: process.env.MCP_SERVER_NAME,
  MCP_SERVER_VERSION: process.env.MCP_SERVER_VERSION,
  LOG_LEVEL: process.env.LOG_LEVEL,
  PATH: process.env.PATH?.split(':').slice(0, 3).join(':') + '...',
  NODE_PATH: process.env.NODE_PATH
});

// Check if key files exist
const filesToCheck = [
  'mcp-server.js',
  'dist/server.js',
  'package.json',
  'node_modules/@modelcontextprotocol/sdk/package.json'
];

console.error('\nFile existence check:');
filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  console.error(`- ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// Try to load the package.json
try {
  const pkgPath = path.join(__dirname, 'package.json');
  const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);
  console.error('\nPackage info:');
  console.error('- name:', pkg.name);
  console.error('- version:', pkg.version);
  console.error('- type:', pkg.type || 'commonjs');
} catch (e) {
  console.error('\nFailed to load package.json:', e.message);
}

// Test import without running
console.error('\n=== Testing MCP Server Import ===');
console.error('To start the server, run: node mcp-server.js');
console.error('\nDiagnostic complete.');