// Test runner for Task 20.2
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a stub server.ts that doesn't have import.meta
const testServerContent = `
import * as dotenv from 'dotenv';
import CDP from 'chrome-remote-interface';

// Load environment variables
dotenv.config();

// Environment variable configuration
const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-lens-ts';
const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || 'stdio';
const MAX_TOOLS = parseInt(process.env.MAX_TOOLS || '20', 10);
const TOOL_TIMEOUT_MS = parseInt(process.env.TOOL_TIMEOUT_MS || '30000', 10);
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE || '10485760', 10); // 10MB default
const CHROME_DEBUG_PORT = parseInt(process.env.CHROME_DEBUG_PORT || '9222', 10);
const CHROME_DEBUG_HOST = process.env.CHROME_DEBUG_HOST || 'localhost';

// Re-export the server class from the actual implementation
export { ChromeDevToolsMCPServer, EventMonitor } from './server-impl.js';
export default ChromeDevToolsMCPServer;
`;

// Copy the actual server.ts to server-impl.ts temporarily
import fs from 'fs';
const serverContent = fs.readFileSync(join(__dirname, 'server.ts'), 'utf8');
// Remove the import.meta check at the end
const serverImplContent = serverContent.replace(/if \(import\.meta\.url[\s\S]*?startServer\(\);[\s\S]*?\}/, '');
fs.writeFileSync(join(__dirname, 'server-impl.ts'), serverImplContent);
fs.writeFileSync(join(__dirname, 'server.ts.bak'), serverContent);
fs.writeFileSync(join(__dirname, 'server.ts'), testServerContent);

console.log('Running Task 20.2 tests...');
try {
  execSync('npm test -- tests/unit/task-20.2.test.ts', { stdio: 'inherit' });
} catch (error) {
  console.error('Tests failed');
  process.exit(1);
} finally {
  // Restore original server.ts
  fs.unlinkSync(join(__dirname, 'server-impl.ts'));
  fs.renameSync(join(__dirname, 'server.ts.bak'), join(__dirname, 'server.ts'));
}