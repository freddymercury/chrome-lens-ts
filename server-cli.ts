#!/usr/bin/env node
import 'dotenv/config';
import ChromeDevToolsMCPServer from './server.js';

// Start the MCP server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function startServer() {
    try {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

      const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
      const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-devtools-mcp';
      const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

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

      // Create ChromeDevToolsMCPServer instance and attach handlers
      const chromeServer = new ChromeDevToolsMCPServer();

      // Attach tool handlers
      server.setRequestHandler('tools/list', async () => ({
        tools: chromeServer.getTools(),
      }));

      server.setRequestHandler('tools/call', async (request) => {
        const { name, arguments: args } = request.params;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await chromeServer.callTool(name, args), null, 2),
            },
          ],
        };
      });

      // Create transport and connect
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      if (LOG_LEVEL === 'debug') {
        console.error(`Chrome DevTools MCP Server ${MCP_SERVER_VERSION} started`);
      }
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }

  startServer();
}