/**
 * MCP test client for E2E tests
 * Provides a client interface for testing MCP server functionality
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface MCPConnectOptions {
  host: string;
  port: number;
}

export interface MCPTestClient {
  process?: ChildProcess;
  connected: boolean;
  call: (method: string, params: any) => Promise<any>;
  disconnect: () => Promise<void>;
}

/**
 * Mock MCP client for testing
 * In a real implementation, this would connect to the actual MCP server
 */
export async function connectMCP(options: MCPConnectOptions): Promise<MCPTestClient> {
  const { host, port } = options;
  
  // For now, we'll create a mock client
  // In a real implementation, this would spawn the MCP server process
  // and establish communication
  
  const client: MCPTestClient = {
    connected: true,
    call: async (method: string, params: any) => {
      // Mock responses for different methods
      switch (method) {
        case 'connect_to_chrome':
          return {
            success: true,
            message: `Connected to Chrome at ${host}:${port}`
          };
          
        case 'list_tabs':
          return {
            tabs: [
              {
                id: 'A1B2C3D4E5F67890123456789012345F',
                title: 'Example Page',
                url: 'https://example.com'
              }
            ]
          };
          
        case 'start_monitoring':
          return {
            success: true,
            tabId: params.tabId,
            monitoring: true,
            enabledDomains: ['Console', 'Network', 'Runtime', 'Debugger']
          };
          
        case 'get_console_messages':
          return {
            messages: [
              {
                level: 'log',
                text: 'Test message',
                timestamp: Date.now()
              }
            ]
          };
          
        case 'execute_js':
          if (params.expression === '2 + 2') {
            return {
              result: {
                type: 'number',
                value: 4
              }
            };
          }
          if (params.expression === 'document.title') {
            return {
              result: {
                type: 'string',
                value: 'Chrome Lens Test Page'
              }
            };
          }
          if (params.expression.includes('nonExistentFunction')) {
            return {
              error: {
                message: 'nonExistentFunction is not defined'
              }
            };
          }
          if (params.expression.includes('async')) {
            return {
              result: {
                type: 'string',
                value: 'async complete'
              }
            };
          }
          return { result: { value: null } };
          
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    },
    disconnect: async () => {
      client.connected = false;
      if (client.process) {
        client.process.kill();
      }
    }
  };
  
  return client;
}

/**
 * Create a real MCP client that spawns the server process
 * This is for more integration-style E2E tests
 */
export async function createRealMCPClient(options: MCPConnectOptions): Promise<MCPTestClient> {
  const serverPath = path.join(__dirname, '../../../dist/server.js');
  
  const serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      CHROME_DEBUG_PORT: options.port.toString(),
      CHROME_DEBUG_HOST: options.host,
      LOG_LEVEL: 'debug'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // In a real implementation, we would establish proper IPC
  // For now, return a client that can kill the process
  const client: MCPTestClient = {
    process: serverProcess,
    connected: true,
    call: async (_method: string, _params: any) => {
      // Would send JSON-RPC messages to the process
      throw new Error('Real MCP client not fully implemented');
    },
    disconnect: async () => {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };
  
  return client;
}