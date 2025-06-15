#!/usr/bin/env node
/**
 * MCP Server Entry Point
 * This file handles starting the MCP server with the Chrome DevTools integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import ChromeDevToolsMCPServer from './dist/server.js';

const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-lens-ts';
const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

async function main() {
  // Create Chrome DevTools server instance
  const chromeServer = new ChromeDevToolsMCPServer();
  
  // Get all tools
  const tools = await chromeServer.listTools();
  
  // Create MCP server instance
  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  
  // Set up request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools,
    };
  });
  
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await chromeServer.callTool(name, args || {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });
  
  // Create transport
  const transport = new StdioServerTransport();
  
  // Connect the server to transport
  await server.connect(transport);
  
  if (LOG_LEVEL === 'debug') {
    console.error(`Chrome Lens MCP Server ${MCP_SERVER_VERSION} started`);
  }
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});