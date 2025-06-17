/**
 * Task Phase 1.2: Fix Failing Unit Tests
 * Regression test to ensure task-1.1 and task-1.2 tests remain fixed
 */

import { execSync } from 'child_process';
import * as path from 'path';

describe('Task Phase 1.2: Unit Test Fixes', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  test('task-1.1.test.ts should pass all tests', () => {
    const result = execSync(
      'npm test -- tests/unit/task-1.1.test.ts --no-coverage --silent 2>&1 || true',
      { cwd: projectRoot, encoding: 'utf8' }
    );
    
    expect(result).toContain('PASS tests/unit/task-1.1.test.ts');
    expect(result).not.toContain('FAIL tests/unit/task-1.1.test.ts');
    expect(result).toContain('5 passed'); // All 5 tests should pass
  });

  test('task-1.2.test.ts should pass all tests', () => {
    const result = execSync(
      'npm test -- tests/unit/task-1.2.test.ts --no-coverage --silent 2>&1 || true',
      { cwd: projectRoot, encoding: 'utf8' }
    );
    
    expect(result).toContain('PASS tests/unit/task-1.2.test.ts');
    expect(result).not.toContain('FAIL tests/unit/task-1.2.test.ts');
    expect(result).toContain('3 passed'); // All 3 tests should pass
  });

  test('package.json build script uses tsconfig.build.json', () => {
    const packageJson = require(path.join(projectRoot, 'package.json'));
    expect(packageJson.scripts.build).toBe('tsc -p tsconfig.build.json');
  });

  test('tsconfig.json uses ES2022 module system', () => {
    const tsconfig = require(path.join(projectRoot, 'tsconfig.json'));
    expect(tsconfig.compilerOptions.module).toBe('ES2022');
  });

  test('jest configuration exists as separate file', () => {
    const fs = require('fs');
    const jestConfigPath = path.join(projectRoot, 'jest.config.js');
    expect(fs.existsSync(jestConfigPath)).toBe(true);
  });
});