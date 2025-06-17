/**
 * Chrome launcher utility for E2E tests
 * Handles starting Chrome with debugging enabled
 */

import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

export interface ChromeLaunchOptions {
  headless?: boolean;
  port?: number;
  userDataDir?: string;
  args?: string[];
}

export interface ChromeInstance {
  process: ChildProcess;
  debugPort: number;
  close: () => Promise<void>;
  newTab: (url: string) => Promise<{ id: string; url: string }>;
  closeTab: (tabId: string) => Promise<void>;
  evaluate: (tabId: string, expression: string) => Promise<any>;
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Find an available port
 */
async function findAvailablePort(startPort: number = 9222): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

/**
 * Launch Chrome with debugging enabled
 */
export async function launchChrome(options: ChromeLaunchOptions = {}): Promise<ChromeInstance> {
  const {
    headless = true,
    port = await findAvailablePort(),
    userDataDir = `/tmp/chrome-test-profile-${Date.now()}`,
    args = []
  } = options;

  const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' || 'google-chrome';
  
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    ...args
  ];
  
  if (headless) {
    chromeArgs.push('--headless=new');
  }

  const chromeProcess = spawn(chromePath, chromeArgs, {
    stdio: 'pipe',
    detached: false
  });

  // Wait for Chrome to start
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Chrome failed to start within timeout'));
    }, 10000);

    const checkPort = setInterval(async () => {
      const available = await isPortAvailable(port);
      if (!available) {
        clearInterval(checkPort);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);

    chromeProcess.on('error', (err) => {
      clearInterval(checkPort);
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Simple implementations for tab management
  const instance: ChromeInstance = {
    process: chromeProcess,
    debugPort: port,
    close: async () => {
      chromeProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    newTab: async (url: string) => {
      // In a real implementation, this would use Chrome DevTools Protocol
      return { id: `tab-${Date.now()}`, url };
    },
    closeTab: async (tabId: string) => {
      // In a real implementation, this would use Chrome DevTools Protocol
      console.log(`Closing tab ${tabId}`);
    },
    evaluate: async (tabId: string, expression: string) => {
      // In a real implementation, this would use Chrome DevTools Protocol
      console.log(`Evaluating in tab ${tabId}: ${expression}`);
      return null;
    }
  };

  return instance;
}