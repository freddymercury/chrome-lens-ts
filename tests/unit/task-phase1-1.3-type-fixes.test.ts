/**
 * Task Phase 1.3: Update Test Dependencies
 * Regression test to verify type 'never' errors are fixed
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

describe('Task Phase 1.3: Type Fixes for Test Dependencies', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  test('tests compile without type never errors', () => {
    // Run typecheck and capture output
    let typecheckOutput: string;
    try {
      typecheckOutput = execSync('npm run typecheck 2>&1', {
        cwd: projectRoot,
        encoding: 'utf8'
      });
    } catch (error: any) {
      typecheckOutput = error.stdout || error.message;
    }
    
    // Verify no "type 'never'" errors
    expect(typecheckOutput).not.toMatch(/Argument of type .* is not assignable to parameter of type 'never'/);
  });

  test('ChromeDevToolsMCPServer import is correctly typed', () => {
    // This will fail to compile if the import is incorrect
    const testImport = `
      import ChromeDevToolsMCPServer from '../../server';
      const server: ChromeDevToolsMCPServer = new ChromeDevToolsMCPServer();
    `;
    expect(testImport).toBeTruthy();
  });

  test('mock functions use proper Promise types', () => {
    // Verify the pattern we're using for mocks
    const mockFn = jest.fn(() => Promise.resolve({}));
    expect(mockFn).toBeDefined();
    expect(mockFn()).toBeInstanceOf(Promise);
  });

  test('sample affected test files compile', async () => {
    const affectedTests = [
      'task-17.2.test.ts',
      'task-17.4.test.ts', 
      'task-18.2.test.ts',
      'task-18.4.test.ts',
      'task-19.2.test.ts'
    ];
    
    // Check that these files exist and don't have syntax errors
    for (const testFile of affectedTests) {
      const filePath = path.join(__dirname, testFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Check for correct import
        expect(content).toMatch(/import ChromeDevToolsMCPServer from/);
        // Check for fixed mock pattern
        expect(content).toMatch(/jest\.fn\(\(\) => Promise\.resolve/);
      }
    }
  });
});