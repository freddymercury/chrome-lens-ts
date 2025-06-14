import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import * as CDP from 'chrome-remote-interface';
import * as WebSocket from 'ws';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const CHROME_DEBUG_PORT = parseInt(process.env.CHROME_DEBUG_PORT || '9222', 10);
const CHROME_DEBUG_HOST = process.env.CHROME_DEBUG_HOST || 'localhost';
const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-lens-ts';
const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

/**
 * Chrome DevTools MCP Server
 * Provides direct access to Chrome's DevTools Protocol for granular real-time debugging
 */
export class ChromeDevToolsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    }, {
      capabilities: {
        tools: {},
      },
    });
  }

  /**
   * Get the server instance
   */
  public getServer(): Server {
    return this.server;
  }
}

// Export for testing and external use
export default ChromeDevToolsMCPServer;