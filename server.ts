import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable configuration
const MCP_SERVER_NAME = process.env.MCP_SERVER_NAME || 'chrome-lens-ts';
const MCP_SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MCP_TRANSPORT = process.env.MCP_TRANSPORT || 'stdio';
const MAX_TOOLS = parseInt(process.env.MAX_TOOLS || '20', 10);
const TOOL_TIMEOUT_MS = parseInt(process.env.TOOL_TIMEOUT_MS || '30000', 10);
const MAX_STORAGE_SIZE = parseInt(process.env.MAX_STORAGE_SIZE || '10485760', 10); // 10MB default

/**
 * Chrome DevTools MCP Server
 * Provides direct access to Chrome's DevTools Protocol for granular real-time debugging
 */
export class ChromeDevToolsMCPServer {
  private server: any; // Will be typed properly when MCP SDK is imported
  private tools: any[] = []; // Tool registry
  
  // Storage maps for Chrome DevTools data
  private clients: Map<string, any> = new Map();
  private consoleMessages: Map<string, any[]> = new Map();
  private networkLogs: Map<string, any[]> = new Map();
  private errors: Map<string, any[]> = new Map();

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
    
    if (LOG_LEVEL === 'debug') {
      console.log(`Storage initialized with max size: ${MAX_STORAGE_SIZE} bytes`);
    }
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

  /**
   * Connect the server with the configured transport
   */
  public async connect(): Promise<void> {
    if (LOG_LEVEL === 'debug') {
      console.log(`Connecting server with ${MCP_TRANSPORT} transport...`);
    }
    
    // For now, this is a placeholder that will be implemented when we add actual MCP SDK
    // This allows the server to be "connected" for testing purposes
    return Promise.resolve();
  }

  /**
   * Run the MCP server
   * Sets up error handling and starts the server with stdio transport
   */
  public async run(): Promise<void> {
    console.log('Starting Chrome DevTools MCP Server...');
    console.log(`Server: ${MCP_SERVER_NAME} v${MCP_SERVER_VERSION}`);
    console.log(`Transport: ${MCP_TRANSPORT}`);
    
    // Setup error handling first
    this.setupErrorHandling();
    
    if (LOG_LEVEL === 'debug') {
      console.log('Error handling configured');
    }
    
    // Connect the server
    await this.connect();
    
    console.log('Chrome DevTools MCP Server is running...');
    if (LOG_LEVEL === 'debug') {
      console.log('Server ready to accept MCP requests');
    }
  }

  /**
   * Setup tool handlers for MCP requests
   * Initializes empty tool list that can be populated later
   */
  public setupToolHandlers(): void {
    if (LOG_LEVEL === 'debug') {
      console.log(`Setting up tool handlers (max tools: ${MAX_TOOLS})...`);
    }
    
    // Initialize empty tools array
    this.tools = [];
    
    if (LOG_LEVEL === 'debug') {
      console.log('Tool handlers setup complete');
    }
  }

  /**
   * List all available tools
   * Returns empty array initially as no tools are registered yet
   */
  public async listTools(): Promise<any[]> {
    if (LOG_LEVEL === 'debug') {
      console.log(`Listing ${this.tools.length} available tools`);
    }
    
    return this.tools;
  }

  /**
   * Call a tool with the given name and parameters
   * Currently throws MethodNotFound for any tool as none are implemented yet
   */
  public async callTool(name: string, parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log(`Calling tool: ${name} with parameters:`, parameters);
      console.log(`Tool timeout: ${TOOL_TIMEOUT_MS}ms`);
    }
    
    // Validate input parameters
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Tool name is required and must be a non-empty string');
    }
    
    if (parameters === null || parameters === undefined) {
      throw new Error('Tool parameters cannot be null or undefined');
    }
    
    // Switch statement for tool handling (currently empty)
    switch (name) {
      default:
        throw new Error(`Unknown tool: ${name}. Available tools: ${this.tools.map(t => t.name).join(', ') || 'none'}`);
    }
  }

  /**
   * Get information about storage maps for testing and monitoring
   */
  public getStorageInfo(): any {
    return {
      clients: {
        size: this.clients.size,
        keys: Array.from(this.clients.keys())
      },
      consoleMessages: {
        size: this.consoleMessages.size,
        keys: Array.from(this.consoleMessages.keys())
      },
      networkLogs: {
        size: this.networkLogs.size,
        keys: Array.from(this.networkLogs.keys())
      },
      errors: {
        size: this.errors.size,
        keys: Array.from(this.errors.keys())
      },
      maxStorageSize: MAX_STORAGE_SIZE
    };
  }

  /**
   * Add an entry to a storage map (for testing purposes)
   */
  public addStorageEntry(mapName: string, key: string, value: any): void {
    switch (mapName) {
      case 'clients':
        this.clients.set(key, value);
        break;
      case 'consoleMessages':
        if (!this.consoleMessages.has(key)) {
          this.consoleMessages.set(key, []);
        }
        this.consoleMessages.get(key)!.push(value);
        break;
      case 'networkLogs':
        if (!this.networkLogs.has(key)) {
          this.networkLogs.set(key, []);
        }
        this.networkLogs.get(key)!.push(value);
        break;
      case 'errors':
        if (!this.errors.has(key)) {
          this.errors.set(key, []);
        }
        this.errors.get(key)!.push(value);
        break;
      default:
        throw new Error(`Unknown storage map: ${mapName}`);
    }
    
    if (LOG_LEVEL === 'debug') {
      console.log(`Added entry to ${mapName} storage for key: ${key}`);
    }
  }

  /**
   * Clear all storage maps
   */
  public clearStorage(): void {
    this.clients.clear();
    this.consoleMessages.clear();
    this.networkLogs.clear();
    this.errors.clear();
    
    if (LOG_LEVEL === 'debug') {
      console.log('All storage maps cleared');
    }
  }
}

// Export for testing and external use
export default ChromeDevToolsMCPServer;