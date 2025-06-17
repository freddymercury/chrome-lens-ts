/**
 * State Management Types for Chrome Lens v1.2
 * Centralized state with event sourcing and time travel capabilities
 */

import { EventType } from './event-system.js';

/**
 * Core state structure for Chrome Lens
 */
export interface ChromeLensState {
  /** Active tabs being monitored */
  tabs: Map<string, TabState>;
  /** Active event streams */
  streams: Map<string, StreamState>;
  /** Debugging sessions */
  sessions: Map<string, SessionState>;
  /** Global metrics */
  globalMetrics: GlobalMetrics;
}

/**
 * Tab state information
 */
export interface TabState {
  /** Tab ID (32-character hex) */
  id: string;
  /** Tab title */
  title: string;
  /** Tab URL */
  url: string;
  /** Connection status */
  connected: boolean;
  /** Monitoring status */
  monitoring: boolean;
  /** Connection timestamp */
  connectedAt?: number;
  /** Last activity timestamp */
  lastActivity?: number;
  /** Associated streams */
  streams?: string[];
  /** Active breakpoints */
  breakpoints?: string[];
  /** Tab-specific metrics */
  metrics?: TabMetrics;
}

/**
 * Stream state information
 */
export interface StreamState {
  /** Stream ID */
  id: string;
  /** Associated tab ID */
  tabId: string;
  /** Event types being monitored */
  eventTypes: EventType[];
  /** Stream active status */
  active: boolean;
  /** Total events captured */
  eventCount: number;
  /** Stream start time */
  startTime?: number;
  /** Stream end time */
  endTime?: number;
  /** Stream configuration */
  config?: Record<string, any>;
}

/**
 * Session state information
 */
export interface SessionState {
  /** Session ID */
  id: string;
  /** Session name */
  name: string;
  /** Session description */
  description?: string;
  /** Session start time */
  startTime: number;
  /** Session end time */
  endTime?: number;
  /** Session active status */
  active: boolean;
  /** Associated tabs */
  tabs: string[];
  /** Event count during session */
  eventCount?: number;
  /** Session metadata */
  metadata?: Record<string, any>;
}

/**
 * Global metrics
 */
export interface GlobalMetrics {
  /** Total events processed */
  totalEvents: number;
  /** System start time */
  startTime: number;
  /** Total errors encountered */
  errors: number;
  /** Memory usage */
  memoryUsage?: MemoryUsage;
  /** Performance metrics */
  performance?: PerformanceMetrics;
}

/**
 * Tab-specific metrics
 */
export interface TabMetrics {
  /** Console messages count */
  consoleMessages: number;
  /** Network requests count */
  networkRequests: number;
  /** Runtime errors count */
  runtimeErrors: number;
  /** DOM mutations count */
  domMutations: number;
  /** Performance score */
  performanceScore?: number;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  /** Heap used in bytes */
  heapUsed: number;
  /** Heap total in bytes */
  heapTotal: number;
  /** External memory in bytes */
  external: number;
  /** Timestamp of measurement */
  timestamp: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Average event processing time */
  avgEventProcessingTime: number;
  /** Peak event rate per second */
  peakEventRate: number;
  /** Current event rate per second */
  currentEventRate: number;
  /** Queue depth */
  queueDepth: number;
}

/**
 * State event for event sourcing
 */
export interface StateEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: StateEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data: any;
  /** Session ID if applicable */
  sessionId?: string;
  /** User who triggered the event */
  userId?: string;
}

/**
 * Types of state events
 */
export type StateEventType =
  | 'TAB_ADDED'
  | 'TAB_UPDATED'
  | 'TAB_REMOVED'
  | 'STREAM_STARTED'
  | 'STREAM_STOPPED'
  | 'STREAM_UPDATED'
  | 'SESSION_CREATED'
  | 'SESSION_ENDED'
  | 'SESSION_UPDATED'
  | 'SNAPSHOT_CREATED'
  | 'SNAPSHOT_RESTORED'
  | 'ERROR_RECORDED'
  | 'METRICS_UPDATED'
  | 'STATE_RESET';

/**
 * State snapshot for persistence
 */
export interface StateSnapshot {
  /** Snapshot ID */
  id: string;
  /** Snapshot name */
  name: string;
  /** Creation timestamp */
  timestamp: number;
  /** Serialized state */
  state: SerializedState;
  /** Snapshot metadata */
  metadata?: SnapshotMetadata;
}

/**
 * Serialized state format
 */
export interface SerializedState {
  /** Serialized tabs */
  tabs: Array<[string, TabState]>;
  /** Serialized streams */
  streams: Array<[string, StreamState]>;
  /** Serialized sessions */
  sessions: Array<[string, SessionState]>;
  /** Global metrics */
  globalMetrics: GlobalMetrics;
  /** State version */
  version: string;
}

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  /** Creator of snapshot */
  createdBy?: string;
  /** Reason for snapshot */
  reason?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Size in bytes */
  sizeBytes?: number;
}

/**
 * Error record
 */
export interface ErrorRecord {
  /** Error type */
  type: string;
  /** Error message */
  message: string;
  /** Error timestamp */
  timestamp: number;
  /** Stack trace */
  stack?: string;
  /** Associated tab ID */
  tabId?: string;
  /** Associated stream ID */
  streamId?: string;
  /** Error context */
  context?: Record<string, any>;
}

/**
 * State manager configuration
 */
export interface StateManagerConfig {
  /** Enable event sourcing */
  enableEventSourcing?: boolean;
  /** Maximum event history size */
  maxEventHistory?: number;
  /** Enable auto snapshots */
  enableAutoSnapshots?: boolean;
  /** Auto snapshot interval in ms */
  autoSnapshotInterval?: number;
  /** Maximum snapshots to keep */
  maxSnapshots?: number;
  /** Enable state persistence */
  enablePersistence?: boolean;
  /** Persistence path */
  persistencePath?: string;
}

/**
 * State query options
 */
export interface StateQueryOptions {
  /** Include inactive items */
  includeInactive?: boolean;
  /** Filter by time range */
  timeRange?: {
    start: number;
    end: number;
  };
  /** Filter by session */
  sessionId?: string;
  /** Sort order */
  sortBy?: 'timestamp' | 'name' | 'eventCount';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * State change listener
 */
export interface StateChangeListener {
  /** Called when state changes */
  (event: StateEvent, newState: ChromeLensState, oldState: ChromeLensState): void;
}