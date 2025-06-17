/**
 * Test helper utilities for E2E tests
 */

import { ChromeInstance } from './chrome-launcher';
import * as path from 'path';
import * as fs from 'fs';

export interface LoadFixtureResult {
  tabId: string;
  url: string;
}

/**
 * Load a test fixture HTML file in Chrome
 */
export async function loadFixture(
  chrome: ChromeInstance,
  fixtureName: string
): Promise<LoadFixtureResult> {
  const fixtureUrl = `http://localhost:3001/${fixtureName}`;
  const tab = await chrome.newTab(fixtureUrl);
  
  return {
    tabId: tab.id,
    url: tab.url
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a test fixture HTML file
 */
export function createFixture(name: string, content: string): void {
  const fixturesDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(fixturesDir, name), content);
}

/**
 * Clean up test fixtures
 */
export function cleanupFixtures(): void {
  const fixturesDir = path.join(__dirname, '../fixtures');
  if (fs.existsSync(fixturesDir)) {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  }
}

/**
 * Start a simple HTTP server for test fixtures
 */
export async function startFixtureServer(port: number = 3001): Promise<() => void> {
  const express = await import('express');
  const app = express.default();
  const fixturesDir = path.join(__dirname, '../fixtures');
  
  app.use(express.static(fixturesDir));
  
  const server = app.listen(port);
  
  return () => {
    server.close();
  };
}

/**
 * Generate test HTML fixtures
 */
export function generateTestFixtures(): void {
  // Basic test page
  createFixture('index.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Chrome Lens Test Page</title>
</head>
<body>
  <h1>Chrome Lens E2E Test</h1>
  <button id="test-button">Click Me</button>
  <script>
    console.log('Test page loaded');
    document.getElementById('test-button').addEventListener('click', () => {
      console.log('Button clicked');
    });
  </script>
</body>
</html>
  `);
  
  // Page with errors
  createFixture('errors.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Error Test Page</title>
</head>
<body>
  <h1>Error Test</h1>
  <script>
    console.error('Test error message');
    nonExistentFunction();
  </script>
</body>
</html>
  `);
  
  // Page with network requests
  createFixture('network.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Network Test Page</title>
</head>
<body>
  <h1>Network Test</h1>
  <script>
    fetch('/api/test')
      .then(res => console.log('Fetch completed'))
      .catch(err => console.error('Fetch failed:', err));
  </script>
</body>
</html>
  `);
  
  // Performance test page
  createFixture('performance.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Test Page</title>
</head>
<body>
  <h1>Performance Test</h1>
  <script>
    // Simulate slow operation
    const start = Date.now();
    let sum = 0;
    for (let i = 0; i < 100000000; i++) {
      sum += i;
    }
    console.log('Slow operation took', Date.now() - start, 'ms');
  </script>
</body>
</html>
  `);
  
  // Security test page
  createFixture('security.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Security Test Page</title>
</head>
<body>
  <h1>Security Test</h1>
  <script>
    // Simulate XSS vulnerability
    const userInput = '<img src=x onerror=alert(1)>';
    document.body.innerHTML += userInput;
  </script>
</body>
</html>
  `);
}