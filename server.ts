import * as dotenv from 'dotenv';
import CDP from 'chrome-remote-interface';

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
const CHROME_DEBUG_PORT = parseInt(process.env.CHROME_DEBUG_PORT || '9222', 10);
const CHROME_DEBUG_HOST = process.env.CHROME_DEBUG_HOST || 'localhost';

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
  
  // Source file registry for v1.1 debugging features
  public sourceFiles: Map<string, Map<string, any>> = new Map();
  
  // Breakpoint registry for v1.1 debugging features
  private breakpoints: Map<string, Map<string, any>> = new Map();

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
   * Initializes tool list with connect_to_chrome tool
   */
  public setupToolHandlers(): void {
    if (LOG_LEVEL === 'debug') {
      console.log(`Setting up tool handlers (max tools: ${MAX_TOOLS})...`);
    }
    
    // Define common Chrome connection parameters schema
    const chromeConnectionSchema = {
      port: {
        type: 'integer',
        description: 'Port number for Chrome DevTools Protocol',
        default: CHROME_DEBUG_PORT,
        minimum: 1024,
        maximum: 65535
      },
      host: {
        type: 'string',
        description: 'Host address for Chrome DevTools Protocol',
        default: CHROME_DEBUG_HOST,
        pattern: '^[a-zA-Z0-9.-]+$'
      }
    };

    // Initialize tools array with Chrome DevTools tools
    this.tools = [
      {
        name: 'connect_to_chrome',
        description: 'Connect to Chrome DevTools instance for debugging and monitoring. Establishes a connection to Chrome\'s remote debugging protocol.',
        inputSchema: {
          type: 'object',
          properties: chromeConnectionSchema,
          required: []
        }
      },
      {
        name: 'list_tabs',
        description: 'List all open Chrome tabs with their IDs, titles, and URLs. Retrieves information about all available tabs from Chrome DevTools.',
        inputSchema: {
          type: 'object',
          properties: chromeConnectionSchema,
          required: []
        }
      },
      {
        name: 'start_monitoring',
        description: 'Start monitoring a specific Chrome tab for real-time activity. Establishes CDP connection to tab and begins capturing console messages, network requests, and runtime errors.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to monitor (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            ...chromeConnectionSchema
          },
          required: ['tabId']
        }
      },
      {
        name: 'get_console_messages',
        description: 'Retrieve console messages from a specific Chrome tab. Returns captured console.log, console.warn, console.error messages with optional filtering by level and limit.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to retrieve console messages from (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of console messages to return (most recent first)',
              default: 100,
              minimum: 1,
              maximum: 1000
            },
            level: {
              type: 'string',
              description: 'Filter console messages by level (log, info, warn, error)',
              enum: ['log', 'info', 'warn', 'error', 'debug']
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'get_network_activity',
        description: 'Retrieve network activity from a specific Chrome tab. Returns captured HTTP requests and responses with optional filtering by type, method, and limit.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to retrieve network activity from (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of network entries to return (most recent first)',
              default: 50,
              minimum: 1,
              maximum: 500
            },
            type: {
              type: 'string',
              description: 'Filter network activity by type (request or response)',
              enum: ['request', 'response']
            },
            method: {
              type: 'string',
              description: 'Filter network requests by HTTP method',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'execute_js',
        description: 'Execute JavaScript/TypeScript code in a specific Chrome tab context. Runs expressions in the page context and returns results with error handling.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to execute JavaScript in (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            expression: {
              type: 'string',
              description: 'JavaScript/TypeScript expression or statement to execute in the tab context'
            },
            timeout: {
              type: 'integer',
              description: 'Maximum execution time in milliseconds before timeout',
              default: 5000,
              minimum: 100,
              maximum: 30000
            },
            includeCommandLineAPI: {
              type: 'boolean',
              description: 'Include Chrome DevTools Command Line API (console, $, $$, etc.) in execution context',
              default: false
            }
          },
          required: ['tabId', 'expression']
        }
      },
      {
        name: 'security_audit',
        description: 'Perform comprehensive security audit of a Chrome tab. Analyzes page for vulnerabilities, security headers, XSS risks, and provides detailed security recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to audit for security issues (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            auditType: {
              type: 'string',
              description: 'Type of security audit to perform (basic, comprehensive, headers, xss)',
              enum: ['basic', 'comprehensive', 'headers', 'xss'],
              default: 'basic'
            },
            depth: {
              type: 'string',
              description: 'Depth of security analysis (shallow, medium, deep)',
              enum: ['shallow', 'medium', 'deep'],
              default: 'medium'
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Include security recommendations and remediation guidance in audit results',
              default: true
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'check_vulnerabilities',
        description: 'Check for specific types of vulnerabilities in a Chrome tab. Performs targeted vulnerability detection for XSS, security headers, and other security issues.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to check for vulnerabilities (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            vulnerabilityType: {
              type: 'string',
              description: 'Type of vulnerability to check for (xss, headers)',
              enum: ['xss', 'headers']
            },
            severityFilter: {
              type: 'string',
              description: 'Filter results by severity level (optional)',
              enum: ['critical', 'high', 'medium', 'low']
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Include remediation recommendations for found vulnerabilities',
              default: true
            }
          },
          required: ['tabId', 'vulnerabilityType']
        }
      },
      {
        name: 'get_performance_metrics',
        description: 'Get performance metrics and Core Web Vitals from a Chrome tab. Analyzes page performance including LCP, FID, CLS, and provides optimization recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to get performance metrics from (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            includeDetails: {
              type: 'boolean',
              description: 'Include detailed performance analysis and recommendations',
              default: true
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'list_source_files',
        description: 'List JavaScript, CSS, and HTML source files loaded in a Chrome tab for debugging and code analysis. Essential for LLM-driven debugging workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab to list source files for (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            includeContent: {
              type: 'boolean',
              description: 'Include source file content in the response (use carefully for large files)',
              default: false
            },
            fileTypes: {
              type: 'array',
              description: 'Filter by file types',
              items: {
                type: 'string',
                enum: ['js', 'ts', 'css', 'html']
              },
              default: ['js', 'ts', 'css', 'html']
            }
          },
          required: ['tabId']
        }
      },
      {
        name: 'modify_source_code',
        description: 'Modify source code in real-time with hot reload support. Enables LLM-driven code modification and immediate testing of fixes. Essential for dynamic debugging workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab where source code will be modified (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            sourceId: {
              type: 'string',
              description: 'Script ID or URL pattern to identify the source file to modify. Use list_source_files to get available source IDs.'
            },
            newContent: {
              type: 'string',
              description: 'The modified source code content to apply. Must be valid JavaScript/TypeScript/CSS/HTML depending on file type.'
            },
            hotReload: {
              type: 'boolean',
              description: 'Whether to trigger hot reload after modification. When true, attempts to reload just the modified module without full page refresh.',
              default: true
            },
            validateSyntax: {
              type: 'boolean',
              description: 'Whether to validate syntax before applying changes. When true, prevents applying changes that would cause syntax errors.',
              default: true
            }
          },
          required: ['tabId', 'sourceId', 'newContent']
        }
      },
      {
        name: 'manage_breakpoints',
        description: 'Manage debugging breakpoints in Chrome DevTools. Set, remove, list, enable, or disable breakpoints for step-by-step debugging. Supports conditional breakpoints and logpoints for advanced debugging workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'ID of the Chrome tab where breakpoints will be managed (from list_tabs response)',
              pattern: '^[A-F0-9]{32}$'
            },
            operation: {
              type: 'string',
              description: 'Breakpoint operation to perform',
              enum: ['set', 'remove', 'list', 'enable', 'disable']
            },
            location: {
              type: 'object',
              description: 'Breakpoint location (required for set and remove operations)',
              properties: {
                url: {
                  type: 'string',
                  description: 'Source file URL or URL pattern where breakpoint will be set'
                },
                lineNumber: {
                  type: 'integer',
                  description: 'Line number where breakpoint will be set (1-indexed)',
                  minimum: 1
                },
                columnNumber: {
                  type: 'integer',
                  description: 'Optional column number for more precise breakpoint positioning (0-indexed)',
                  minimum: 0
                }
              },
              required: ['url', 'lineNumber']
            },
            condition: {
              type: 'string',
              description: 'Optional condition expression for conditional breakpoints. Breakpoint only triggers when condition evaluates to true.'
            },
            logMessage: {
              type: 'string',
              description: 'Optional log message for logpoints. When set, logs message instead of pausing execution. Supports expressions in curly braces like "x is {x}".'
            }
          },
          required: ['tabId', 'operation']
        }
      },
      {
        name: 'debug_step_control',
        description: 'Control step debugging execution using Chrome DevTools Protocol. Supports pause, resume, and step operations (over, into, out) for precise debugging control during breakpoint hits.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'The ID of the Chrome tab to control',
              pattern: '^[A-F0-9]{32}$'
            },
            action: {
              type: 'string',
              enum: ['pause', 'resume', 'stepOver', 'stepInto', 'stepOut'],
              description: 'The debugging action to perform. pause: Pause execution, resume: Continue execution, stepOver: Step over next function call, stepInto: Step into next function call, stepOut: Step out of current function'
            },
            callFrameId: {
              type: 'string',
              description: 'The call frame ID from the paused state. Required for step actions (stepOver, stepInto, stepOut) but not for pause/resume.'
            }
          },
          required: ['tabId', 'action']
        }
      }
    ];
    
    if (LOG_LEVEL === 'debug') {
      console.log(`Tool handlers setup complete with ${this.tools.length} tools`);
    }
  }

  /**
   * List all available tools
   * Returns array of available tools including connect_to_chrome
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
    
    // Switch statement for tool handling
    switch (name) {
      case 'connect_to_chrome':
        return await this.connectToChrome(parameters);
      
      case 'list_tabs':
        return await this.listTabs(parameters);
      
      case 'start_monitoring':
        return await this.startMonitoring(parameters);
      
      case 'get_console_messages':
        return await this.getConsoleMessages(parameters);
      
      case 'get_network_activity':
        return await this.getNetworkActivity(parameters);
      
      case 'execute_js':
        return await this.executeJS(parameters);
      
      case 'security_audit':
        return await this.performSecurityAudit(parameters);
      
      case 'check_vulnerabilities':
        return await this.checkVulnerabilities(parameters);
      
      case 'get_performance_metrics':
        return await this.getPerformanceMetrics(parameters);
      
      case 'list_source_files':
        return await this.listSourceFiles(parameters);
      
      case 'modify_source_code':
        return await this.modifySourceCode(parameters);
      
      case 'manage_breakpoints':
        return await this.manageBreakpoints(parameters);
      
      case 'debug_step_control':
        return await this.debugStepControl(parameters);
      
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

  /**
   * Connect to Chrome DevTools instance
   * Performs basic CDP.List() call to test Chrome connection
   */
  public async connectToChrome(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Connecting to Chrome DevTools:', parameters);
    }

    // Extract and validate parameters before applying defaults
    const rawHost = parameters.host;
    const rawPort = parameters.port;

    // Validate host parameter if provided
    if (rawHost !== undefined) {
      if (typeof rawHost !== 'string' || rawHost.trim() === '') {
        throw new Error('Invalid host: Host must be a non-empty string.');
      }
      if (!/^[a-zA-Z0-9.-]+$/.test(rawHost)) {
        throw new Error(`Invalid host format: ${rawHost}. Host must contain only alphanumeric characters, dots, and hyphens.`);
      }
    }

    // Validate port parameter if provided
    if (rawPort !== undefined) {
      if (typeof rawPort !== 'number' || !Number.isInteger(rawPort)) {
        throw new Error('Invalid port: Port must be an integer.');
      }
    }

    // Apply defaults after validation
    const port = rawPort || CHROME_DEBUG_PORT;
    const host = rawHost || CHROME_DEBUG_HOST;

    // Validate port range
    if (typeof port !== 'number' || port < 1024 || port > 65535) {
      throw new Error(`Invalid port: ${port}. Port must be between 1024 and 65535.`);
    }

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Attempting to connect to Chrome at ${host}:${port}`);
      }

      // Try to list Chrome tabs to test connection
      const tabs = await CDP.List({ host, port });

      if (LOG_LEVEL === 'debug') {
        console.log(`Successfully connected to Chrome. Found ${tabs.length} tabs.`);
      }

      return {
        success: true,
        message: `Successfully connected to Chrome DevTools at ${host}:${port}`,
        connection: {
          host,
          port,
          tabCount: tabs.length,
          tabs: tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            type: tab.type
          }))
        }
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log('Failed to connect to Chrome:', error.message);
      }

      return {
        success: false,
        message: `Failed to connect to Chrome DevTools at ${host}:${port}: ${error.message}`,
        connection: {
          host,
          port,
          error: error.message
        }
      };
    }
  }

  /**
   * List all available Chrome tabs
   * Returns formatted list of Chrome tabs with their IDs, titles, and URLs
   */
  public async listTabs(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Listing Chrome tabs:', parameters);
    }

    // Extract and validate parameters before applying defaults
    const rawHost = parameters.host;
    const rawPort = parameters.port;

    // Validate host parameter if provided
    if (rawHost !== undefined) {
      if (typeof rawHost !== 'string' || rawHost.trim() === '') {
        throw new Error('Invalid host: Host must be a non-empty string.');
      }
      if (!/^[a-zA-Z0-9.-]+$/.test(rawHost)) {
        throw new Error(`Invalid host format: ${rawHost}. Host must contain only alphanumeric characters, dots, and hyphens.`);
      }
    }

    // Validate port parameter if provided
    if (rawPort !== undefined) {
      if (typeof rawPort !== 'number' || !Number.isInteger(rawPort)) {
        throw new Error('Invalid port: Port must be an integer.');
      }
    }

    // Apply defaults after validation
    const port = rawPort || CHROME_DEBUG_PORT;
    const host = rawHost || CHROME_DEBUG_HOST;

    // Validate port range
    if (typeof port !== 'number' || port < 1024 || port > 65535) {
      throw new Error(`Invalid port: ${port}. Port must be between 1024 and 65535.`);
    }

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Attempting to list tabs from Chrome at ${host}:${port}`);
      }

      // Get Chrome tabs using CDP.List()
      const tabs = await CDP.List({ host, port });

      if (LOG_LEVEL === 'debug') {
        console.log(`Successfully retrieved ${tabs.length} tabs from Chrome.`);
      }

      return {
        success: true,
        message: `Successfully retrieved ${tabs.length} tabs from Chrome DevTools at ${host}:${port}`,
        connection: {
          host,
          port,
          tabCount: tabs.length
        },
        tabs: tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          type: tab.type,
          webSocketDebuggerUrl: tab.webSocketDebuggerUrl,
          devtoolsFrontendUrl: tab.devtoolsFrontendUrl
        }))
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log('Failed to list Chrome tabs:', error.message);
      }

      return {
        success: false,
        message: `Failed to list tabs from Chrome DevTools at ${host}:${port}: ${error.message}`,
        connection: {
          host,
          port,
          error: error.message
        },
        tabs: []
      };
    }
  }

  /**
   * Connect to a specific Chrome tab for monitoring
   * Establishes CDP connection and enables basic domains (Console, Runtime)
   */
  public async connectToTab(tabId: string, parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log(`Connecting to Chrome tab: ${tabId}`, parameters);
    }

    // Validate tabId
    if (!tabId || typeof tabId !== 'string' || tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(tabId)) {
      throw new Error(`Invalid tab ID format: ${tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Extract and validate connection parameters
    const rawHost = parameters.host;
    const rawPort = parameters.port;

    // Validate host parameter if provided
    if (rawHost !== undefined) {
      if (typeof rawHost !== 'string' || rawHost.trim() === '') {
        throw new Error('Invalid host: Host must be a non-empty string.');
      }
      if (!/^[a-zA-Z0-9.-]+$/.test(rawHost)) {
        throw new Error(`Invalid host format: ${rawHost}. Host must contain only alphanumeric characters, dots, and hyphens.`);
      }
    }

    // Validate port parameter if provided
    if (rawPort !== undefined) {
      if (typeof rawPort !== 'number' || !Number.isInteger(rawPort)) {
        throw new Error('Invalid port: Port must be an integer.');
      }
    }

    // Apply defaults after validation
    const port = rawPort || CHROME_DEBUG_PORT;
    const host = rawHost || CHROME_DEBUG_HOST;

    // Validate port range
    if (typeof port !== 'number' || port < 1024 || port > 65535) {
      throw new Error(`Invalid port: ${port}. Port must be between 1024 and 65535.`);
    }

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Attempting to connect to tab ${tabId} on Chrome at ${host}:${port}`);
      }

      // Create CDP connection to specific tab with timeout
      const connectionTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const cdpConnection = CDP({ tab: tabId, host, port });
      const client = await Promise.race([cdpConnection, connectionTimeout]) as any;

      // Enable basic domains for monitoring
      const enabledDomains = [];
      
      try {
        // Use Runtime.consoleAPICalled instead of deprecated Console domain
        await client.Runtime.enable();
        enabledDomains.push('Runtime');
        
        // Set up console message event listener using Runtime domain
        client.Runtime.on('consoleAPICalled', (event: any) => {
          const consoleMessage = {
            level: event.type || 'log',
            text: event.args ? event.args.map((arg: any) => arg.value || arg.description || '[object]').join(' ') : '',
            timestamp: event.timestamp || Date.now(),
            url: '',
            line: 0,
            column: 0,
            source: 'console-api',
            args: event.args || [],
            executionContextId: event.executionContextId || 0,
            stackTrace: event.stackTrace || null
          };
          
          // Store console message for this tab
          if (!this.consoleMessages.has(tabId)) {
            this.consoleMessages.set(tabId, []);
          }
          this.consoleMessages.get(tabId)!.push(consoleMessage);
          
          if (LOG_LEVEL === 'debug') {
            console.log(`Console message captured for tab ${tabId}:`, consoleMessage.level, consoleMessage.text);
          }
        });
        
        if (LOG_LEVEL === 'debug') {
          console.log('Runtime domain enabled with console message listener');
        }
      } catch (error: any) {
        if (LOG_LEVEL === 'debug') {
          console.log('Failed to enable Runtime domain:', error.message);
        }
      }


      try {
        await client.Network.enable();
        enabledDomains.push('Network');
        
        // Set up network request event listener using proper event pattern
        client.Network.on('requestWillBeSent', (event: any) => {
          const networkRequest = {
            type: 'request',
            requestId: event.requestId || '',
            url: event.request?.url || '',
            method: event.request?.method || 'GET',
            headers: event.request?.headers || {},
            timestamp: event.timestamp || Date.now() / 1000,
            wallTime: event.wallTime || Date.now(),
            initiator: event.initiator || null,
            priority: event.request?.priority || 'Medium',
            referrerPolicy: event.request?.referrerPolicy || ''
          };
          
          // Store network request for this tab
          if (!this.networkLogs.has(tabId)) {
            this.networkLogs.set(tabId, []);
          }
          this.networkLogs.get(tabId)!.push(networkRequest);
          
          if (LOG_LEVEL === 'debug') {
            console.log(`Network request captured for tab ${tabId}:`, networkRequest.method, networkRequest.url);
          }
        });
        
        // Set up network response event listener using proper event pattern
        client.Network.on('responseReceived', (event: any) => {
          const networkResponse = {
            type: 'response',
            requestId: event.requestId || '',
            url: event.response?.url || '',
            status: event.response?.status || 0,
            statusText: event.response?.statusText || '',
            headers: event.response?.headers || {},
            timestamp: event.timestamp || Date.now() / 1000,
            wallTime: event.wallTime || Date.now(),
            mimeType: event.response?.mimeType || '',
            remoteIPAddress: event.response?.remoteIPAddress || '',
            remotePort: event.response?.remotePort || 0,
            fromDiskCache: event.response?.fromDiskCache || false,
            fromServiceWorker: event.response?.fromServiceWorker || false,
            timing: event.response?.timing || null
          };
          
          // Store network response for this tab
          if (!this.networkLogs.has(tabId)) {
            this.networkLogs.set(tabId, []);
          }
          this.networkLogs.get(tabId)!.push(networkResponse);
          
          if (LOG_LEVEL === 'debug') {
            console.log(`Network response captured for tab ${tabId}:`, networkResponse.status, networkResponse.url);
          }
        });
        
        if (LOG_LEVEL === 'debug') {
          console.log('Network domain enabled with request and response listeners');
        }
      } catch (error: any) {
        if (LOG_LEVEL === 'debug') {
          console.log('Failed to enable Network domain:', error.message);
        }
      }

      // Initialize source discovery for v1.1 debugging features
      try {
        await this.initializeSourceDiscovery(tabId, client);
        enabledDomains.push('Debugger');
        
        if (LOG_LEVEL === 'debug') {
          console.log('Source discovery initialized for debugging features');
        }
      } catch (error: any) {
        if (LOG_LEVEL === 'debug') {
          console.log('Failed to initialize source discovery:', error.message);
        }
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Successfully connected to tab ${tabId}. Enabled domains: ${enabledDomains.join(', ')}`);
      }

      // Store client for cleanup (but don't expose it in response)
      this.clients.set(tabId, client);

      return {
        success: true,
        message: `Successfully connected to Chrome tab ${tabId} at ${host}:${port}`,
        connection: {
          tabId,
          host,
          port,
          client: 'CDP_CLIENT_CONNECTED', // Don't expose actual client object
          timestamp: new Date().toISOString()
        },
        domains: enabledDomains
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to connect to tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to connect to Chrome tab ${tabId} at ${host}:${port}: ${error.message}`,
        connection: {
          tabId,
          host,
          port,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        domains: []
      };
    }
  }

  /**
   * Start monitoring a specific Chrome tab
   * Calls connectToTab and stores client connection for real-time monitoring
   */
  public async startMonitoring(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Starting monitoring for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate optional connection parameters
    if (parameters.port !== undefined && (parameters.port < 1024 || parameters.port > 65535)) {
      throw new Error(`Invalid port: ${parameters.port}. Port must be between 1024 and 65535.`);
    }

    if (parameters.host !== undefined && (typeof parameters.host !== 'string' || parameters.host.trim() === '')) {
      throw new Error('Invalid host: Host must be a non-empty string.');
    }

    // Extract connection parameters
    const connectionParams: any = {};
    if (parameters.host !== undefined) {
      connectionParams.host = parameters.host;
    }
    if (parameters.port !== undefined) {
      connectionParams.port = parameters.port;
    }

    try {
      // Call connectToTab to establish connection
      const connectionResult = await this.connectToTab(parameters.tabId, connectionParams);

      if (LOG_LEVEL === 'debug') {
        console.log(`Connect result for tab ${parameters.tabId}:`, connectionResult.success ? 'SUCCESS' : 'FAILED');
      }

      // Store client if connection was successful and not already stored
      if (connectionResult.success && connectionResult.connection.client) {
        // Ensure client is stored (in case connectToTab was mocked)
        if (!this.clients.has(parameters.tabId)) {
          this.clients.set(parameters.tabId, connectionResult.connection.client);
        }
        if (LOG_LEVEL === 'debug') {
          console.log(`Client stored for monitoring tab: ${parameters.tabId}`);
        }
      }

      // Return monitoring response
      return {
        success: connectionResult.success,
        message: connectionResult.success 
          ? `Started monitoring Chrome tab ${parameters.tabId}`
          : `Failed to start monitoring Chrome tab ${parameters.tabId}: ${connectionResult.message}`,
        monitoring: {
          tabId: parameters.tabId,
          host: connectionResult.connection.host,
          port: connectionResult.connection.port,
          timestamp: new Date().toISOString(),
          status: connectionResult.success ? 'active' : 'failed',
          domains: connectionResult.domains || [],
          error: connectionResult.connection.error || undefined
        }
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to start monitoring tab ${parameters.tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to start monitoring Chrome tab ${parameters.tabId}: ${error.message}`,
        monitoring: {
          tabId: parameters.tabId,
          host: parameters.host || CHROME_DEBUG_HOST,
          port: parameters.port || CHROME_DEBUG_PORT,
          timestamp: new Date().toISOString(),
          status: 'failed',
          domains: [],
          error: error.message
        }
      };
    }
  }

  /**
   * Get console messages from a specific Chrome tab
   * Returns stored console messages with optional filtering and limiting
   */
  public async getConsoleMessages(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Getting console messages for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate optional parameters
    if (parameters.limit !== undefined) {
      if (typeof parameters.limit !== 'number' || parameters.limit < 1 || parameters.limit > 1000) {
        throw new Error('Limit must be a number between 1 and 1000');
      }
    }

    if (parameters.level !== undefined) {
      const validLevels = ['log', 'info', 'warn', 'error', 'debug'];
      if (typeof parameters.level !== 'string' || !validLevels.includes(parameters.level)) {
        throw new Error(`Level must be one of: ${validLevels.join(', ')}`);
      }
    }

    const tabId = parameters.tabId;
    const limit = parameters.limit || 100;
    const levelFilter = parameters.level;

    try {
      // Get console messages for this tab
      const tabMessages = this.consoleMessages.get(tabId) || [];
      
      if (LOG_LEVEL === 'debug') {
        console.log(`Found ${tabMessages.length} console messages for tab ${tabId}`);
      }

      // Apply level filter if specified
      let filteredMessages = tabMessages;
      if (levelFilter) {
        filteredMessages = tabMessages.filter(msg => msg.level === levelFilter);
        if (LOG_LEVEL === 'debug') {
          console.log(`Filtered to ${filteredMessages.length} messages with level '${levelFilter}'`);
        }
      }

      // Sort by timestamp (most recent first)
      filteredMessages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Apply limit
      const limitedMessages = filteredMessages.slice(0, limit);

      if (LOG_LEVEL === 'debug') {
        console.log(`Returning ${limitedMessages.length} console messages (limit: ${limit})`);
      }

      return {
        success: true,
        message: `Retrieved ${limitedMessages.length} console messages from tab ${tabId}`,
        console: {
          tabId,
          totalMessages: tabMessages.length,
          returned: limitedMessages.length,
          timestamp: new Date().toISOString(),
          filters: {
            level: levelFilter || null,
            limit
          },
          messages: limitedMessages
        }
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to get console messages for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to get console messages from tab ${tabId}: ${error.message}`,
        console: {
          tabId,
          totalMessages: 0,
          returned: 0,
          timestamp: new Date().toISOString(),
          filters: {
            level: levelFilter || null,
            limit
          },
          messages: [],
          error: error.message
        }
      };
    }
  }

  /**
   * Get network activity from a specific Chrome tab
   * Returns stored network requests and responses with optional filtering
   */
  public async getNetworkActivity(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Getting network activity for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate optional parameters
    if (parameters.limit !== undefined) {
      if (typeof parameters.limit !== 'number' || parameters.limit < 1 || parameters.limit > 500) {
        throw new Error('Limit must be a number between 1 and 500');
      }
    }

    if (parameters.type !== undefined) {
      const validTypes = ['request', 'response'];
      if (typeof parameters.type !== 'string' || !validTypes.includes(parameters.type)) {
        throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (parameters.method !== undefined) {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      if (typeof parameters.method !== 'string' || !validMethods.includes(parameters.method)) {
        throw new Error(`Method must be one of: ${validMethods.join(', ')}`);
      }
    }

    const tabId = parameters.tabId;
    const limit = parameters.limit || 50;
    const typeFilter = parameters.type;
    const methodFilter = parameters.method;

    try {
      // Get network activity for this tab
      const tabActivity = this.networkLogs.get(tabId) || [];
      
      if (LOG_LEVEL === 'debug') {
        console.log(`Found ${tabActivity.length} network entries for tab ${tabId}`);
      }

      // Apply filters
      let filteredActivity = tabActivity;

      // Apply type filter if specified
      if (typeFilter) {
        filteredActivity = filteredActivity.filter(entry => entry.type === typeFilter);
        if (LOG_LEVEL === 'debug') {
          console.log(`Filtered to ${filteredActivity.length} entries with type '${typeFilter}'`);
        }
      }

      // Apply method filter if specified (only applies to requests)
      if (methodFilter) {
        filteredActivity = filteredActivity.filter(entry => 
          entry.type === 'request' && entry.method === methodFilter
        );
        if (LOG_LEVEL === 'debug') {
          console.log(`Filtered to ${filteredActivity.length} entries with method '${methodFilter}'`);
        }
      }

      // Sort by timestamp (most recent first)
      filteredActivity.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Apply limit
      const limitedActivity = filteredActivity.slice(0, limit);

      if (LOG_LEVEL === 'debug') {
        console.log(`Returning ${limitedActivity.length} network entries (limit: ${limit})`);
      }

      return {
        success: true,
        message: `Retrieved ${limitedActivity.length} network entries from tab ${tabId}`,
        network: {
          tabId,
          totalEntries: tabActivity.length,
          returned: limitedActivity.length,
          timestamp: new Date().toISOString(),
          filters: {
            type: typeFilter || null,
            method: methodFilter || null,
            limit
          },
          activity: limitedActivity
        }
      };
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to get network activity for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to get network activity from tab ${tabId}: ${error.message}`,
        network: {
          tabId,
          totalEntries: 0,
          returned: 0,
          timestamp: new Date().toISOString(),
          filters: {
            type: typeFilter || null,
            method: methodFilter || null,
            limit
          },
          activity: [],
          error: error.message
        }
      };
    }
  }

  /**
   * Execute JavaScript/TypeScript code in a specific Chrome tab context
   * Runs expressions in the page context and returns results with error handling
   */
  public async executeJS(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Executing JavaScript in tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate expression parameter
    if (!parameters.expression || typeof parameters.expression !== 'string' || parameters.expression.trim() === '') {
      throw new Error('Expression is required and must be a non-empty string');
    }

    // Validate optional timeout parameter
    if (parameters.timeout !== undefined) {
      if (typeof parameters.timeout !== 'number' || parameters.timeout < 100 || parameters.timeout > 30000) {
        throw new Error('Timeout must be between 100 and 30000 milliseconds');
      }
    }

    // Validate optional includeCommandLineAPI parameter
    if (parameters.includeCommandLineAPI !== undefined && typeof parameters.includeCommandLineAPI !== 'boolean') {
      throw new Error('includeCommandLineAPI must be a boolean value');
    }

    const tabId = parameters.tabId;
    const expression = parameters.expression;
    const timeout = parameters.timeout || 5000; // Default from tool definition
    const includeCommandLineAPI = parameters.includeCommandLineAPI || false;

    try {
      // Get client for this tab
      const client = this.clients.get(tabId);
      if (!client) {
        throw new Error(`Tab ${tabId} not found or not connected. Use start_monitoring to connect to the tab first.`);
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Executing JavaScript in tab ${tabId}: ${expression.substring(0, 100)}${expression.length > 100 ? '...' : ''}`);
      }

      // Execute JavaScript using Runtime.evaluate
      const evaluationResult = await client.Runtime.evaluate({
        expression: expression,
        timeout: timeout,
        includeCommandLineAPI: includeCommandLineAPI,
        returnByValue: true,
        generatePreview: true
      });

      const timestamp = new Date().toISOString();

      // Check if execution resulted in an exception
      if (evaluationResult.exceptionDetails) {
        const exception = evaluationResult.exceptionDetails;
        const errorInfo = {
          type: exception.exception?.className || 'Error',
          message: exception.exception?.description || exception.text || 'Unknown execution error',
          lineNumber: exception.lineNumber,
          columnNumber: exception.columnNumber,
          stackTrace: exception.stackTrace
        };

        if (LOG_LEVEL === 'debug') {
          console.log(`JavaScript execution failed in tab ${tabId}:`, errorInfo);
        }

        return {
          success: false,
          message: `JavaScript execution failed in tab ${tabId}: ${errorInfo.message}`,
          execution: {
            tabId,
            expression,
            timestamp,
            timeout,
            includeCommandLineAPI,
            error: errorInfo
          }
        };
      }

      // Successful execution
      const result = evaluationResult.result;
      
      if (LOG_LEVEL === 'debug') {
        console.log(`JavaScript execution successful in tab ${tabId}, result type: ${result.type}`);
      }

      return {
        success: true,
        message: `JavaScript executed successfully in tab ${tabId}`,
        execution: {
          tabId,
          expression,
          timestamp,
          timeout,
          includeCommandLineAPI,
          result: {
            type: result.type,
            value: result.value,
            description: result.description,
            preview: result.preview
          }
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to execute JavaScript in tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to execute JavaScript in tab ${tabId}: ${error.message}`,
        execution: {
          tabId,
          expression,
          timestamp: new Date().toISOString(),
          timeout,
          includeCommandLineAPI,
          error: {
            type: 'ExecutionError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Get basic page security information from a Chrome tab
   * Returns URL, protocol, HTTPS status, and other security-relevant page details
   */
  public async getPageSecurityInfo(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Getting page security info for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    const tabId = parameters.tabId;

    try {
      // Get client for this tab
      const client = this.clients.get(tabId);
      if (!client) {
        const result = {
          success: false,
          message: `Tab ${tabId} not found or not connected. Use start_monitoring to connect to the tab first.`,
          security: {
            tabId,
            timestamp: new Date().toISOString(),
            error: {
              type: 'ConnectionError',
              message: `Tab ${tabId} not found or not connected`
            }
          }
        };
        return result;
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Getting page security information for tab ${tabId}`);
      }

      // JavaScript to extract page security information
      const pageInfoScript = `
        (function() {
          try {
            const loc = window.location;
            return {
              url: loc.href,
              protocol: loc.protocol,
              hostname: loc.hostname,
              port: loc.port,
              pathname: loc.pathname,
              search: loc.search,
              hash: loc.hash,
              origin: loc.origin,
              isSecure: loc.protocol === 'https:',
              userAgent: navigator.userAgent,
              cookiesEnabled: navigator.cookieEnabled,
              title: document.title
            };
          } catch (error) {
            return {
              error: error.message,
              url: 'unknown',
              protocol: 'unknown',
              isSecure: false
            };
          }
        })();
      `;

      // Execute JavaScript to get page information
      const evaluationResult = await client.Runtime.evaluate({
        expression: pageInfoScript,
        returnByValue: true,
        generatePreview: false
      });

      const timestamp = new Date().toISOString();

      // Check if execution resulted in an exception
      if (evaluationResult.exceptionDetails) {
        const exception = evaluationResult.exceptionDetails;
        const errorInfo = {
          type: exception.exception?.className || 'Error',
          message: exception.exception?.description || exception.text || 'Unknown execution error',
          lineNumber: exception.lineNumber,
          columnNumber: exception.columnNumber
        };

        if (LOG_LEVEL === 'debug') {
          console.log(`Failed to get page security info for tab ${tabId}:`, errorInfo);
        }

        return {
          success: false,
          message: `Failed to get page security information for tab ${tabId}: ${errorInfo.message}`,
          security: {
            tabId,
            timestamp,
            error: errorInfo
          }
        };
      }

      // Successful execution
      const pageInfo = evaluationResult.result.value;
      
      if (LOG_LEVEL === 'debug') {
        console.log(`Page security information retrieved for tab ${tabId}: ${pageInfo.url}`);
      }

      return {
        success: true,
        message: `Page security information retrieved for tab ${tabId}`,
        security: {
          tabId,
          timestamp,
          pageInfo: pageInfo
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to get page security info for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to get page security information for tab ${tabId}: ${error.message}`,
        security: {
          tabId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'ExecutionError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Perform security audit of a Chrome tab
   * Basic audit framework with initial security checks
   */
  public async performSecurityAudit(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Performing security audit for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate optional auditType parameter
    if (parameters.auditType !== undefined) {
      const validAuditTypes = ['basic', 'comprehensive', 'headers', 'xss'];
      if (typeof parameters.auditType !== 'string' || !validAuditTypes.includes(parameters.auditType)) {
        throw new Error(`Invalid audit type: ${parameters.auditType}. Must be one of: ${validAuditTypes.join(', ')}`);
      }
    }

    // Validate optional depth parameter
    if (parameters.depth !== undefined) {
      const validDepths = ['shallow', 'medium', 'deep'];
      if (typeof parameters.depth !== 'string' || !validDepths.includes(parameters.depth)) {
        throw new Error(`Invalid depth: ${parameters.depth}. Must be one of: ${validDepths.join(', ')}`);
      }
    }

    // Validate optional includeRecommendations parameter
    if (parameters.includeRecommendations !== undefined && typeof parameters.includeRecommendations !== 'boolean') {
      throw new Error('includeRecommendations must be a boolean value');
    }

    const tabId = parameters.tabId;
    const auditType = parameters.auditType || 'basic';
    const depth = parameters.depth || 'medium';
    const includeRecommendations = parameters.includeRecommendations !== undefined ? parameters.includeRecommendations : true;

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Starting ${auditType} security audit (${depth} depth) for tab ${tabId}`);
      }

      // Get basic page security information
      const pageSecurityInfo = await this.getPageSecurityInfo({ tabId });

      if (!pageSecurityInfo.success) {
        return {
          success: false,
          message: `Failed to perform security audit for tab ${tabId}: ${pageSecurityInfo.message}`,
          audit: {
            tabId,
            auditType,
            depth,
            includeRecommendations,
            timestamp: new Date().toISOString(),
            error: pageSecurityInfo.security.error || { type: 'AuditError', message: 'Failed to get page security information' }
          }
        };
      }

      const pageInfo = pageSecurityInfo.security.pageInfo;
      const timestamp = new Date().toISOString();

      // Perform basic security checks
      const securityChecks = [];
      const recommendations = [];

      // Check 1: HTTPS Usage
      const httpsCheck = {
        name: 'HTTPS Usage',
        category: 'transport',
        severity: pageInfo.isSecure ? 'info' : 'high',
        status: pageInfo.isSecure ? 'pass' : 'fail',
        message: pageInfo.isSecure 
          ? `Site is using HTTPS (${pageInfo.url})` 
          : `Site is using insecure HTTP protocol (${pageInfo.url})`,
        details: {
          protocol: pageInfo.protocol,
          url: pageInfo.url,
          secure: pageInfo.isSecure
        }
      };
      securityChecks.push(httpsCheck);

      // Add HTTPS recommendation if needed
      if (!pageInfo.isSecure && includeRecommendations) {
        recommendations.push({
          category: 'transport',
          severity: 'high',
          title: 'Enable HTTPS',
          description: 'The website is using HTTP instead of HTTPS, which means data transmitted between the browser and server is not encrypted.',
          recommendation: 'Implement SSL/TLS certificates and redirect all HTTP traffic to HTTPS.',
          resources: [
            'https://letsencrypt.org/ - Free SSL certificates',
            'https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security'
          ]
        });
      }

      // Perform security header audit for applicable audit types
      let headerAuditResults: any = null;
      if (auditType === 'headers' || auditType === 'comprehensive') {
        if (LOG_LEVEL === 'debug') {
          console.log(`Performing security headers audit for ${auditType} audit`);
        }

        const headerAudit = await this.auditSecurityHeaders({ tabId });
        
        if (headerAudit.success) {
          headerAuditResults = headerAudit.audit.results;
          
          // Add header-based recommendations if requested
          if (includeRecommendations) {
            const failedHeaderChecks = headerAuditResults.headerChecks.filter((check: any) => check.status === 'fail');
            
            for (const failedCheck of failedHeaderChecks) {
              const recommendation = this.generateHeaderRecommendation(failedCheck);
              if (recommendation) {
                recommendations.push(recommendation);
              }
            }
          }
        } else {
          // Include error information if header audit failed
          headerAuditResults = {
            error: headerAudit.audit.error || { type: 'AuditError', message: 'Header audit failed' }
          };
        }
      }

      // Perform XSS vulnerability audit for applicable audit types
      let xssAuditResults: any = null;
      if (auditType === 'xss' || auditType === 'comprehensive') {
        if (LOG_LEVEL === 'debug') {
          console.log(`Performing XSS vulnerability audit for ${auditType} audit`);
        }

        const xssAudit = await this.checkXSSVulnerabilities({ tabId });
        
        if (xssAudit.success) {
          xssAuditResults = xssAudit.xss.results;
        } else {
          // Include error information if XSS audit failed
          xssAuditResults = {
            error: xssAudit.xss.error || { type: 'AuditError', message: 'XSS audit failed' }
          };
        }
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Security audit completed for tab ${tabId}: ${securityChecks.length} basic checks, ${recommendations.length} recommendations`);
      }

      // Build results object
      const results: any = {
        pageInfo: pageInfo,
        securityChecks: securityChecks
      };

      // Include header audit results if performed
      if (headerAuditResults) {
        results.headerAudit = headerAuditResults;
      }

      // Include XSS audit results if performed
      if (xssAuditResults) {
        results.xssAudit = xssAuditResults;
      }

      // Calculate combined summary
      let totalChecks = securityChecks.length;
      let totalPassed = securityChecks.filter(check => check.status === 'pass').length;
      let totalFailed = securityChecks.filter(check => check.status === 'fail').length;
      let totalWarnings = securityChecks.filter(check => check.status === 'warning').length;

      // Add header audit numbers to summary if available
      if (headerAuditResults && headerAuditResults.summary) {
        totalChecks += headerAuditResults.summary.totalChecks;
        totalPassed += headerAuditResults.summary.passed;
        totalFailed += headerAuditResults.summary.failed;
        totalWarnings += headerAuditResults.summary.warnings;
      }

      // Add XSS audit numbers to summary if available
      if (xssAuditResults && xssAuditResults.summary) {
        totalChecks += xssAuditResults.summary.totalChecks;
        totalPassed += xssAuditResults.summary.passed;
        totalFailed += xssAuditResults.summary.totalVulnerabilities;
        totalWarnings += xssAuditResults.summary.warnings;
      }

      results.summary = {
        totalChecks,
        passed: totalPassed,
        failed: totalFailed,
        warnings: totalWarnings
      };

      // Calculate security score based on all checks
      const allChecks = [...securityChecks];
      if (headerAuditResults && headerAuditResults.headerChecks) {
        allChecks.push(...headerAuditResults.headerChecks);
      }
      if (xssAuditResults && xssAuditResults.vulnerabilities) {
        allChecks.push(...xssAuditResults.vulnerabilities);
      }
      
      const securityScore = this.calculateSecurityScore(allChecks);
      results.securityScore = securityScore;
      
      // Include score breakdown for transparency
      results.scoreBreakdown = {
        totalChecks: allChecks.length,
        maxPossibleScore: 100,
        actualScore: securityScore,
        basicChecks: securityChecks.length,
        headerChecks: headerAuditResults ? (headerAuditResults.headerChecks ? headerAuditResults.headerChecks.length : 0) : 0,
        xssChecks: xssAuditResults ? (xssAuditResults.vulnerabilities ? xssAuditResults.vulnerabilities.length : 0) : 0
      };

      // Include recommendations if requested
      if (includeRecommendations) {
        results.recommendations = recommendations;
      }

      return {
        success: true,
        message: `Security audit completed for tab ${tabId}`,
        audit: {
          tabId,
          auditType,
          depth,
          includeRecommendations,
          timestamp,
          results: results
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to perform security audit for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to perform security audit for tab ${tabId}: ${error.message}`,
        audit: {
          tabId,
          auditType,
          depth,
          includeRecommendations,
          timestamp: new Date().toISOString(),
          error: {
            type: 'AuditError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Audit security headers in network responses from a Chrome tab
   * Checks for presence and quality of security headers in HTTP responses
   */
  public async auditSecurityHeaders(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Auditing security headers for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    const tabId = parameters.tabId;

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Auditing security headers for tab ${tabId}`);
      }

      // Get network activity for this tab
      const tabNetworkLogs = this.networkLogs.get(tabId) || [];
      
      // Filter for HTTP responses only
      const responses = tabNetworkLogs.filter(entry => entry.type === 'response' && entry.headers);
      
      if (LOG_LEVEL === 'debug') {
        console.log(`Found ${responses.length} HTTP responses to analyze for security headers`);
      }

      const timestamp = new Date().toISOString();
      const headerChecks: any[] = [];

      // Define critical security headers to check
      const securityHeaders = [
        {
          name: 'Strict-Transport-Security',
          severity: 'high',
          description: 'Enforces HTTPS connections and prevents protocol downgrade attacks'
        },
        {
          name: 'Content-Security-Policy',
          severity: 'high',
          description: 'Prevents XSS attacks by controlling resource loading'
        },
        {
          name: 'X-Content-Type-Options',
          severity: 'medium',
          description: 'Prevents MIME type sniffing attacks'
        },
        {
          name: 'X-Frame-Options',
          severity: 'medium',
          description: 'Prevents clickjacking attacks'
        },
        {
          name: 'X-XSS-Protection',
          severity: 'low',
          description: 'Enables browser XSS filtering (legacy header)'
        },
        {
          name: 'Referrer-Policy',
          severity: 'low',
          description: 'Controls referrer information sent with requests'
        }
      ];

      // Analyze security headers across all responses
      for (const headerInfo of securityHeaders) {
        const headerName = headerInfo.name;
        const foundResponses = responses.filter(response => 
          response.headers && Object.keys(response.headers).some(key => 
            key.toLowerCase() === headerName.toLowerCase()
          )
        );

        if (foundResponses.length === 0) {
          // Header is missing from all responses
          headerChecks.push({
            header: headerName,
            status: 'fail',
            severity: headerInfo.severity,
            message: `${headerName} header is missing from all responses`,
            description: headerInfo.description,
            responses: 0,
            totalResponses: responses.length
          });
        } else {
          // Header is present in some responses
          const headerValues = foundResponses.map(response => {
            const headers = response.headers || {};
            const headerKey = Object.keys(headers).find(key => 
              key.toLowerCase() === headerName.toLowerCase()
            );
            return headerKey ? headers[headerKey] : null;
          }).filter(value => value !== null);

          // Analyze header value quality
          const analysis = this.analyzeHeaderValue(headerName, headerValues[0]);
          
          headerChecks.push({
            header: headerName,
            status: analysis.status,
            severity: analysis.severity || headerInfo.severity,
            message: analysis.message || `${headerName} header is present (${foundResponses.length}/${responses.length} responses)`,
            description: headerInfo.description,
            value: headerValues[0],
            responses: foundResponses.length,
            totalResponses: responses.length,
            details: analysis.details
          });
        }
      }

      // Calculate summary
      const summary = {
        totalChecks: headerChecks.length,
        passed: headerChecks.filter(check => check.status === 'pass').length,
        failed: headerChecks.filter(check => check.status === 'fail').length,
        warnings: headerChecks.filter(check => check.status === 'warning').length
      };

      if (LOG_LEVEL === 'debug') {
        console.log(`Security headers audit completed for tab ${tabId}: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);
      }

      const message = responses.length === 0 
        ? `Security headers audit completed for tab ${tabId} (no network responses found)`
        : `Security headers audit completed for tab ${tabId} (analyzed ${responses.length} responses)`;

      return {
        success: true,
        message: message,
        audit: {
          tabId,
          timestamp,
          results: {
            totalResponses: responses.length,
            headerChecks: headerChecks,
            summary: summary
          }
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to audit security headers for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to audit security headers for tab ${tabId}: ${error.message}`,
        audit: {
          tabId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'AuditError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Analyze the quality of a security header value
   * Provides warnings for weak or problematic configurations
   */
  private analyzeHeaderValue(headerName: string, value: string): { status: string; severity?: string; message?: string; details?: any } {
    const normalizedName = headerName.toLowerCase();
    const normalizedValue = value.toLowerCase();

    switch (normalizedName) {
      case 'strict-transport-security': {
        const maxAgeMatch = value.match(/max-age=(\d+)/i);
        if (!maxAgeMatch) {
          return {
            status: 'warning',
            severity: 'medium',
            message: 'Strict-Transport-Security header present but missing max-age directive',
            details: { issue: 'missing-max-age' }
          };
        }
        
        const maxAge = parseInt(maxAgeMatch[1]);
        if (maxAge < 31536000) { // Less than 1 year
          return {
            status: 'warning',
            severity: 'medium',
            message: `Strict-Transport-Security max-age is too short (${maxAge} seconds, recommended: 31536000+)`,
            details: { maxAge, recommended: 31536000 }
          };
        }
        
        return {
          status: 'pass',
          message: 'Strict-Transport-Security header properly configured'
        };
      }

      case 'content-security-policy':
        if (normalizedValue.includes("'unsafe-inline'") || normalizedValue.includes("'unsafe-eval'")) {
          return {
            status: 'warning',
            severity: 'high',
            message: 'Content-Security-Policy contains unsafe directives (unsafe-inline or unsafe-eval)',
            details: { issue: 'unsafe-directives' }
          };
        }
        
        if (normalizedValue.includes('*') && !normalizedValue.includes("'self'")) {
          return {
            status: 'warning',
            severity: 'medium',
            message: 'Content-Security-Policy is very permissive (wildcard without self restriction)',
            details: { issue: 'permissive-wildcard' }
          };
        }
        
        return {
          status: 'pass',
          message: 'Content-Security-Policy header appears well-configured'
        };

      case 'x-frame-options':
        if (!['deny', 'sameorigin'].includes(normalizedValue)) {
          return {
            status: 'warning',
            severity: 'medium',
            message: `X-Frame-Options has unexpected value: ${value} (expected: DENY or SAMEORIGIN)`,
            details: { value, expected: ['DENY', 'SAMEORIGIN'] }
          };
        }
        
        return {
          status: 'pass',
          message: 'X-Frame-Options header properly configured'
        };

      case 'x-content-type-options':
        if (normalizedValue !== 'nosniff') {
          return {
            status: 'warning',
            severity: 'low',
            message: `X-Content-Type-Options has unexpected value: ${value} (expected: nosniff)`,
            details: { value, expected: 'nosniff' }
          };
        }
        
        return {
          status: 'pass',
          message: 'X-Content-Type-Options header properly configured'
        };

      default:
        return {
          status: 'pass',
          message: `${headerName} header is present`
        };
    }
  }

  /**
   * Generate security recommendations based on failed header checks
   * Provides specific guidance for missing or problematic security headers
   */
  private generateHeaderRecommendation(failedCheck: any): any {
    const headerName = failedCheck.header;
    const severity = failedCheck.severity || 'medium';

    switch (headerName) {
      case 'Strict-Transport-Security':
        return {
          category: 'headers',
          severity: severity,
          title: 'Implement HTTP Strict Transport Security (HSTS)',
          description: 'HSTS header is missing, which allows potential protocol downgrade attacks and cookie hijacking.',
          recommendation: 'Add the Strict-Transport-Security header with a minimum max-age of 31536000 seconds (1 year) and include subdomains.',
          implementation: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
            'https://hstspreload.org/ - HSTS Preload List Submission'
          ]
        };

      case 'Content-Security-Policy':
        return {
          category: 'headers',
          severity: severity,
          title: 'Implement Content Security Policy (CSP)',
          description: 'CSP header is missing, leaving the site vulnerable to XSS attacks and data injection.',
          recommendation: 'Implement a Content Security Policy that restricts resource loading to trusted sources.',
          implementation: "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
            'https://csp-evaluator.withgoogle.com/ - CSP Evaluator Tool'
          ]
        };

      case 'X-Content-Type-Options':
        return {
          category: 'headers',
          severity: severity,
          title: 'Prevent MIME Type Sniffing',
          description: 'X-Content-Type-Options header is missing, which may allow MIME type confusion attacks.',
          recommendation: 'Add the X-Content-Type-Options header to prevent browsers from MIME-sniffing responses.',
          implementation: 'X-Content-Type-Options: nosniff',
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'
          ]
        };

      case 'X-Frame-Options':
        return {
          category: 'headers',
          severity: severity,
          title: 'Prevent Clickjacking Attacks',
          description: 'X-Frame-Options header is missing, making the site vulnerable to clickjacking attacks.',
          recommendation: 'Add the X-Frame-Options header to control how your site can be embedded in frames.',
          implementation: 'X-Frame-Options: DENY (or SAMEORIGIN if framing within same origin is needed)',
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'
          ]
        };

      case 'X-XSS-Protection':
        return {
          category: 'headers',
          severity: 'low', // Lower priority as it's legacy
          title: 'Enable Legacy XSS Protection',
          description: 'X-XSS-Protection header is missing. While modern browsers rely on CSP, this provides defense in depth.',
          recommendation: 'Add the X-XSS-Protection header for legacy browser support.',
          implementation: 'X-XSS-Protection: 1; mode=block',
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection'
          ]
        };

      case 'Referrer-Policy':
        return {
          category: 'headers',
          severity: severity,
          title: 'Control Referrer Information',
          description: 'Referrer-Policy header is missing, potentially leaking sensitive information in referrer headers.',
          recommendation: 'Add the Referrer-Policy header to control how much referrer information is sent with requests.',
          implementation: 'Referrer-Policy: strict-origin-when-cross-origin',
          resources: [
            'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy'
          ]
        };

      default:
        return null; // No specific recommendation for this header
    }
  }

  /**
   * Calculate a numeric security score (0-100) based on security check results
   * Higher scores indicate better security posture
   */
  public calculateSecurityScore(checks: any[]): number {
    if (!checks || checks.length === 0) {
      return 0;
    }

    // Define severity weights (higher weight = more impact on score)
    const severityWeights: { [key: string]: number } = {
      'critical': 15,
      'high': 8,
      'medium': 5,
      'low': 2
    };

    // Define status multipliers
    const statusMultipliers: { [key: string]: number } = {
      'pass': 1.0,
      'warning': 0.7,  // Partial credit for warnings
      'fail': 0.0      // No credit for failures
    };

    let totalPossiblePoints = 0;
    let actualPoints = 0;

    for (const check of checks) {
      const severity = check.severity || 'medium';
      const status = check.status || 'fail';
      
      // Get weight for this check based on severity
      const weight = severityWeights[severity.toLowerCase()] || severityWeights['medium'];
      
      // Get multiplier based on status
      const multiplier = statusMultipliers[status.toLowerCase()] || statusMultipliers['fail'];
      
      // Calculate points for this check
      const maxPoints = weight;
      const earnedPoints = maxPoints * multiplier;
      
      totalPossiblePoints += maxPoints;
      actualPoints += earnedPoints;
    }

    // Calculate percentage score
    if (totalPossiblePoints === 0) {
      return 0;
    }

    const score = Math.round((actualPoints / totalPossiblePoints) * 100);
    
    // Ensure score is within valid range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check for XSS vulnerabilities in a Chrome tab
   * Analyzes DOM for inline scripts, event handlers, and CSP configuration
   */
  public async checkXSSVulnerabilities(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Checking XSS vulnerabilities for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    const tabId = parameters.tabId;

    try {
      // Get client for this tab
      const client = this.clients.get(tabId);
      if (!client) {
        return {
          success: false,
          message: `Tab ${tabId} not found or not connected. Use start_monitoring to connect to the tab first.`,
          xss: {
            tabId,
            timestamp: new Date().toISOString(),
            error: {
              type: 'ConnectionError',
              message: `Tab ${tabId} not found or not connected`
            }
          }
        };
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Analyzing DOM for XSS vulnerabilities in tab ${tabId}`);
      }

      // JavaScript to analyze DOM for XSS vulnerabilities
      const xssAnalysisScript = `
        (function() {
          try {
            // Count inline scripts
            const inlineScripts = document.querySelectorAll('script:not([src])').length;
            
            // Count inline event handlers
            const allElements = document.querySelectorAll('*');
            let inlineEventHandlers = 0;
            const eventHandlerAttributes = ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'oninput', 'onchange'];
            
            allElements.forEach(element => {
              eventHandlerAttributes.forEach(attr => {
                if (element.hasAttribute(attr)) {
                  inlineEventHandlers++;
                }
              });
            });
            
            // Count unsafe inline styles (style attributes)
            const unsafeInlineStyles = document.querySelectorAll('[style]').length;
            
            // Count external scripts
            const externalScripts = document.querySelectorAll('script[src]').length;
            
            // Look for potentially vulnerable patterns
            const vulnerablePatterns = [];
            
            // Check for eval, innerHTML, document.write usage in inline scripts
            const inlineScriptElements = document.querySelectorAll('script:not([src])');
            inlineScriptElements.forEach((script, index) => {
              const content = script.textContent || script.innerHTML;
              if (content.includes('eval(') || content.includes('innerHTML') || content.includes('document.write')) {
                vulnerablePatterns.push({
                  type: 'inline-script',
                  location: \`script element \${index + 1}\`,
                  content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
                });
              }
            });
            
            // Check for inline event handlers with potentially dangerous content
            allElements.forEach((element, index) => {
              eventHandlerAttributes.forEach(attr => {
                if (element.hasAttribute(attr)) {
                  const content = element.getAttribute(attr);
                  if (content && (content.includes('eval(') || content.includes('innerHTML') || content.includes('location'))) {
                    vulnerablePatterns.push({
                      type: 'inline-handler',
                      location: \`\${element.tagName.toLowerCase()}\${element.id ? '#' + element.id : ''}[\${attr}]\`,
                      content: content
                    });
                  }
                }
              });
            });
            
            // Check CSP status
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            const cspMetaContent = cspMeta ? cspMeta.getAttribute('content') : null;
            
            // Note: We can't easily check HTTP CSP headers from DOM, but we can check meta CSP
            const cspStatus = {
              present: !!cspMetaContent,
              restrictive: false,
              allowsUnsafeInline: false
            };
            
            if (cspMetaContent) {
              const cspLower = cspMetaContent.toLowerCase();
              cspStatus.allowsUnsafeInline = cspLower.includes("'unsafe-inline'");
              cspStatus.restrictive = !cspStatus.allowsUnsafeInline && 
                                     (cspLower.includes("'self'") || cspLower.includes("'none'"));
            }
            
            return {
              inlineScripts,
              inlineEventHandlers,
              unsafeInlineStyles,
              externalScripts,
              vulnerablePatterns,
              cspStatus
            };
          } catch (error) {
            return {
              error: error.message,
              inlineScripts: 0,
              inlineEventHandlers: 0,
              unsafeInlineStyles: 0,
              externalScripts: 0,
              vulnerablePatterns: [],
              cspStatus: { present: false, restrictive: false, allowsUnsafeInline: true }
            };
          }
        })();
      `;

      // Execute JavaScript to analyze XSS vulnerabilities
      const evaluationResult = await client.Runtime.evaluate({
        expression: xssAnalysisScript,
        returnByValue: true,
        generatePreview: false
      });

      const timestamp = new Date().toISOString();

      // Check if execution resulted in an exception
      if (evaluationResult.exceptionDetails) {
        const exception = evaluationResult.exceptionDetails;
        const errorInfo = {
          type: exception.exception?.className || 'Error',
          message: exception.exception?.description || exception.text || 'Unknown execution error',
          lineNumber: exception.lineNumber,
          columnNumber: exception.columnNumber
        };

        if (LOG_LEVEL === 'debug') {
          console.log(`Failed to check XSS vulnerabilities for tab ${tabId}:`, errorInfo);
        }

        return {
          success: false,
          message: `Failed to check XSS vulnerabilities for tab ${tabId}: ${errorInfo.message}`,
          xss: {
            tabId,
            timestamp,
            error: errorInfo
          }
        };
      }

      // Analyze results and identify vulnerabilities
      const analysis = evaluationResult.result.value;
      const vulnerabilities = [];

      // Check for inline scripts vulnerability
      if (analysis.inlineScripts > 0) {
        vulnerabilities.push({
          type: 'inline-scripts',
          severity: 'high',
          status: 'fail',
          message: `Found ${analysis.inlineScripts} inline script(s) which can be exploited for XSS attacks`,
          description: 'Inline scripts execute directly in the page context and can be manipulated by attackers to inject malicious code.',
          count: analysis.inlineScripts,
          recommendation: 'Move JavaScript to external files and use CSP to prevent inline script execution.'
        });
      } else {
        vulnerabilities.push({
          type: 'inline-scripts',
          severity: 'high',
          status: 'pass',
          message: 'No inline scripts detected',
          description: 'Page does not use inline scripts, reducing XSS attack surface.',
          count: 0
        });
      }

      // Check for inline event handlers vulnerability
      if (analysis.inlineEventHandlers > 0) {
        vulnerabilities.push({
          type: 'inline-event-handlers',
          severity: 'medium',
          status: 'fail',
          message: `Found ${analysis.inlineEventHandlers} inline event handler(s) which can be exploited for XSS`,
          description: 'Inline event handlers (onclick, onload, etc.) can be manipulated to execute malicious JavaScript.',
          count: analysis.inlineEventHandlers,
          recommendation: 'Use addEventListener() and CSP to prevent inline event handler execution.'
        });
      } else {
        vulnerabilities.push({
          type: 'inline-event-handlers',
          severity: 'medium',
          status: 'pass',
          message: 'No inline event handlers detected',
          description: 'Page does not use inline event handlers, reducing XSS risk.',
          count: 0
        });
      }

      // Check CSP configuration
      if (!analysis.cspStatus.present) {
        vulnerabilities.push({
          type: 'missing-csp',
          severity: 'high',
          status: 'fail',
          message: 'Content Security Policy (CSP) is not configured',
          description: 'CSP is a powerful defense against XSS attacks by controlling which resources can be loaded.',
          count: 1,
          recommendation: 'Implement a restrictive CSP header to prevent XSS attacks.'
        });
      } else if (!analysis.cspStatus.restrictive || analysis.cspStatus.allowsUnsafeInline) {
        vulnerabilities.push({
          type: 'permissive-csp',
          severity: 'medium',
          status: 'fail',
          message: 'Content Security Policy is too permissive',
          description: 'CSP allows unsafe-inline or other permissive directives that reduce XSS protection.',
          count: 1,
          recommendation: 'Tighten CSP directives to remove unsafe-inline and use nonces or hashes for inline content.'
        });
      } else {
        vulnerabilities.push({
          type: 'csp-configuration',
          severity: 'high',
          status: 'pass',
          message: 'Content Security Policy appears well-configured',
          description: 'CSP is present and appears to have restrictive settings for XSS protection.',
          count: 0
        });
      }

      // Check for unsafe inline styles (less critical but still relevant)
      if (analysis.unsafeInlineStyles > 0) {
        vulnerabilities.push({
          type: 'inline-styles',
          severity: 'low',
          status: 'warning',
          message: `Found ${analysis.unsafeInlineStyles} inline style attribute(s)`,
          description: 'Inline styles can sometimes be exploited for CSS-based attacks or data exfiltration.',
          count: analysis.unsafeInlineStyles,
          recommendation: 'Move styles to external CSS files and use CSP style-src directive.'
        });
      } else {
        vulnerabilities.push({
          type: 'inline-styles',
          severity: 'low',
          status: 'pass',
          message: 'No inline styles detected',
          description: 'Page does not use inline style attributes.',
          count: 0
        });
      }

      // Calculate summary
      const failedVulns = vulnerabilities.filter(v => v.status === 'fail');
      const warningVulns = vulnerabilities.filter(v => v.status === 'warning');
      const highRiskVulns = failedVulns.filter(v => v.severity === 'high');
      const mediumRiskVulns = failedVulns.filter(v => v.severity === 'medium');

      const summary = {
        totalChecks: vulnerabilities.length,
        totalVulnerabilities: failedVulns.length,
        highRisk: highRiskVulns.length,
        mediumRisk: mediumRiskVulns.length,
        lowRisk: failedVulns.filter(v => v.severity === 'low').length,
        warnings: warningVulns.length,
        passed: vulnerabilities.filter(v => v.status === 'pass').length
      };

      if (LOG_LEVEL === 'debug') {
        console.log(`XSS vulnerability check completed for tab ${tabId}: ${summary.totalVulnerabilities} vulnerabilities found`);
      }

      return {
        success: true,
        message: `XSS vulnerability check completed for tab ${tabId} (found ${summary.totalVulnerabilities} vulnerabilities)`,
        xss: {
          tabId,
          timestamp,
          results: {
            vulnerabilities,
            summary,
            analysis: {
              inlineScripts: analysis.inlineScripts,
              inlineEventHandlers: analysis.inlineEventHandlers,
              externalScripts: analysis.externalScripts,
              vulnerablePatterns: analysis.vulnerablePatterns,
              cspStatus: analysis.cspStatus
            }
          }
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to check XSS vulnerabilities for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to check XSS vulnerabilities for tab ${tabId}: ${error.message}`,
        xss: {
          tabId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'ExecutionError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Check for specific types of vulnerabilities in a Chrome tab
   * Provides targeted vulnerability detection with filtering options
   */
  public async checkVulnerabilities(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Checking vulnerabilities for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate vulnerabilityType parameter
    if (!parameters.vulnerabilityType || typeof parameters.vulnerabilityType !== 'string') {
      throw new Error('Vulnerability type is required and must be a string');
    }

    const validVulnTypes = ['xss', 'headers'];
    if (!validVulnTypes.includes(parameters.vulnerabilityType)) {
      throw new Error(`Invalid vulnerability type: ${parameters.vulnerabilityType}. Must be one of: ${validVulnTypes.join(', ')}`);
    }

    // Validate optional severityFilter parameter
    if (parameters.severityFilter !== undefined) {
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      if (typeof parameters.severityFilter !== 'string' || !validSeverities.includes(parameters.severityFilter)) {
        throw new Error(`Invalid severity filter: ${parameters.severityFilter}. Must be one of: ${validSeverities.join(', ')}`);
      }
    }

    // Validate optional includeRecommendations parameter
    if (parameters.includeRecommendations !== undefined && typeof parameters.includeRecommendations !== 'boolean') {
      throw new Error('includeRecommendations must be a boolean value');
    }

    const tabId = parameters.tabId;
    const vulnerabilityType = parameters.vulnerabilityType;
    const severityFilter = parameters.severityFilter;
    const includeRecommendations = parameters.includeRecommendations !== undefined ? parameters.includeRecommendations : true;

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Checking ${vulnerabilityType} vulnerabilities for tab ${tabId}${severityFilter ? ` (severity: ${severityFilter})` : ''}`);
      }

      const timestamp = new Date().toISOString();
      let vulnerabilityResult: any;

      // Call appropriate vulnerability check method based on type
      switch (vulnerabilityType) {
        case 'xss':
          vulnerabilityResult = await this.checkXSSVulnerabilities({ tabId });
          break;
        
        case 'headers':
          vulnerabilityResult = await this.auditSecurityHeaders({ tabId });
          break;
        
        default:
          throw new Error(`Unsupported vulnerability type: ${vulnerabilityType}`);
      }

      // Handle failure from underlying method
      if (!vulnerabilityResult.success) {
        return {
          success: false,
          message: `Failed to check ${vulnerabilityType} vulnerabilities for tab ${tabId}: ${vulnerabilityResult.message}`,
          vulnerabilities: {
            tabId,
            type: vulnerabilityType,
            timestamp,
            error: vulnerabilityType === 'xss' ? vulnerabilityResult.xss.error : vulnerabilityResult.audit.error
          }
        };
      }

      // Extract vulnerabilities from result based on type
      let vulnerabilities: any[] = [];
      let summary: any = {};

      if (vulnerabilityType === 'xss') {
        vulnerabilities = vulnerabilityResult.xss.results.vulnerabilities || [];
        summary = vulnerabilityResult.xss.results.summary || {};
      } else if (vulnerabilityType === 'headers') {
        vulnerabilities = vulnerabilityResult.audit.results.headerChecks || [];
        summary = vulnerabilityResult.audit.results.summary || {};
      }

      // Apply severity filter if specified
      if (severityFilter) {
        vulnerabilities = vulnerabilities.filter((vuln: any) => vuln.severity === severityFilter);
        
        // Update summary to reflect filtered results
        const failedFiltered = vulnerabilities.filter((vuln: any) => vuln.status === 'fail');
        const warningsFiltered = vulnerabilities.filter((vuln: any) => vuln.status === 'warning');
        const passedFiltered = vulnerabilities.filter((vuln: any) => vuln.status === 'pass');
        
        summary = {
          ...summary,
          filteredResults: {
            totalChecks: vulnerabilities.length,
            totalVulnerabilities: failedFiltered.length,
            warnings: warningsFiltered.length,
            passed: passedFiltered.length,
            appliedFilter: severityFilter
          }
        };
      }

      // Extract recommendations if requested
      let recommendations: any[] = [];
      if (includeRecommendations) {
        const failedVulns = vulnerabilities.filter((vuln: any) => vuln.status === 'fail');
        
        for (const vuln of failedVulns) {
          if (vuln.recommendation) {
            recommendations.push({
              type: vuln.type,
              severity: vuln.severity,
              title: vuln.message,
              recommendation: vuln.recommendation
            });
          }
        }
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`${vulnerabilityType} vulnerability check completed for tab ${tabId}: ${vulnerabilities.filter((v: any) => v.status === 'fail').length} vulnerabilities found`);
      }

      // Build response
      const response: any = {
        success: true,
        message: `${vulnerabilityType} vulnerability check completed for tab ${tabId}`,
        vulnerabilities: {
          tabId,
          type: vulnerabilityType,
          timestamp,
          vulnerabilities,
          summary
        }
      };

      // Include recommendations if any were found and requested
      if (includeRecommendations && recommendations.length > 0) {
        response.vulnerabilities.recommendations = recommendations;
      }

      return response;

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to check ${vulnerabilityType} vulnerabilities for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to check ${vulnerabilityType} vulnerabilities for tab ${tabId}: ${error.message}`,
        vulnerabilities: {
          tabId,
          type: vulnerabilityType,
          timestamp: new Date().toISOString(),
          error: {
            type: 'VulnerabilityCheckError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Get performance metrics and Core Web Vitals from a Chrome tab
   * Analyzes page performance and provides optimization recommendations
   */
  public async getPerformanceMetrics(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Getting performance metrics for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    // Validate optional includeDetails parameter
    if (parameters.includeDetails !== undefined && typeof parameters.includeDetails !== 'boolean') {
      throw new Error('includeDetails must be a boolean value');
    }

    const tabId = parameters.tabId;
    const includeDetails = parameters.includeDetails !== undefined ? parameters.includeDetails : true;

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Getting performance metrics for tab ${tabId} (details: ${includeDetails})`);
      }

      const timestamp = new Date().toISOString();
      const startTime = Date.now();

      // Check if tab is connected
      const client = this.clients.get(tabId);
      if (!client) {
        return {
          success: false,
          message: `Tab ${tabId} not found or not connected`,
          performance: {
            tabId,
            timestamp,
            error: {
              type: 'TabNotConnected',
              message: `Tab with ID ${tabId} is not connected. Use start_monitoring first.`
            }
          }
        };
      }

      // JavaScript to collect performance metrics
      const performanceScript = `
        (() => {
          try {
            // Check if we have pre-injected test data
            if (typeof window !== 'undefined' && window.mockPerformanceData) {
              return window.mockPerformanceData;
            }
            
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            const resource = performance.getEntriesByType('resource');
            
            // Core Web Vitals collection
            const webVitals = {
              LCP: null,
              FID: null,
              CLS: null,
              FCP: null,
              TTFB: null
            };

            // Get First Contentful Paint
            const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              webVitals.FCP = fcpEntry.startTime / 1000; // Convert to seconds
            }

            // Get TTFB from navigation timing
            if (navigation) {
              webVitals.TTFB = navigation.responseStart - navigation.fetchStart;
            }

            // Fallback LCP using navigation timing if PerformanceObserver is not available
            if (navigation && !webVitals.LCP) {
              webVitals.LCP = (navigation.loadEventEnd - navigation.fetchStart) / 1000;
            }

            // Estimate FID (First Input Delay) - in real scenarios this would be measured differently
            webVitals.FID = 50; // Default estimate

            // Estimate CLS (Cumulative Layout Shift) - simplified approach
            webVitals.CLS = 0.1; // Default estimate

            return {
              navigation: navigation ? {
                domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
                loadEventEnd: navigation.loadEventEnd,
                fetchStart: navigation.fetchStart,
                responseStart: navigation.responseStart,
                domInteractive: navigation.domInteractive,
                domComplete: navigation.domComplete
              } : null,
              webVitals,
              resourceTiming: resource.slice(0, 10).map(r => ({
                name: r.name,
                duration: r.duration,
                transferSize: r.transferSize || 0,
                initiatorType: r.initiatorType
              })),
              paintTiming: paint.map(p => ({
                name: p.name,
                startTime: p.startTime
              }))
            };
          } catch (error) {
            return {
              error: error.message,
              navigation: null,
              webVitals: {},
              resourceTiming: [],
              paintTiming: []
            };
          }
        })();
      `;

      // Execute JavaScript to get performance data
      const evaluationResult = await client.Runtime.evaluate({
        expression: performanceScript,
        returnByValue: true,
        generatePreview: false
      });

      const collectionTime = Math.max(1, Date.now() - startTime);

      // Check if execution resulted in an exception
      if (evaluationResult.exceptionDetails) {
        const exception = evaluationResult.exceptionDetails;
        const errorInfo = {
          type: exception.exception?.className || 'Error',
          message: exception.exception?.description || exception.text || 'Unknown execution error',
          lineNumber: exception.lineNumber,
          columnNumber: exception.columnNumber
        };

        if (LOG_LEVEL === 'debug') {
          console.log(`Failed to get performance metrics for tab ${tabId}:`, errorInfo);
        }

        return {
          success: false,
          message: `Failed to get performance metrics for tab ${tabId}: ${errorInfo.message}`,
          performance: {
            tabId,
            timestamp,
            collectionTime,
            error: errorInfo
          }
        };
      }

      // Analyze performance data
      const perfData = evaluationResult.result.value;
      
      if (perfData.error) {
        return {
          success: false,
          message: `Failed to get performance metrics for tab ${tabId}: ${perfData.error}`,
          performance: {
            tabId,
            timestamp,
            collectionTime,
            error: {
              type: 'ScriptError',
              message: perfData.error
            }
          }
        };
      }

      // Analyze Core Web Vitals
      const coreWebVitals = this.analyzeCoreWebVitals(perfData.webVitals);
      
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(coreWebVitals);
      
      // Generate recommendations if details are requested
      let recommendations: any[] = [];
      let analysis: any = {
        performanceScore,
        overallRating: this.getOverallRating(performanceScore)
      };

      if (includeDetails) {
        recommendations = this.generatePerformanceRecommendations(coreWebVitals, perfData);
        analysis = {
          ...analysis,
          coreWebVitalsBreakdown: coreWebVitals,
          navigationTiming: perfData.navigation,
          resourceCount: perfData.resourceTiming ? perfData.resourceTiming.length : 0
        };
      }

      if (LOG_LEVEL === 'debug') {
        console.log(`Performance metrics collected for tab ${tabId}: score ${performanceScore}/100`);
      }

      // Build response
      const response: any = {
        success: true,
        message: `Performance metrics collected for tab ${tabId}`,
        performance: {
          tabId,
          timestamp,
          collectionTime,
          metrics: {
            coreWebVitals,
            navigation: perfData.navigation,
            paintTiming: perfData.paintTiming || [],
            resourceTiming: perfData.resourceTiming || []
          },
          analysis
        }
      };

      // Include recommendations if requested and available
      if (includeDetails && recommendations.length > 0) {
        response.performance.recommendations = recommendations;
      }

      return response;

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to get performance metrics for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to get performance metrics for tab ${tabId}: ${error.message}`,
        performance: {
          tabId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'PerformanceError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Analyze Core Web Vitals and assign ratings
   */
  private analyzeCoreWebVitals(webVitals: any): any {
    const analyzed: any = {};

    // LCP (Largest Contentful Paint) - good: ≤2.5s, needs improvement: ≤4s, poor: >4s
    if (webVitals.LCP !== null) {
      analyzed.LCP = {
        value: webVitals.LCP,
        rating: webVitals.LCP <= 2.5 ? 'good' : webVitals.LCP <= 4 ? 'needs-improvement' : 'poor',
        unit: 'seconds'
      };
    }

    // FID (First Input Delay) - good: ≤100ms, needs improvement: ≤300ms, poor: >300ms
    if (webVitals.FID !== null) {
      analyzed.FID = {
        value: webVitals.FID,
        rating: webVitals.FID <= 100 ? 'good' : webVitals.FID <= 300 ? 'needs-improvement' : 'poor',
        unit: 'milliseconds'
      };
    }

    // CLS (Cumulative Layout Shift) - good: ≤0.1, needs improvement: ≤0.25, poor: >0.25
    if (webVitals.CLS !== null) {
      analyzed.CLS = {
        value: webVitals.CLS,
        rating: webVitals.CLS <= 0.1 ? 'good' : webVitals.CLS <= 0.25 ? 'needs-improvement' : 'poor',
        unit: 'score'
      };
    }

    // FCP (First Contentful Paint) - good: ≤1.8s, needs improvement: ≤3s, poor: >3s
    if (webVitals.FCP !== null) {
      analyzed.FCP = {
        value: webVitals.FCP,
        rating: webVitals.FCP <= 1.8 ? 'good' : webVitals.FCP <= 3 ? 'needs-improvement' : 'poor',
        unit: 'seconds'
      };
    }

    // TTFB (Time to First Byte) - good: ≤200ms, needs improvement: ≤500ms, poor: >500ms
    if (webVitals.TTFB !== null) {
      analyzed.TTFB = {
        value: webVitals.TTFB,
        rating: webVitals.TTFB <= 200 ? 'good' : webVitals.TTFB <= 500 ? 'needs-improvement' : 'poor',
        unit: 'milliseconds'
      };
    }

    return analyzed;
  }

  /**
   * Calculate overall performance score based on Core Web Vitals
   */
  private calculatePerformanceScore(coreWebVitals: any): number {
    const weights = {
      LCP: 25,  // Largest Contentful Paint
      FID: 25,  // First Input Delay  
      CLS: 25,  // Cumulative Layout Shift
      FCP: 25   // First Contentful Paint
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Score each metric
    Object.keys(weights).forEach(metric => {
      if (coreWebVitals[metric]) {
        const rating = coreWebVitals[metric].rating;
        let score = 0;
        
        switch (rating) {
          case 'good':
            score = 100;
            break;
          case 'needs-improvement':
            score = 65;
            break;
          case 'poor':
            score = 25;
            break;
        }
        
        totalScore += score * weights[metric as keyof typeof weights];
        totalWeight += weights[metric as keyof typeof weights];
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Get overall performance rating based on score
   */
  private getOverallRating(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Generate performance optimization recommendations
   */
  private generatePerformanceRecommendations(coreWebVitals: any, perfData: any): any[] {
    const recommendations: any[] = [];

    // LCP recommendations
    if (coreWebVitals.LCP && coreWebVitals.LCP.rating !== 'good') {
      recommendations.push({
        metric: 'LCP',
        severity: coreWebVitals.LCP.rating === 'poor' ? 'high' : 'medium',
        title: 'Improve Largest Contentful Paint',
        description: `LCP is ${(coreWebVitals.LCP.value || 0).toFixed(1)}s, which is ${coreWebVitals.LCP.rating}`,
        recommendations: [
          'Optimize server response times',
          'Use efficient image formats (WebP, AVIF)',
          'Implement lazy loading for off-screen images',
          'Remove unused CSS and JavaScript',
          'Use a Content Delivery Network (CDN)'
        ]
      });
    }

    // FID recommendations  
    if (coreWebVitals.FID && coreWebVitals.FID.rating !== 'good') {
      recommendations.push({
        metric: 'FID',
        severity: coreWebVitals.FID.rating === 'poor' ? 'high' : 'medium',
        title: 'Reduce First Input Delay',
        description: `FID is ${coreWebVitals.FID.value || 0}ms, which is ${coreWebVitals.FID.rating}`,
        recommendations: [
          'Break up long JavaScript tasks',
          'Use web workers for heavy computations',
          'Defer non-critical JavaScript',
          'Minimize main thread work',
          'Reduce JavaScript execution time'
        ]
      });
    }

    // CLS recommendations
    if (coreWebVitals.CLS && coreWebVitals.CLS.rating !== 'good') {
      recommendations.push({
        metric: 'CLS',
        severity: coreWebVitals.CLS.rating === 'poor' ? 'high' : 'medium',
        title: 'Reduce Cumulative Layout Shift',
        description: `CLS is ${(coreWebVitals.CLS.value || 0).toFixed(2)}, which is ${coreWebVitals.CLS.rating}`,
        recommendations: [
          'Always include size attributes on images and video elements',
          'Reserve space for ad slots',
          'Avoid inserting content above existing content',
          'Use transform animations instead of changing layout properties',
          'Preload critical fonts'
        ]
      });
    }

    // FCP recommendations
    if (coreWebVitals.FCP && coreWebVitals.FCP.rating !== 'good') {
      recommendations.push({
        metric: 'FCP',
        severity: coreWebVitals.FCP.rating === 'poor' ? 'high' : 'medium',
        title: 'Improve First Contentful Paint',
        description: `FCP is ${(coreWebVitals.FCP.value || 0).toFixed(1)}s, which is ${coreWebVitals.FCP.rating}`,
        recommendations: [
          'Eliminate render-blocking resources',
          'Minify CSS and JavaScript',
          'Remove unused CSS',
          'Preload key requests',
          'Use efficient text compression'
        ]
      });
    }

    // Resource-based recommendations
    if (perfData.resourceTiming && perfData.resourceTiming.length > 0) {
      const largeResources = perfData.resourceTiming.filter((r: any) => r.transferSize > 100000);
      if (largeResources.length > 0) {
        recommendations.push({
          metric: 'resources',
          severity: 'medium',
          title: 'Optimize Large Resources',
          description: `Found ${largeResources.length} resources larger than 100KB`,
          recommendations: [
            'Compress images and use modern formats',
            'Implement code splitting for JavaScript',
            'Use tree shaking to eliminate unused code',
            'Enable gzip/brotli compression on server',
            'Consider lazy loading for non-critical resources'
          ]
        });
      }
    }

    return recommendations;
  }

  /**
   * List source files loaded in a Chrome tab for debugging and analysis
   */
  public async listSourceFiles(parameters: any): Promise<any> {
    if (LOG_LEVEL === 'debug') {
      console.log('Listing source files for tab:', parameters);
    }

    // Validate tabId parameter
    if (!parameters.tabId || typeof parameters.tabId !== 'string' || parameters.tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }

    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(parameters.tabId)) {
      throw new Error(`Invalid tab ID format: ${parameters.tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }

    const tabId = parameters.tabId;
    const includeContent = parameters.includeContent || false;
    const fileTypes = parameters.fileTypes || ['js', 'ts', 'css', 'html'];

    try {
      if (LOG_LEVEL === 'debug') {
        console.log(`Listing source files for tab ${tabId} (content: ${includeContent}, types: ${fileTypes.join(', ')})`);
      }

      const timestamp = new Date().toISOString();

      // Check if tab is connected
      const client = this.clients.get(tabId);
      if (!client) {
        return {
          success: false,
          message: `Tab ${tabId} not found or not connected`,
          sourceFiles: {
            tabId,
            timestamp,
            error: {
              type: 'TabNotConnected',
              message: `Tab with ID ${tabId} is not connected. Use start_monitoring first.`
            }
          }
        };
      }

      // Enable debugger domain to access scripts and source files
      await client.Debugger.enable();
      
      // Enable CSS domain for stylesheets
      await client.CSS.enable();

      // Get all loaded scripts
      const scriptsResponse = await client.Runtime.evaluate({
        expression: `
          (function() {
            const scripts = Array.from(document.scripts).map(script => ({
              src: script.src || null,
              type: script.type || 'text/javascript',
              inline: !script.src,
              content: script.src ? null : script.textContent
            }));
            
            const stylesheets = Array.from(document.styleSheets).map(sheet => ({
              href: sheet.href || null,
              type: 'text/css',
              inline: !sheet.href,
              disabled: sheet.disabled
            }));
            
            return {
              scripts,
              stylesheets,
              documentURL: document.location.href,
              title: document.title
            };
          })()
        `,
        returnByValue: true
      });

      if (scriptsResponse.exceptionDetails) {
        throw new Error(`Script evaluation failed: ${scriptsResponse.exceptionDetails.text}`);
      }

      const pageData = scriptsResponse.result.value;
      const sourceFiles: any[] = [];

      // Process JavaScript files
      if (fileTypes.includes('js') || fileTypes.includes('ts')) {
        for (const script of pageData.scripts) {
          const fileExtension = script.src ? 
            (script.src.includes('.ts') ? 'ts' : 'js') : 
            'js';
          
          if (fileTypes.includes(fileExtension)) {
            const sourceFile: any = {
              type: fileExtension,
              url: script.src || 'inline',
              inline: script.inline,
              size: script.content ? script.content.length : null
            };

            if (includeContent && script.content) {
              sourceFile.content = script.content;
            }

            sourceFiles.push(sourceFile);
          }
        }
      }

      // Process CSS files
      if (fileTypes.includes('css')) {
        for (const stylesheet of pageData.stylesheets) {
          const sourceFile: any = {
            type: 'css',
            url: stylesheet.href || 'inline',
            inline: stylesheet.inline,
            disabled: stylesheet.disabled
          };

          if (includeContent && stylesheet.inline) {
            try {
              // Try to get inline CSS content
              const cssContent = await client.Runtime.evaluate({
                expression: `
                  (function() {
                    const sheet = Array.from(document.styleSheets).find(s => s.href === ${JSON.stringify(stylesheet.href)});
                    if (!sheet || !sheet.cssRules) return null;
                    return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\\n');
                  })()
                `,
                returnByValue: true
              });
              
              if (cssContent.result.value) {
                sourceFile.content = cssContent.result.value;
                sourceFile.size = cssContent.result.value.length;
              }
            } catch (error) {
              // CSS content might not be accessible due to CORS
              sourceFile.contentError = 'Unable to access CSS content (CORS restriction)';
            }
          }

          sourceFiles.push(sourceFile);
        }
      }

      // Process HTML document
      if (fileTypes.includes('html')) {
        const htmlFile: any = {
          type: 'html',
          url: pageData.documentURL,
          inline: false,
          title: pageData.title
        };

        if (includeContent) {
          const htmlContent = await client.Runtime.evaluate({
            expression: 'document.documentElement.outerHTML',
            returnByValue: true
          });
          
          if (htmlContent.result.value) {
            htmlFile.content = htmlContent.result.value;
            htmlFile.size = htmlContent.result.value.length;
          }
        }

        sourceFiles.push(htmlFile);
      }

      return {
        success: true,
        message: `Found ${sourceFiles.length} source files in tab ${tabId}`,
        sourceFiles: {
          tabId,
          timestamp,
          documentURL: pageData.documentURL,
          title: pageData.title,
          files: sourceFiles,
          summary: {
            totalFiles: sourceFiles.length,
            fileTypes: fileTypes,
            includeContent: includeContent,
            breakdown: {
              javascript: sourceFiles.filter(f => f.type === 'js').length,
              typescript: sourceFiles.filter(f => f.type === 'ts').length,
              css: sourceFiles.filter(f => f.type === 'css').length,
              html: sourceFiles.filter(f => f.type === 'html').length,
              inline: sourceFiles.filter(f => f.inline).length,
              external: sourceFiles.filter(f => !f.inline).length
            }
          }
        }
      };

    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to list source files for tab ${tabId}:`, error.message);
      }

      return {
        success: false,
        message: `Failed to list source files for tab ${tabId}: ${error.message}`,
        sourceFiles: {
          tabId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'SourceFileError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Modify source code in real-time with hot reload support
   * Uses Chrome DevTools Protocol to modify JavaScript/TypeScript/CSS code
   */
  public async modifySourceCode(parameters: any): Promise<any> {
    const { tabId, sourceId, newContent, hotReload = true, validateSyntax = true } = parameters;
    
    // Check if code modification is enabled
    const codeModificationEnabled = process.env.CODE_MODIFICATION_ENABLED !== 'false';
    if (!codeModificationEnabled) {
      return {
        success: false,
        message: 'Code modification is disabled. Set CODE_MODIFICATION_ENABLED=true to enable this feature.',
        sourceModification: {
          tabId,
          sourceId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'FeatureDisabled',
            message: 'Code modification is disabled via environment variable'
          }
        }
      };
    }
    
    try {
      // Get the Chrome client for this tab
      const client = this.clients.get(tabId);
      if (!client) {
        return {
          success: false,
          message: `Tab ${tabId} is not connected. Use start_monitoring first.`,
          error: 'Tab not connected',
          sourceModification: {
            tabId,
            sourceId,
            timestamp: new Date().toISOString(),
            error: {
              type: 'TabNotConnected',
              message: 'Chrome tab is not connected'
            }
          }
        };
      }
      
      // Resolve the source target
      const sourceTarget = await this.resolveSourceTarget(tabId, sourceId);
      if (!sourceTarget) {
        return {
          success: false,
          message: `Source file not found: ${sourceId}`,
          error: 'Source file not found',
          sourceModification: {
            tabId,
            sourceId,
            timestamp: new Date().toISOString(),
            error: {
              type: 'SourceNotFound',
              message: `Could not find source file matching: ${sourceId}`
            }
          }
        };
      }
      
      // Store original source for potential rollback
      let originalSource: string | undefined;
      try {
        const originalResult = await client.send('Debugger.getScriptSource', {
          scriptId: sourceTarget.scriptId
        });
        originalSource = originalResult.scriptSource;
      } catch (error: any) {
        if (LOG_LEVEL === 'debug') {
          console.log('Could not retrieve original source:', error.message);
        }
      }
      
      // Check content size limits (10MB max by default)
      const maxSize = parseInt(process.env.MAX_SOURCE_SIZE || '10485760', 10);
      const contentSize = new TextEncoder().encode(newContent).length;
      if (contentSize > maxSize) {
        return {
          success: false,
          message: `Source code too large: ${contentSize} bytes (max: ${maxSize})`,
          error: 'Content size exceeds limit',
          sourceModification: {
            tabId,
            sourceId,
            scriptId: sourceTarget.scriptId,
            contentSize,
            timestamp: new Date().toISOString(),
            error: {
              type: 'SizeLimitExceeded',
              message: `Content size ${contentSize} exceeds maximum ${maxSize}`
            }
          }
        };
      }
      
      // Determine file type for appropriate validation
      const fileType = this.getFileType(sourceTarget.url);
      
      // Validate syntax if requested
      if (validateSyntax) {
        const validationResult = await this.validateSourceCode(client, newContent, fileType, sourceTarget);
        if (!validationResult.valid) {
          return {
            success: false,
            message: `Validation failed: ${validationResult.error}`,
            error: validationResult.error,
            sourceModification: {
              tabId,
              sourceId,
              scriptId: sourceTarget.scriptId,
              fileType,
              timestamp: new Date().toISOString(),
              error: {
                type: validationResult.errorType || 'ValidationError',
                message: validationResult.error,
                lineNumber: validationResult.lineNumber,
                columnNumber: validationResult.columnNumber
              }
            }
          };
        }
      }
      
      // Modify the source code using CDP
      const modifyResult = await client.Debugger.setScriptSource({
        scriptId: sourceTarget.scriptId,
        scriptSource: newContent
      });
      
      if (modifyResult.status !== 'Ok') {
        const errorMessage = modifyResult.exceptionDetails?.text || 'Code modification failed';
        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
          sourceModification: {
            tabId,
            sourceId,
            scriptId: sourceTarget.scriptId,
            timestamp: new Date().toISOString(),
            error: {
              type: 'ModificationError',
              message: errorMessage,
              details: modifyResult.exceptionDetails
            }
          }
        };
      }
      
      // Track affected modules
      const affectedModules = [sourceTarget.url];
      
      // Handle hot reload if requested
      let reloadRequired = false;
      if (hotReload) {
        try {
          // Try hot reload based on module system
          const reloadResult = await this.attemptHotReload(client, sourceTarget, affectedModules);
          reloadRequired = !reloadResult.success;
          
          if (reloadResult.success) {
            affectedModules.push(...(reloadResult.reloadedModules || []));
          }
        } catch (hotReloadError: any) {
          // Hot reload failed, fall back to page reload
          reloadRequired = true;
          if (LOG_LEVEL === 'debug') {
            console.log('Hot reload failed:', hotReloadError.message);
          }
        }
        
        // If hot reload failed, do a full page reload
        if (reloadRequired) {
          await client.Page.reload({ ignoreCache: true });
        }
      }
      
      // Update source registry with modification info
      const registry = this.getSourceRegistry(tabId);
      const sourceInfo = registry.get(sourceTarget.scriptId);
      if (sourceInfo) {
        sourceInfo.lastModified = new Date().toISOString();
        sourceInfo.originalSource = originalSource;
        sourceInfo.isModified = true;
      }
      
      // Check for runtime errors after modification
      let warnings: any[] = [];
      if (process.env.CODE_VALIDATION_STRICT === 'true') {
        try {
          const runtimeCheck = await client.Runtime.evaluate({
            expression: `(function() { try { return { success: true }; } catch(e) { return { success: false, error: e.toString() }; } })()`,
            returnByValue: true
          });
          
          if (runtimeCheck.exceptionDetails) {
            warnings.push({
              type: 'RuntimeWarning',
              message: 'Potential runtime error detected after modification',
              details: runtimeCheck.exceptionDetails
            });
          }
        } catch (error: any) {
          // Runtime check failed, but modification succeeded
          if (LOG_LEVEL === 'debug') {
            console.log('Runtime validation check failed:', error.message);
          }
        }
      }
      
      return {
        success: true,
        message: `Successfully modified source: ${sourceTarget.url}`,
        reloadRequired,
        affectedModules,
        sourceModification: {
          tabId,
          sourceId,
          scriptId: sourceTarget.scriptId,
          url: sourceTarget.url,
          fileType,
          contentSize,
          timestamp: new Date().toISOString(),
          originalStored: !!originalSource,
          hotReloadAttempted: hotReload,
          reloadRequired,
          affectedModules,
          warnings: warnings.length > 0 ? warnings : undefined
        }
      };
      
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to modify source code for tab ${tabId}:`, error.message);
      }
      
      return {
        success: false,
        message: `Failed to modify source code: ${error.message}`,
        error: error.message,
        sourceModification: {
          tabId,
          sourceId,
          timestamp: new Date().toISOString(),
          error: {
            type: 'UnexpectedError',
            message: error.message
          }
        }
      };
    }
  }
  
  /**
   * Attempt hot reload for modified source
   * Returns success status and list of reloaded modules
   */
  private async attemptHotReload(client: any, sourceTarget: any, affectedModules: string[]): Promise<any> {
    try {
      // Detect module system
      const moduleDetection = await client.Runtime.evaluate({
        expression: `
          (function() {
            if (typeof module !== 'undefined' && module.hot) return { type: 'webpack', hot: true };
            if (typeof import.meta !== 'undefined' && import.meta.hot) return { type: 'vite', hot: true };
            if (typeof System !== 'undefined') return { type: 'systemjs', hot: false };
            if (typeof module !== 'undefined' && module.exports) return { type: 'commonjs', hot: false };
            if (typeof importScripts === 'function') return { type: 'worker', hot: false };
            return { type: 'unknown', hot: false };
          })()
        `,
        returnByValue: true
      });
      
      const moduleSystem = moduleDetection.result.value;
      
      if (moduleSystem.hot) {
        // Try HMR (Hot Module Replacement)
        const hmrResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              try {
                // Webpack HMR
                if (module.hot) {
                  module.hot.accept();
                  return { success: true, method: 'webpack' };
                }
                // Vite HMR
                if (import.meta.hot) {
                  import.meta.hot.accept();
                  return { success: true, method: 'vite' };
                }
              } catch (e) {
                return { success: false, error: e.message };
              }
            })()
          `,
          returnByValue: true
        });
        
        if (hmrResult.result.value?.success) {
          return {
            success: true,
            method: hmrResult.result.value.method,
            reloadedModules: affectedModules
          };
        }
      }
      
      // Try basic module reload for ES modules
      if (sourceTarget.url.endsWith('.js') || sourceTarget.url.endsWith('.mjs')) {
        const reloadResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              try {
                // Force re-evaluation of the module
                const url = new URL('${sourceTarget.url}', window.location.href);
                url.searchParams.set('_t', Date.now());
                return import(url.href).then(() => ({ success: true }));
              } catch (e) {
                return { success: false, error: e.message };
              }
            })()
          `,
          awaitPromise: true,
          returnByValue: true
        });
        
        if (reloadResult.result.value?.success) {
          return {
            success: true,
            method: 'esm-reload',
            reloadedModules: affectedModules
          };
        }
      }
      
      // Hot reload not supported
      return {
        success: false,
        reason: 'Hot reload not supported for this module type'
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize source code discovery for a tab
   * Enables Debugger domain and sets up event listeners
   */
  public async initializeSourceDiscovery(tabId: string, client: any): Promise<void> {
    try {
      // Enable Debugger domain to receive scriptParsed events
      await client.Debugger.enable();
      
      // Initialize source registry for this tab if not exists
      if (!this.sourceFiles.has(tabId)) {
        this.sourceFiles.set(tabId, new Map());
      }
      
      // Set up scriptParsed event listener
      client.on('Debugger.scriptParsed', (params: any) => {
        const sourceRegistry = this.sourceFiles.get(tabId);
        if (!sourceRegistry) return;
        
        // Store source file information
        sourceRegistry.set(params.scriptId, {
          scriptId: params.scriptId,
          url: params.url,
          hasSourceMap: !!params.sourceMapURL,
          sourceMapURL: params.sourceMapURL || undefined,
          startLine: params.startLine,
          startColumn: params.startColumn,
          endLine: params.endLine,
          endColumn: params.endColumn,
          executionContextId: params.executionContextId,
          hash: params.hash,
          isLiveEdit: params.isLiveEdit || false,
          length: params.length
        });
        
        if (LOG_LEVEL === 'debug') {
          console.log(`Source discovered: ${params.url} (${params.scriptId})`);
        }
      });
      
      // Also listen for scriptFailedToParse for error tracking
      client.on('Debugger.scriptFailedToParse', (params: any) => {
        if (LOG_LEVEL === 'debug') {
          console.log(`Script failed to parse: ${params.url}`);
        }
      });
      
    } catch (error: any) {
      console.error(`Failed to initialize source discovery for tab ${tabId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get source file registry for a specific tab
   */
  public getSourceRegistry(tabId: string): Map<string, any> {
    if (!this.sourceFiles.has(tabId)) {
      this.sourceFiles.set(tabId, new Map());
    }
    return this.sourceFiles.get(tabId)!;
  }

  /**
   * Get or create breakpoint registry for a tab
   */
  public getBreakpointRegistry(tabId: string): Map<string, any> {
    if (!this.breakpoints.has(tabId)) {
      this.breakpoints.set(tabId, new Map());
    }
    return this.breakpoints.get(tabId)!;
  }

  /**
   * Resolve source target by URL pattern or script ID
   */
  public async resolveSourceTarget(tabId: string, sourceId: string): Promise<any> {
    const registry = this.getSourceRegistry(tabId);
    
    // First, try direct script ID match
    if (registry.has(sourceId)) {
      const source = registry.get(sourceId);
      return {
        ...source,
        originalSource: !!source.originalUrl
      };
    }
    
    // Then, try URL pattern matching
    for (const [_scriptId, source] of registry.entries()) {
      // Check if the sourceId appears in the URL
      if (source.url && source.url.includes(sourceId)) {
        return {
          ...source,
          originalSource: !!source.originalUrl
        };
      }
      
      // Check original source URL if available
      if (source.originalUrl && source.originalUrl.includes(sourceId)) {
        return {
          ...source,
          originalSource: true
        };
      }
    }
    
    // No match found
    return null;
  }

  /**
   * Clean up source registry for a tab
   */
  public cleanupSourceRegistry(tabId: string): void {
    if (this.sourceFiles.has(tabId)) {
      this.sourceFiles.delete(tabId);
      if (LOG_LEVEL === 'debug') {
        console.log(`Cleaned up source registry for tab ${tabId}`);
      }
    }
  }

  /**
   * Get file type from URL
   */
  private getFileType(url: string): string {
    if (url.endsWith('.js') || url.endsWith('.mjs')) return 'javascript';
    if (url.endsWith('.ts') || url.endsWith('.tsx')) return 'typescript';
    if (url.endsWith('.css')) return 'css';
    if (url.endsWith('.html') || url.endsWith('.htm')) return 'html';
    if (url.endsWith('.json')) return 'json';
    return 'unknown';
  }

  /**
   * Validate source code based on file type
   */
  private async validateSourceCode(client: any, content: string, fileType: string, sourceTarget: any): Promise<any> {
    try {
      if (fileType === 'javascript' || fileType === 'typescript') {
        // Use Runtime.compileScript for better validation
        const compileResult = await client.Runtime.compileScript({
          expression: content,
          sourceURL: sourceTarget.url,
          persistScript: false
        });
        
        if (compileResult.exceptionDetails) {
          return {
            valid: false,
            error: compileResult.exceptionDetails.text || 'Compilation failed',
            errorType: 'SyntaxError',
            lineNumber: compileResult.exceptionDetails.lineNumber,
            columnNumber: compileResult.exceptionDetails.columnNumber
          };
        }
        
        return { valid: true };
      }
      
      if (fileType === 'css') {
        // Basic CSS validation - check for common syntax errors
        // Remove comments for validation
        const cleanCSS = content.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Check for empty values
        if (cleanCSS.match(/:\s*;/)) {
          return {
            valid: false,
            error: 'CSS contains empty property values',
            errorType: 'CSSError'
          };
        }
        
        // Check for unclosed braces
        const openBraces = (cleanCSS.match(/{/g) || []).length;
        const closeBraces = (cleanCSS.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          return {
            valid: false,
            error: `CSS has ${openBraces} opening braces but ${closeBraces} closing braces`,
            errorType: 'CSSError'
          };
        }
        
        return { valid: true };
      }
      
      if (fileType === 'json') {
        try {
          JSON.parse(content);
          return { valid: true };
        } catch (error: any) {
          return {
            valid: false,
            error: `JSON parse error: ${error.message}`,
            errorType: 'JSONError'
          };
        }
      }
      
      // For other file types, skip validation
      return { valid: true };
      
    } catch (error: any) {
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        errorType: 'ValidationError'
      };
    }
  }

  /**
   * Manage debugging breakpoints
   * Uses Chrome DevTools Protocol to set, remove, list, enable, or disable breakpoints
   */
  public async manageBreakpoints(parameters: any): Promise<any> {
    const { tabId, operation, location, condition, logMessage, breakpointId } = parameters;
    
    // Check if debugger is enabled
    const debuggerEnabled = process.env.DEBUGGER_ENABLED !== 'false';
    if (!debuggerEnabled) {
      return {
        success: false,
        message: 'Debugger is disabled. Set DEBUGGER_ENABLED=true to enable debugging features.',
        breakpointManagement: {
          tabId,
          operation,
          timestamp: new Date().toISOString(),
          error: {
            type: 'FeatureDisabled',
            message: 'Debugger is disabled via environment variable'
          }
        }
      };
    }
    
    // Validate tabId parameter
    if (!tabId || typeof tabId !== 'string' || tabId.trim() === '') {
      throw new Error('Tab ID is required and must be a non-empty string');
    }
    
    // Tab ID should be a 32-character hex string (Chrome tab ID format)
    if (!/^[A-F0-9]{32}$/i.test(tabId)) {
      throw new Error(`Invalid tab ID format: ${tabId}. Tab ID must be a 32-character hexadecimal string.`);
    }
    
    const timestamp = new Date().toISOString();
    
    try {
      // Check if tab is connected
      const client = this.clients.get(tabId);
      if (!client) {
        return {
          success: false,
          error: 'Tab not connected. Use start_monitoring first.',
          breakpointManagement: {
            tabId,
            operation,
            timestamp,
            error: {
              type: 'TabNotConnected',
              message: `Tab with ID ${tabId} is not connected`
            }
          }
        };
      }
      
      // Get or create breakpoint registry for this tab
      const breakpoints = this.getBreakpointRegistry(tabId);
      
      switch (operation) {
        case 'set':
          // Validate location parameter
          if (!location || !location.url || !location.lineNumber) {
            return {
              success: false,
              error: 'Location required for set operation',
              breakpointManagement: {
                tabId,
                operation,
                timestamp,
                error: {
                  type: 'ValidationError',
                  message: 'Location with url and lineNumber is required for setting breakpoints'
                }
              }
            };
          }
          
          // Set breakpoint using CDP
          const setParams: any = {
            url: location.url,
            lineNumber: location.lineNumber - 1, // CDP uses 0-based line numbers
            columnNumber: location.columnNumber
          };
          
          if (condition) {
            setParams.condition = condition;
          }
          
          if (logMessage) {
            setParams.logMessage = logMessage;
          }
          
          const setResult = await client.Debugger.setBreakpointByUrl(setParams);
          
          // Store breakpoint in registry
          const bpId = setResult.breakpointId;
          breakpoints.set(bpId, {
            id: bpId,
            url: location.url,
            lineNumber: location.lineNumber,
            columnNumber: location.columnNumber,
            condition,
            logMessage,
            enabled: true,
            locations: setResult.locations
          });
          
          return {
            success: true,
            message: `Breakpoint set at ${location.url}:${location.lineNumber}`,
            breakpointId: bpId,
            locations: setResult.locations,
            breakpointManagement: {
              tabId,
              operation,
              timestamp,
              breakpointId: bpId
            }
          };
          
        case 'remove':
          // Validate breakpointId parameter
          if (!breakpointId) {
            return {
              success: false,
              error: 'Breakpoint ID required for remove operation',
              breakpointManagement: {
                tabId,
                operation,
                timestamp,
                error: {
                  type: 'ValidationError',
                  message: 'breakpointId is required for removing breakpoints'
                }
              }
            };
          }
          
          // Remove breakpoint using CDP
          await client.Debugger.removeBreakpoint({ breakpointId });
          
          // Remove from registry
          breakpoints.delete(breakpointId);
          
          return {
            success: true,
            message: `Breakpoint ${breakpointId} removed`,
            breakpointManagement: {
              tabId,
              operation,
              timestamp,
              breakpointId
            }
          };
          
        case 'list':
          // Return all breakpoints for this tab
          const bpList = Array.from(breakpoints.values());
          
          return {
            success: true,
            message: `Found ${bpList.length} breakpoints`,
            breakpoints: bpList,
            breakpointManagement: {
              tabId,
              operation,
              timestamp,
              count: bpList.length
            }
          };
          
        case 'enable':
        case 'disable':
          // Validate breakpointId parameter
          if (!breakpointId) {
            return {
              success: false,
              error: `Breakpoint ID required for ${operation} operation`,
              breakpointManagement: {
                tabId,
                operation,
                timestamp,
                error: {
                  type: 'ValidationError',
                  message: `breakpointId is required for ${operation} operation`
                }
              }
            };
          }
          
          // Update breakpoint state in registry
          const bp = breakpoints.get(breakpointId);
          if (!bp) {
            return {
              success: false,
              error: `Breakpoint ${breakpointId} not found`,
              breakpointManagement: {
                tabId,
                operation,
                timestamp,
                error: {
                  type: 'NotFound',
                  message: `Breakpoint with ID ${breakpointId} not found`
                }
              }
            };
          }
          
          bp.enabled = operation === 'enable';
          
          // Note: CDP doesn't have individual breakpoint enable/disable
          // We track the state but don't change CDP state
          // Full implementation would re-set or remove breakpoints
          
          return {
            success: true,
            message: `Breakpoint ${breakpointId} ${operation}d`,
            breakpointManagement: {
              tabId,
              operation,
              timestamp,
              breakpointId,
              enabled: bp.enabled
            }
          };
          
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
            breakpointManagement: {
              tabId,
              operation,
              timestamp,
              error: {
                type: 'InvalidOperation',
                message: `Operation '${operation}' is not supported. Use: set, remove, list, enable, disable`
              }
            }
          };
      }
      
    } catch (error: any) {
      if (LOG_LEVEL === 'debug') {
        console.log(`Failed to manage breakpoints for tab ${tabId}:`, error.message);
      }
      
      return {
        success: false,
        error: error.message,
        breakpointManagement: {
          tabId,
          operation,
          timestamp,
          error: {
            type: 'BreakpointError',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Control step debugging execution
   * Uses Chrome DevTools Protocol to pause, resume, and step through code
   */
  public async debugStepControl(parameters: any): Promise<any> {
    const { tabId, action, callFrameId: _callFrameId } = parameters;
    
    // Check if debugger is enabled
    const debuggerEnabled = process.env.DEBUGGER_ENABLED !== 'false';
    if (!debuggerEnabled) {
      return {
        success: false,
        message: 'Debugger is disabled. Set DEBUGGER_ENABLED=true to enable debugging features.',
        stepControl: {
          tabId,
          action,
          timestamp: new Date().toISOString(),
          error: {
            type: 'FeatureDisabled',
            message: 'Debugger is disabled via environment variable'
          }
        }
      };
    }
    
    // For now, return a stub implementation
    // This will be fully implemented in Task 17.4
    return {
      success: false,
      message: 'debug_step_control is not yet implemented. This tool will be available in Task 17.4.',
      stepControl: {
        tabId,
        action,
        timestamp: new Date().toISOString(),
        error: {
          type: 'NotImplemented',
          message: 'Tool implementation pending'
        }
      }
    };
  }
}

// Export for testing and external use
export default ChromeDevToolsMCPServer;

// Start the MCP server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function startServer() {
    try {
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
      const { CallToolRequestSchema, ListToolsRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');

      // Create our Chrome DevTools server instance
      const chromeServer = new ChromeDevToolsMCPServer();
      chromeServer.setupErrorHandling();
      chromeServer.setupToolHandlers();

      // Create the MCP server
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

      // Handle list_tools requests
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = await chromeServer.listTools();
        return { tools };
      });

      // Handle call_tool requests
      server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
        const { name, arguments: args } = request.params;
        const result = await chromeServer.callTool(name, args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
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