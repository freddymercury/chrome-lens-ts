import { randomBytes } from 'crypto';
import {
  EventStreamConfig,
  StreamOptions,
  StreamEvent,
  EventType,
  StreamStatistics,
  GlobalStatistics,
  EventFilter
} from '../types/event-system.js';

/**
 * EventStreamManager - Pure event streaming architecture for Chrome Lens v1.2
 * Manages event streams with filtering, buffering, and throttling capabilities
 */
export class EventStreamManager {
  private client: any;
  private config: EventStreamConfig;
  private activeStreams: Map<string, StreamContext> = new Map();
  private eventBuffer: StreamEvent[] = [];
  private globalStats: {
    totalStreamsCreated: number;
    totalEventsProcessed: number;
    startTime: number;
  };
  private eventHandlers: Map<string, Function> = new Map();

  constructor(client: any, config: EventStreamConfig = {}) {
    this.client = client;
    this.config = {
      bufferSize: config.bufferSize || 100,
      throttleMs: config.throttleMs || 0,
      enableCompression: config.enableCompression || false,
      eventTypes: config.eventTypes || [],
      maxEventsPerSecond: config.maxEventsPerSecond || 1000
    };
    this.globalStats = {
      totalStreamsCreated: 0,
      totalEventsProcessed: 0,
      startTime: Date.now()
    };
  }

  /**
   * Start a new event stream
   */
  async startStream(options: StreamOptions): Promise<string> {
    const streamId = options.streamId || this.generateStreamId();
    
    // Create stream context
    const context: StreamContext = {
      id: streamId,
      options,
      statistics: {
        streamId,
        eventCounts: {} as Record<EventType, number>,
        totalEvents: 0,
        startTime: Date.now(),
        duration: 0,
        averageEventRate: 0
      },
      throttleTimer: null,
      pendingEvents: []
    };

    this.activeStreams.set(streamId, context);
    this.globalStats.totalStreamsCreated++;

    // Enable required CDP domains
    await this.enableDomainsForEventTypes(options.eventTypes);

    // Set up event handlers
    this.setupEventHandlersForStream(context);

    return streamId;
  }

  /**
   * Stop a specific stream
   */
  async stopStream(streamId: string): Promise<boolean> {
    const context = this.activeStreams.get(streamId);
    if (!context) {
      return false;
    }

    // Clean up throttle timer
    if (context.throttleTimer) {
      clearTimeout(context.throttleTimer);
    }

    // Remove event handlers if no other streams need them
    this.cleanupEventHandlers(context);

    this.activeStreams.delete(streamId);
    return true;
  }

  /**
   * Get list of active stream IDs
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Check if any streams are active
   */
  isStreaming(): boolean {
    return this.activeStreams.size > 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): EventStreamConfig {
    return { ...this.config };
  }

  /**
   * Get event buffer
   */
  getEventBuffer(): StreamEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Get stream statistics
   */
  getStreamStatistics(streamId: string): StreamStatistics | null {
    const context = this.activeStreams.get(streamId);
    if (!context) {
      return null;
    }

    const duration = Date.now() - context.statistics.startTime;
    const averageEventRate = context.statistics.totalEvents / (duration / 1000);

    return {
      ...context.statistics,
      duration,
      averageEventRate
    };
  }

  /**
   * Get global statistics
   */
  getGlobalStatistics(): GlobalStatistics {
    return {
      activeStreams: this.activeStreams.size,
      totalStreamsCreated: this.globalStats.totalStreamsCreated,
      totalEventsProcessed: this.globalStats.totalEventsProcessed,
      uptime: Date.now() - this.globalStats.startTime
    };
  }

  /**
   * Generate unique stream ID
   */
  private generateStreamId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Enable CDP domains for event types
   */
  private async enableDomainsForEventTypes(eventTypes: EventType[]): Promise<void> {
    const domains = this.getRequiredDomains(eventTypes);
    
    for (const domain of domains) {
      try {
        switch (domain) {
          case 'Console':
            await this.client.Console?.enable();
            break;
          case 'Network':
            await this.client.Network?.enable();
            break;
          case 'DOM':
            await this.client.DOM?.enable();
            break;
          case 'Runtime':
            await this.client.Runtime?.enable();
            break;
          case 'Performance':
            await this.client.Performance?.enable();
            break;
          case 'Security':
            await this.client.Security?.enable();
            break;
          case 'DOMStorage':
            await this.client.DOMStorage?.enable();
            break;
          case 'Debugger':
            await this.client.Debugger?.enable();
            break;
        }
      } catch (error) {
        console.warn(`Failed to enable domain ${domain}:`, error);
      }
    }
  }

  /**
   * Get required CDP domains for event types
   */
  private getRequiredDomains(eventTypes: EventType[]): string[] {
    const domainMap: Record<EventType, string[]> = {
      console: ['Console'],
      network: ['Network'],
      dom: ['DOM'],
      runtime: ['Runtime'],
      performance: ['Performance'],
      security: ['Security'],
      storage: ['DOMStorage'],
      debugger: ['Debugger'],
      all: ['Console', 'Network', 'DOM', 'Runtime', 'Performance', 'Security', 'DOMStorage', 'Debugger']
    };

    const domains = new Set<string>();
    for (const eventType of eventTypes) {
      const requiredDomains = domainMap[eventType] || [];
      requiredDomains.forEach(d => domains.add(d));
    }

    return Array.from(domains);
  }

