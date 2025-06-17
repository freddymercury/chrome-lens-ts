import { randomBytes } from 'crypto';
import {
  ChromeLensState,
  TabState,
  StreamState,
  SessionState,
  GlobalMetrics,
  StateEvent,
  StateEventType,
  StateSnapshot,
  SerializedState,
  ErrorRecord,
  StateManagerConfig,
  StateChangeListener
} from '../types/state-management.js';

/**
 * StateManager - Centralized state management with event sourcing
 * Provides time travel, snapshots, and session management
 */
export class StateManager {
  private stateId: string;
  private state: ChromeLensState;
  private eventHistory: StateEvent[] = [];
  private snapshots: Map<string, StateSnapshot> = new Map();
  private config: StateManagerConfig;
  private changeListeners: Set<StateChangeListener> = new Set();
  private sessionEventCounts: Map<string, number> = new Map();

  constructor(config: StateManagerConfig = {}) {
    this.stateId = this.generateId();
    this.config = {
      enableEventSourcing: config.enableEventSourcing ?? true,
      maxEventHistory: config.maxEventHistory ?? 10000,
      enableAutoSnapshots: config.enableAutoSnapshots ?? false,
      autoSnapshotInterval: config.autoSnapshotInterval ?? 300000, // 5 minutes
      maxSnapshots: config.maxSnapshots ?? 10,
      enablePersistence: config.enablePersistence ?? false,
      ...(config.persistencePath ? { persistencePath: config.persistencePath } : {})
    };

    // Initialize empty state
    this.state = {
      tabs: new Map(),
      streams: new Map(),
      sessions: new Map(),
      globalMetrics: {
        totalEvents: 0,
        startTime: Date.now(),
        errors: 0
      }
    };

    // Start auto-snapshot if enabled
    if (this.config.enableAutoSnapshots) {
      this.startAutoSnapshot();
    }
  }

  /**
   * Get current state ID
   */
  getStateId(): string {
    return this.stateId;
  }

  /**
   * Get current state
   */
  getState(): ChromeLensState {
    return this.deepCloneState(this.state);
  }

  /**
   * Add a tab to state
   */
  addTab(tabId: string, tabInfo: TabState): void {
    const oldState = this.deepCloneState(this.state);
    this.state.tabs.set(tabId, { ...tabInfo });
    
    this.recordEvent({
      type: 'TAB_ADDED',
      data: { tabId, tabInfo }
    });

    this.notifyListeners('TAB_ADDED', oldState);
  }

  /**
   * Update tab state
   */
  updateTab(tabId: string, updates: Partial<TabState>): void {
    const tab = this.state.tabs.get(tabId);
    if (!tab) return;

    const oldState = this.deepCloneState(this.state);
    const updatedTab = { ...tab, ...updates };
    this.state.tabs.set(tabId, updatedTab);

    this.recordEvent({
      type: 'TAB_UPDATED',
      data: { tabId, updates }
    });

    this.notifyListeners('TAB_UPDATED', oldState);
  }

  /**
   * Remove tab from state
   */
  removeTab(tabId: string): boolean {
    if (!this.state.tabs.has(tabId)) return false;

    const oldState = this.deepCloneState(this.state);
    this.state.tabs.delete(tabId);

    this.recordEvent({
      type: 'TAB_REMOVED',
      data: { tabId }
    });

    this.notifyListeners('TAB_REMOVED', oldState);
    return true;
  }

  /**
   * Get tab by ID
   */
  getTab(tabId: string): TabState | undefined {
    const tab = this.state.tabs.get(tabId);
    return tab ? { ...tab } : undefined;
  }

  /**
   * Add a stream to state
   */
  addStream(streamId: string, streamInfo: StreamState): void {
    const oldState = this.deepCloneState(this.state);
    this.state.streams.set(streamId, { ...streamInfo });

    this.recordEvent({
      type: 'STREAM_STARTED',
      data: { streamId, streamInfo }
    });

    this.notifyListeners('STREAM_STARTED', oldState);
  }

  /**
   * Get stream by ID
   */
  getStream(streamId: string): StreamState | undefined {
    const stream = this.state.streams.get(streamId);
    return stream ? { ...stream } : undefined;
  }

