/**
 * Event System Types for Chrome Lens v1.2
 * Pure event streaming architecture types
 */

export interface EventStreamConfig {
  /** Maximum number of events to buffer */
  bufferSize?: number;
  /** Throttle event emissions in milliseconds */
  throttleMs?: number;
  /** Enable event compression */
  enableCompression?: boolean;
  /** Event types to monitor */
  eventTypes?: EventType[];
  /** Maximum events per second */
  maxEventsPerSecond?: number;
}

export type EventType = 
  | 'console'
  | 'network' 
  | 'dom'
  | 'runtime'
  | 'performance'
  | 'security'
  | 'storage'
  | 'debugger'
  | 'all';

export interface StreamEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: EventType;
  /** Timestamp when event occurred */
  timestamp: number;
  /** Event data payload */
  data: any;
  /** Source tab ID */
  tabId?: string;
  /** Event metadata */
  metadata?: EventMetadata;
}

export interface EventMetadata {
  /** Event severity level */
  severity?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  /** Associated source file */
  sourceFile?: string;
  /** Line number in source */
  lineNumber?: number;
  /** Column number in source */
  columnNumber?: number;
  /** Stack trace if available */
  stackTrace?: string;
  /** Related event IDs */
  relatedEvents?: string[];
  /** Custom tags */
  tags?: string[];
}

export interface EventFilter {
  /** Filter by event type */
  eventTypes?: EventType[];
  /** Console log level filter */
  level?: 'log' | 'info' | 'warn' | 'error' | 'debug';
  /** Network method filter */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  /** URL pattern filter (string or regex) */
  urlPattern?: string | RegExp;
  /** Text search in event content */
  textSearch?: string;
  /** Filter by severity */
  severity?: EventMetadata['severity'];
  /** Time range filter */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Custom filter function */
  customFilter?: (event: StreamEvent) => boolean;
}

export interface StreamOptions {
  /** Event types to stream */
  eventTypes: EventType[];
  /** Event filters */
  filters?: EventFilter;
  /** Callback for each event */
  onEvent?: (event: StreamEvent) => void;
  /** Callback for errors */
  onError?: (error: StreamError) => void;
  /** Include historical events */
  includeHistory?: boolean;
  /** Stream ID (auto-generated if not provided) */
  streamId?: string;
}

export interface StreamError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Stream ID where error occurred */
  streamId: string;
  /** Timestamp of error */
  timestamp: number;
  /** Original error if available */
  originalError?: Error;
}

export interface StreamStatistics {
  /** Stream identifier */
  streamId: string;
  /** Event counts by type */
  eventCounts: Record<EventType, number>;
  /** Total events processed */
  totalEvents: number;
  /** Stream start time */
  startTime: number;
  /** Stream duration in ms */
  duration: number;
  /** Average events per second */
  averageEventRate: number;
  /** Peak events per second */
  peakEventRate?: number;
  /** Errors encountered */
  errorCount?: number;
  /** Filtered out events */
  filteredCount?: number;
}

export interface GlobalStatistics {
  /** Number of active streams */
  activeStreams: number;
  /** Total streams created */
  totalStreamsCreated: number;
  /** Total events processed across all streams */
  totalEventsProcessed: number;
  /** System uptime in ms */
  uptime: number;
  /** Memory usage if available */
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface EventBuffer {
  /** Buffer identifier */
  id: string;
  /** Maximum size */
  maxSize: number;
  /** Current size */
  currentSize: number;
  /** Events in buffer */
  events: StreamEvent[];
  /** Overflow strategy */
  overflowStrategy: 'drop-oldest' | 'drop-newest' | 'block';
  /** Compression enabled */
  compressed: boolean;
}

export interface EventSubscription {
  /** Subscription ID */
  id: string;
  /** Stream ID */
  streamId: string;
  /** Event filter */
  filter: EventFilter;
  /** Callback function */
  callback: (event: StreamEvent) => void;
  /** Active status */
  active: boolean;
  /** Events received */
  eventsReceived: number;
}

export interface EventTransformer {
  /** Transform event data */
  transform(event: StreamEvent): StreamEvent | null;
  /** Transformer name */
  name: string;
  /** Transformer priority */
  priority?: number;
}

export interface EventSerializer {
  /** Serialize event to string */
  serialize(event: StreamEvent): string;
  /** Deserialize string to event */
  deserialize(data: string): StreamEvent;
  /** Format type */
  format: 'json' | 'msgpack' | 'protobuf' | 'custom';
}