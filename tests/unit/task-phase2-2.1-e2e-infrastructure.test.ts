/**
 * Task Phase 2.1: E2E Test Infrastructure
 * Verify E2E test utilities are properly set up
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Task Phase 2.1: E2E Test Infrastructure', () => {
  const e2eDir = path.join(__dirname, '../e2e');
  
  test('E2E directory structure exists', () => {
    expect(fs.existsSync(e2eDir)).toBe(true);
    expect(fs.existsSync(path.join(e2eDir, 'utils'))).toBe(true);
    expect(fs.existsSync(path.join(e2eDir, 'scenarios'))).toBe(true);
    expect(fs.existsSync(path.join(e2eDir, 'README.md'))).toBe(true);
  });

  test('Chrome launcher utility exists', () => {
    const launcherPath = path.join(e2eDir, 'utils/chrome-launcher.ts');
    expect(fs.existsSync(launcherPath)).toBe(true);
    
    const content = fs.readFileSync(launcherPath, 'utf8');
    expect(content).toContain('export async function launchChrome');
    expect(content).toContain('ChromeInstance');
  });

  test('MCP client utility exists', () => {
    const clientPath = path.join(e2eDir, 'utils/mcp-client.ts');
    expect(fs.existsSync(clientPath)).toBe(true);
    
    const content = fs.readFileSync(clientPath, 'utf8');
    expect(content).toContain('export async function connectMCP');
    expect(content).toContain('MCPTestClient');
  });

  test('Test helpers utility exists', () => {
    const helpersPath = path.join(e2eDir, 'utils/test-helpers.ts');
    expect(fs.existsSync(helpersPath)).toBe(true);
    
    const content = fs.readFileSync(helpersPath, 'utf8');
    expect(content).toContain('export async function loadFixture');
    expect(content).toContain('export async function waitForCondition');
    expect(content).toContain('generateTestFixtures');
  });

  test('Test server exists', () => {
    const serverPath = path.join(e2eDir, 'test-server.ts');
    expect(fs.existsSync(serverPath)).toBe(true);
    
    const content = fs.readFileSync(serverPath, 'utf8');
    expect(content).toContain('express');
    expect(content).toContain('generateTestFixtures');
  });

  test('Basic connection E2E test exists', () => {
    const testPath = path.join(e2eDir, 'scenarios/basic-connection.e2e.ts');
    expect(fs.existsSync(testPath)).toBe(true);
    
    const content = fs.readFileSync(testPath, 'utf8');
    expect(content).toContain('Chrome Connection E2E');
    expect(content).toContain('should connect to Chrome DevTools');
  });

  test('E2E tests compile without errors', () => {
    // This will pass if TypeScript can compile the E2E files
    let e2eErrors = 0;
    try {
      execSync('npm run typecheck 2>&1', {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8'
      });
    } catch (error: any) {
      const output = error.stdout || error.message;
      // Count E2E specific errors
      const lines = output.split('\n');
      e2eErrors = lines.filter((line: string) => 
        line.includes('tests/e2e') && line.includes('error TS')
      ).length;
    }
    
    // We expect no E2E compilation errors (but other errors are OK)
    expect(e2eErrors).toBe(0);
  });

  test('Express is installed for test server', () => {
    const packageJson = require(path.join(__dirname, '../../package.json'));
    expect(packageJson.devDependencies.express).toBeDefined();
    expect(packageJson.devDependencies['@types/express']).toBeDefined();
  });
});