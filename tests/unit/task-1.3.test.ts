import * as fs from 'fs';
import * as path from 'path';

describe('Task 1.3: Basic Server File Structure', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const serverPath = path.join(projectRoot, 'server.ts');

  test('server.ts exists', () => {
    expect(fs.existsSync(serverPath)).toBe(true);
  });

  test('server.ts has valid TypeScript syntax', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check for TypeScript import statements (basic syntax check)
    expect(serverContent).toContain('import');
    expect(serverContent).toMatch(/import.*from.*['"].*['"];/);
    
    // Should not contain any JavaScript require statements
    expect(serverContent).not.toContain('require(');
  });

  test('server.ts imports Chrome DevTools components', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Initially we import Chrome Remote Interface instead of MCP SDK for the basic implementation
    expect(serverContent).toContain('chrome-remote-interface');
    expect(serverContent).toMatch(/import.*CDP.*from.*['"]chrome-remote-interface['"];/);
  });

  test('server.ts imports Chrome Remote Interface', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    expect(serverContent).toContain('chrome-remote-interface');
    expect(serverContent).toMatch(/import.*CDP.*from.*['"]chrome-remote-interface['"];/);
  });

  test('server.ts imports required dependencies', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    expect(serverContent).toContain('dotenv');
    expect(serverContent).toMatch(/import.*dotenv.*from.*['"]dotenv['"];/);
  });

  test('server.ts has basic TypeScript exports', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Should have some kind of export (class, function, or default)
    expect(serverContent).toMatch(/export\s+(class|function|default|const|let|var)/);
  });

  test('server.ts uses environment variables', () => {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    expect(serverContent).toContain('process.env.MCP_SERVER_NAME');
    expect(serverContent).toContain('dotenv.config()');
  });
});