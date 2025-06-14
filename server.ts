import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable configuration
const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-lens-ts';
const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Chrome DevTools MCP Server
 * Provides direct access to Chrome's DevTools Protocol for granular real-time debugging
 */
export class ChromeDevToolsMCPServer {
  private server: any; // Will be typed properly when MCP SDK is imported

  constructor() {
    // For now, we'll initialize this as a placeholder
    // The actual Server will be instantiated in the setupServer method
    this.server = {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      capabilities: {
        tools: {},
      },
    };
  }

  /**
   * Get the server instance
   */
  public getServer(): any {
    return this.server;
  }

  /**
   * Get server configuration for testing
   */
  public getServerConfig(): { name: string; version: string } {
    return {
      name: this.server.name,
      version: this.server.version,
    };
  }

  /**
   * Setup error handling for the server
   * Handles uncaught exceptions, unhandled rejections, and SIGINT for graceful shutdown
   */
  public setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught exception:', error);
      if (LOG_LEVEL === 'debug') {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Unhandled promise rejection:', reason);
      if (LOG_LEVEL === 'debug') {
        console.error('Promise:', promise);
      }
      process.exit(1);
    });

    // Handle SIGINT for graceful shutdown
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      
      // Perform any cleanup here if needed
      if (this.server) {
        console.log('Closing server connections...');
      }
      
      console.log('Server shutdown complete');
      process.exit(0);
    });

    if (LOG_LEVEL === 'debug') {
      console.log('Error handling setup complete');
    }
  }
}

// Export for testing and external use
export default ChromeDevToolsMCPServer;