  /**
   * Set up event handlers for a stream
   */
  private setupEventHandlersForStream(context: StreamContext): void {
    const { eventTypes } = context.options;

    for (const eventType of eventTypes) {
      switch (eventType) {
        case 'console':
          this.setupConsoleHandlers(context);
          break;
        case 'network':
          this.setupNetworkHandlers(context);
          break;
        case 'dom':
          this.setupDOMHandlers(context);
          break;
        case 'runtime':
          this.setupRuntimeHandlers(context);
          break;
        // Add more event types as needed
      }
    }
  }

  /**
   * Set up console event handlers
   */
  private setupConsoleHandlers(context: StreamContext): void {
    const handler = (params: any) => {
      const event = this.createStreamEvent('console', params.message);
      if (this.shouldProcessEvent(event, context.options.filters)) {
        this.processEvent(event, context);
      }
    };

    this.client.on('Console.messageAdded', handler);
    this.eventHandlers.set(`${context.id}:Console.messageAdded`, handler);
  }

  /**
   * Set up network event handlers
   */
  private setupNetworkHandlers(context: StreamContext): void {
    const requestHandler = (params: any) => {
      const event = this.createStreamEvent('network', params);
      if (this.shouldProcessEvent(event, context.options.filters)) {
        this.processEvent(event, context);
      }
    };

    this.client.on('Network.requestWillBeSent', requestHandler);
    this.eventHandlers.set(`${context.id}:Network.requestWillBeSent`, requestHandler);

    const responseHandler = (params: any) => {
      const event = this.createStreamEvent('network', params);
      if (this.shouldProcessEvent(event, context.options.filters)) {
        this.processEvent(event, context);
      }
    };

    this.client.on('Network.responseReceived', responseHandler);
    this.eventHandlers.set(`${context.id}:Network.responseReceived`, responseHandler);
  }

  /**
   * Set up DOM event handlers
   */
  private setupDOMHandlers(_context: StreamContext): void {
    // Implementation for DOM handlers
  }

  /**
   * Set up Runtime event handlers
   */
  private setupRuntimeHandlers(_context: StreamContext): void {
    // Implementation for Runtime handlers
  }

  /**
   * Create a stream event
   */
  private createStreamEvent(type: EventType, data: any): StreamEvent {
    return {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if event should be processed based on filters
   */
  private shouldProcessEvent(event: StreamEvent, filters?: EventFilter): boolean {
    if (!filters) return true;

    // Level filter for console events
    if (filters.level && event.type === 'console') {
      if (event.data.level !== filters.level) {
        return false;
      }
    }

    // URL pattern filter for network events
    if (filters.urlPattern && event.type === 'network') {
      const url = event.data.request?.url || event.data.response?.url;
      if (!url) return false;

      if (filters.urlPattern instanceof RegExp) {
        if (!filters.urlPattern.test(url)) {
          return false;
        }
      } else if (typeof filters.urlPattern === 'string') {
        if (!url.includes(filters.urlPattern)) {
          return false;
        }
      }
    }

    // Custom filter
    if (filters.customFilter) {
      return filters.customFilter(event);
    }

    return true;
  }

  /**
   * Process an event
   */
  private processEvent(event: StreamEvent, context: StreamContext): void {
    // Update statistics
    context.statistics.totalEvents++;
    const eventType = event.type;
    context.statistics.eventCounts[eventType] = (context.statistics.eventCounts[eventType] || 0) + 1;
    this.globalStats.totalEventsProcessed++;

    // Add to buffer
    this.addToBuffer(event);

    // Handle throttling
    if (this.config.throttleMs && this.config.throttleMs > 0) {
      context.pendingEvents.push(event);
      this.scheduleThrottledEmission(context);
    } else {
      // Emit immediately
      if (context.options.onEvent) {
        context.options.onEvent(event);
      }
    }
  }

  /**
   * Add event to buffer
   */
  private addToBuffer(event: StreamEvent): void {
    this.eventBuffer.push(event);
    
    // Maintain buffer size limit
    while (this.eventBuffer.length > (this.config.bufferSize || 100)) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Schedule throttled event emission
   */
  private scheduleThrottledEmission(context: StreamContext): void {
    if (context.throttleTimer) {
      return; // Already scheduled
    }

    context.throttleTimer = setTimeout(() => {
      const events = [...context.pendingEvents];
      context.pendingEvents = [];
      context.throttleTimer = null;

      // Emit all pending events
      if (context.options.onEvent) {
        for (const event of events) {
          context.options.onEvent(event);
        }
      }
    }, this.config.throttleMs);
  }

  /**
   * Clean up event handlers
   */
  private cleanupEventHandlers(context: StreamContext): void {
    // Remove handlers for this stream
    for (const [key, handler] of this.eventHandlers) {
      if (key.startsWith(`${context.id}:`)) {
        const eventName = key.split(':')[1];
        this.client.off(eventName, handler);
        this.eventHandlers.delete(key);
      }
    }
  }
}

/**
 * Stream context interface
 */
interface StreamContext {
  id: string;
  options: StreamOptions;
  statistics: StreamStatistics;
  throttleTimer: NodeJS.Timeout | null;
  pendingEvents: StreamEvent[];
}