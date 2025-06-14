import * as fs from 'fs';
import * as path from 'path';

describe('Task 1.1: TypeScript Project Initialization', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  test('package.json exists and has correct structure', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.name).toBe('chrome-lens-ts');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.main).toBe('dist/server.js');
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.build).toBe('tsc');
    expect(packageJson.scripts.dev).toBe('ts-node server.ts');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
  });

  test('tsconfig.json exists with strict TypeScript configuration', () => {
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
    expect(tsconfig.compilerOptions.module).toBe('commonjs');
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
    expect(tsconfig.compilerOptions.rootDir).toBe('./');
    expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfig.compilerOptions.skipLibCheck).toBe(true);
    expect(tsconfig.compilerOptions.forceConsistentCasingInFileNames).toBe(true);
  });

  test('.gitignore exists with proper patterns', () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignore).toContain('node_modules');
    expect(gitignore).toContain('dist');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('tests/temp');
    expect(gitignore).toContain('*.log');
  });

  test('.env.example exists with proper structure', () => {
    const envExamplePath = path.join(projectRoot, '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    expect(envExample).toContain('NODE_ENV=');
    expect(envExample).toContain('CHROME_DEBUG_PORT=');
    expect(envExample).toContain('CHROME_DEBUG_HOST=');
    expect(envExample).toContain('MCP_SERVER_NAME=');
    expect(envExample).toContain('MCP_SERVER_VERSION=');
    expect(envExample).toContain('LOG_LEVEL=');
  });

  test('.nvmrc exists and specifies Node.js 22.x', () => {
    const nvmrcPath = path.join(projectRoot, '.nvmrc');
    expect(fs.existsSync(nvmrcPath)).toBe(true);
    
    const nodeVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
    expect(nodeVersion).toMatch(/^22\./);
  });
});