  /**
   * Increment stream event count
   */
  incrementStreamEventCount(streamId: string, count: number = 1): void {
    const stream = this.state.streams.get(streamId);
    if (!stream) return;

    stream.eventCount += count;
    
    // Update without recording event to avoid event spam
    this.state.globalMetrics.totalEvents += count;
  }

  /**
   * Create a debugging session
   */
  createSession(sessionInfo: Omit<SessionState, 'id' | 'startTime' | 'active' | 'eventCount'>): string {
    const sessionId = this.generateId();
    const session: SessionState = {
      ...sessionInfo,
      id: sessionId,
      startTime: Date.now(),
      active: true,
      eventCount: 0
    };

    const oldState = this.deepCloneState(this.state);
    this.state.sessions.set(sessionId, session);
    this.sessionEventCounts.set(sessionId, this.eventHistory.length);

    this.recordEvent({
      type: 'SESSION_CREATED',
      data: { sessionId, session },
      sessionId
    });

    this.notifyListeners('SESSION_CREATED', oldState);
    return sessionId;
  }

  /**
   * End a session
   */
  endSession(sessionId: string): void {
    const session = this.state.sessions.get(sessionId);
    if (!session) return;

    const oldState = this.deepCloneState(this.state);
    const startEventCount = this.sessionEventCounts.get(sessionId) || 0;
    const eventCount = this.eventHistory.length - startEventCount;

    session.active = false;
    session.endTime = Date.now();
    session.eventCount = eventCount;

    this.recordEvent({
      type: 'SESSION_ENDED',
      data: { sessionId },
      sessionId
    });

    this.notifyListeners('SESSION_ENDED', oldState);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | undefined {
    const session = this.state.sessions.get(sessionId);
    return session ? { ...session } : undefined;
  }

  /**
   * Get event history
   */
  getEventHistory(): StateEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Replay events to reconstruct state
   */
  replayEvents(events: StateEvent[]): void {
    // Reset state
    this.state = {
      tabs: new Map(),
      streams: new Map(),
      sessions: new Map(),
      globalMetrics: {
        totalEvents: 0,
        startTime: Date.now(),
        errors: 0
      }
    };

    // Replay each event
    for (const event of events) {
      this.applyEvent(event);
    }
  }

  /**
   * Get state at specific time
   */
  getStateAtTime(timestamp: number): ChromeLensState {
    const eventsUpToTime = this.eventHistory.filter(e => e.timestamp <= timestamp);
    
    // Create temporary state manager
    const tempManager = new StateManager(this.config);
    tempManager.replayEvents(eventsUpToTime);
    
    return tempManager.getState();
  }

  /**
   * Create state snapshot
   */
  createSnapshot(name: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: this.generateId(),
      name,
      timestamp: Date.now(),
      state: this.serializeState()
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Maintain max snapshots limit
    if (this.snapshots.size > (this.config.maxSnapshots || 10)) {
      const oldestSnapshot = Array.from(this.snapshots.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.snapshots.delete(oldestSnapshot.id);
    }

    this.recordEvent({
      type: 'SNAPSHOT_CREATED',
      data: { snapshotId: snapshot.id, name }
    });

    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return;

    const oldState = this.deepCloneState(this.state);
    this.deserializeState(snapshot.state);

    this.recordEvent({
      type: 'SNAPSHOT_RESTORED',
      data: { snapshotId }
    });

    this.notifyListeners('SNAPSHOT_RESTORED', oldState);
  }

  /**
   * List available snapshots
   */
  listSnapshots(): StateSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics(): GlobalMetrics {
    return { ...this.state.globalMetrics };
  }

  /**
   * Record an error
   */
  recordError(error: ErrorRecord): void {
    const oldState = this.deepCloneState(this.state);
    this.state.globalMetrics.errors++;

    this.recordEvent({
      type: 'ERROR_RECORDED',
      data: { error }
    });

    this.notifyListeners('ERROR_RECORDED', oldState);
  }

  /**
   * Serialize state to JSON
   */
  serialize(): string {
    const serializedState = this.serializeState();
    const data = {
      stateId: this.stateId,
      tabs: serializedState.tabs,
      streams: serializedState.streams,
      sessions: serializedState.sessions,
      globalMetrics: serializedState.globalMetrics,
      eventHistory: this.eventHistory,
      snapshots: Array.from(this.snapshots.entries()),
      timestamp: Date.now()
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize state from JSON
   */
  deserialize(json: string): void {
    const data = JSON.parse(json);
    this.stateId = data.stateId;
    
    // Handle both old format (data.state) and new format (direct properties)
    const stateData = data.state || {
      tabs: data.tabs,
      streams: data.streams,
      sessions: data.sessions,
      globalMetrics: data.globalMetrics,
      version: '1.0'
    };
    
    this.deserializeState(stateData);
    this.eventHistory = data.eventHistory || [];
    this.snapshots = new Map(data.snapshots || []);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Deep clone state
   */
  private deepCloneState(state: ChromeLensState): ChromeLensState {
    return {
      tabs: new Map(state.tabs),
      streams: new Map(state.streams),
      sessions: new Map(state.sessions),
      globalMetrics: { ...state.globalMetrics }
    };
  }

  /**
   * Record state event
   */
  private recordEvent(eventData: Omit<StateEvent, 'id' | 'timestamp'>): void {
    if (!this.config.enableEventSourcing) return;

    const event: StateEvent = {
      ...eventData,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.eventHistory.push(event);
    this.state.globalMetrics.totalEvents++;

    // Maintain max event history
    if (this.eventHistory.length > (this.config.maxEventHistory || 10000)) {
      this.eventHistory.shift();
    }
  }

  /**
   * Apply event to state
   */
  private applyEvent(event: StateEvent): void {
    switch (event.type) {
      case 'TAB_ADDED':
        this.state.tabs.set(event.data.tabId, event.data.tabInfo);
        break;
      case 'TAB_UPDATED':
        const tab = this.state.tabs.get(event.data.tabId);
        if (tab) {
          this.state.tabs.set(event.data.tabId, { ...tab, ...event.data.updates });
        }
        break;
      case 'TAB_REMOVED':
        this.state.tabs.delete(event.data.tabId);
        break;
      case 'STREAM_STARTED':
        this.state.streams.set(event.data.streamId, event.data.streamInfo);
        break;
      case 'SESSION_CREATED':
        this.state.sessions.set(event.data.sessionId, event.data.session);
        break;
      case 'SESSION_ENDED':
        const session = this.state.sessions.get(event.data.sessionId);
        if (session) {
          session.active = false;
          session.endTime = event.timestamp;
        }
        break;
      case 'ERROR_RECORDED':
        this.state.globalMetrics.errors++;
        break;
    }
  }

  /**
   * Serialize state for snapshot
   */
  private serializeState(): SerializedState {
    return {
      tabs: Array.from(this.state.tabs.entries()),
      streams: Array.from(this.state.streams.entries()),
      sessions: Array.from(this.state.sessions.entries()),
      globalMetrics: this.state.globalMetrics,
      version: '1.0'
    };
  }

  /**
   * Deserialize state from snapshot
   */
  private deserializeState(serialized: SerializedState): void {
    this.state = {
      tabs: new Map(serialized.tabs),
      streams: new Map(serialized.streams),
      sessions: new Map(serialized.sessions),
      globalMetrics: serialized.globalMetrics
    };
  }

  /**
   * Notify change listeners
   */
  private notifyListeners(_eventType: StateEventType, oldState: ChromeLensState): void {
    const event = this.eventHistory[this.eventHistory.length - 1];
    for (const listener of this.changeListeners) {
      listener(event, this.state, oldState);
    }
  }

  /**
   * Start auto-snapshot timer
   */
  private startAutoSnapshot(): void {
    setInterval(() => {
      this.createSnapshot(`auto-${Date.now()}`);
    }, this.config.autoSnapshotInterval);
  }

  /**
   * Add state change listener
   */
  addChangeListener(listener: StateChangeListener): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove state change listener
   */
  removeChangeListener(listener: StateChangeListener): void {
    this.changeListeners.delete(listener);
  }
}