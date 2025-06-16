import { describe, test, expect, beforeEach } from '@jest/globals';
import { StateManager } from '../../src/state-management/state-manager.js';
import { EventType } from '../../src/types/event-system.js';

describe('State Management Layer - StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('State initialization', () => {
    test('should initialize with empty state', () => {
      const state = stateManager.getState();
      expect(state).toEqual({
        tabs: new Map(),
        streams: new Map(),
        sessions: new Map(),
        globalMetrics: {
          totalEvents: 0,
          startTime: expect.any(Number),
          errors: 0
        }
      });
    });

    test('should generate unique state ID', () => {
      const id1 = stateManager.getStateId();
      const id2 = new StateManager().getStateId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Tab state management', () => {
    test('should add tab to state', () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      const tabInfo = {
        id: tabId,
        title: 'Test Page',
        url: 'https://example.com',
        connected: true,
        monitoring: false
      };

      stateManager.addTab(tabId, tabInfo);
      const state = stateManager.getState();
      
      expect(state.tabs.has(tabId)).toBe(true);
      expect(state.tabs.get(tabId)).toEqual(tabInfo);
    });

    test('should update tab state', () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      stateManager.addTab(tabId, { 
        id: tabId, 
        title: 'Old Title', 
        url: 'https://old.com',
        connected: true,
        monitoring: false
      });

      stateManager.updateTab(tabId, { 
        title: 'New Title', 
        monitoring: true 
      });

      const tab = stateManager.getTab(tabId);
      expect(tab?.title).toBe('New Title');
      expect(tab?.monitoring).toBe(true);
      expect(tab?.url).toBe('https://old.com'); // Unchanged
    });

    test('should remove tab from state', () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      stateManager.addTab(tabId, { 
        id: tabId, 
        title: 'Test', 
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const removed = stateManager.removeTab(tabId);
      expect(removed).toBe(true);
      expect(stateManager.getTab(tabId)).toBeUndefined();
    });
  });

  describe('Event sourcing', () => {
    test('should record state events', () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      stateManager.addTab(tabId, { 
        id: tabId, 
        title: 'Test', 
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const events = stateManager.getEventHistory();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'TAB_ADDED',
        timestamp: expect.any(Number),
        data: { tabId }
      });
    });

    test('should replay events to reconstruct state', () => {
      // Create initial state with some actions
      const tabId1 = 'A1B2C3D4E5F6789012345678901234567';
      const tabId2 = 'B1B2C3D4E5F6789012345678901234567';
      
      stateManager.addTab(tabId1, { 
        id: tabId1, 
        title: 'Tab 1', 
        url: 'https://tab1.com',
        connected: true,
        monitoring: false
      });
      stateManager.addTab(tabId2, { 
        id: tabId2, 
        title: 'Tab 2', 
        url: 'https://tab2.com',
        connected: true,
        monitoring: false
      });
      stateManager.updateTab(tabId1, { monitoring: true });
      stateManager.removeTab(tabId2);

      // Get event history
      const events = stateManager.getEventHistory();

      // Create new state manager and replay events
      const newStateManager = new StateManager();
      newStateManager.replayEvents(events);

      // Verify state matches
      const newState = newStateManager.getState();
      expect(newState.tabs.size).toBe(1);
      expect(newState.tabs.has(tabId1)).toBe(true);
      expect(newState.tabs.get(tabId1)?.monitoring).toBe(true);
      expect(newState.tabs.has(tabId2)).toBe(false);
    });

    test('should support time travel to previous states', async () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      
      // Record timestamps for time travel
      stateManager.addTab(tabId, { 
        id: tabId, 
        title: 'Original', 
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });
      
      const events1 = stateManager.getEventHistory();
      const t1 = events1[events1.length - 1].timestamp;

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      stateManager.updateTab(tabId, { title: 'Updated' });
      
      const events2 = stateManager.getEventHistory();
      const t2 = events2[events2.length - 1].timestamp;

      await new Promise(resolve => setTimeout(resolve, 10));
      stateManager.updateTab(tabId, { monitoring: true });
      
      const events3 = stateManager.getEventHistory();
      const t3 = events3[events3.length - 1].timestamp;

      // Travel to different points in time
      const stateAtT1 = stateManager.getStateAtTime(t1);
      expect(stateAtT1.tabs.get(tabId)?.title).toBe('Original');
      expect(stateAtT1.tabs.get(tabId)?.monitoring).toBe(false);

      const stateAtT2 = stateManager.getStateAtTime(t2);
      expect(stateAtT2.tabs.get(tabId)?.title).toBe('Updated');
      expect(stateAtT2.tabs.get(tabId)?.monitoring).toBe(false);

      const stateAtT3 = stateManager.getStateAtTime(t3);
      expect(stateAtT3.tabs.get(tabId)?.title).toBe('Updated');
      expect(stateAtT3.tabs.get(tabId)?.monitoring).toBe(true);
    });
  });

  describe('State snapshots', () => {
    test('should create state snapshot', () => {
      const tabId = 'A1B2C3D4E5F6789012345678901234567';
      stateManager.addTab(tabId, { 
        id: tabId, 
        title: 'Test', 
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const snapshot = stateManager.createSnapshot('test-snapshot');
      expect(snapshot).toMatchObject({
        id: expect.any(String),
        name: 'test-snapshot',
        timestamp: expect.any(Number),
        state: expect.any(Object)
      });
      expect(snapshot.state.tabs).toHaveLength(1);
    });

    test('should restore from snapshot', () => {
      const tabId1 = 'A1B2C3D4E5F6789012345678901234567';
      const tabId2 = 'B1B2C3D4E5F6789012345678901234567';
      
      // Create initial state
      stateManager.addTab(tabId1, { 
        id: tabId1, 
        title: 'Tab 1', 
        url: 'https://tab1.com',
        connected: true,
        monitoring: false
      });
      
      // Create snapshot
      const snapshot = stateManager.createSnapshot('checkpoint');
      
      // Modify state after snapshot
      stateManager.addTab(tabId2, { 
        id: tabId2, 
        title: 'Tab 2', 
        url: 'https://tab2.com',
        connected: true,
        monitoring: false
      });
      stateManager.updateTab(tabId1, { title: 'Modified' });
      
      // Verify current state has changes
      expect(stateManager.getState().tabs.size).toBe(2);
      expect(stateManager.getTab(tabId1)?.title).toBe('Modified');
      
      // Restore from snapshot
      stateManager.restoreSnapshot(snapshot.id);
      
      // Verify state is restored
      expect(stateManager.getState().tabs.size).toBe(1);
      expect(stateManager.getTab(tabId1)?.title).toBe('Tab 1');
      expect(stateManager.getTab(tabId2)).toBeUndefined();
    });

    test('should list available snapshots', () => {
      stateManager.createSnapshot('snapshot1');
      stateManager.createSnapshot('snapshot2');
      stateManager.createSnapshot('snapshot3');

      const snapshots = stateManager.listSnapshots();
      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].name).toBe('snapshot1');
      expect(snapshots[1].name).toBe('snapshot2');
      expect(snapshots[2].name).toBe('snapshot3');
    });
  });

  describe('Stream state management', () => {
    test('should track stream state', () => {
      const streamId = 'stream-123';
      const streamInfo = {
        id: streamId,
        tabId: 'A1B2C3D4E5F6789012345678901234567',
        eventTypes: ['console', 'network'] as EventType[],
        active: true,
        eventCount: 0
      };

      stateManager.addStream(streamId, streamInfo);
      const stream = stateManager.getStream(streamId);
      
      expect(stream).toEqual(streamInfo);
    });

    test('should update stream event count', () => {
      const streamId = 'stream-123';
      stateManager.addStream(streamId, {
        id: streamId,
        tabId: 'A1B2C3D4E5F6789012345678901234567',
        eventTypes: ['console'] as EventType[],
        active: true,
        eventCount: 0
      });

      stateManager.incrementStreamEventCount(streamId, 5);
      expect(stateManager.getStream(streamId)?.eventCount).toBe(5);

      stateManager.incrementStreamEventCount(streamId, 3);
      expect(stateManager.getStream(streamId)?.eventCount).toBe(8);
    });
  });

  describe('Session management', () => {
    test('should create debugging session', () => {
      const sessionId = stateManager.createSession({
        name: 'Debug Session 1',
        description: 'Testing null pointer exception',
        tabs: ['A1B2C3D4E5F6789012345678901234567']
      });

      expect(sessionId).toBeTruthy();
      const session = stateManager.getSession(sessionId);
      expect(session).toMatchObject({
        id: sessionId,
        name: 'Debug Session 1',
        description: 'Testing null pointer exception',
        startTime: expect.any(Number),
        active: true
      });
    });

    test('should end session and preserve history', () => {
      const sessionId = stateManager.createSession({
        name: 'Debug Session',
        tabs: []
      });

      // Add some events during session
      stateManager.addTab('A1B2C3D4E5F6789012345678901234567', {
        id: 'A1B2C3D4E5F6789012345678901234567',
        title: 'Test',
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const endTime = Date.now();
      stateManager.endSession(sessionId);

      const session = stateManager.getSession(sessionId);
      expect(session?.active).toBe(false);
      expect(session?.endTime).toBeGreaterThanOrEqual(endTime);
      expect(session?.eventCount).toBeGreaterThan(0);
    });
  });

  describe('Global metrics', () => {
    test('should track global event count', () => {
      const initial = stateManager.getGlobalMetrics().totalEvents;
      
      stateManager.addTab('A1B2C3D4E5F6789012345678901234567', {
        id: 'A1B2C3D4E5F6789012345678901234567',
        title: 'Test',
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const metrics = stateManager.getGlobalMetrics();
      expect(metrics.totalEvents).toBe(initial + 1);
    });

    test('should track error count', () => {
      const initial = stateManager.getGlobalMetrics().errors;
      
      stateManager.recordError({
        type: 'CONNECTION_ERROR',
        message: 'Failed to connect to tab',
        timestamp: Date.now()
      });

      const metrics = stateManager.getGlobalMetrics();
      expect(metrics.errors).toBe(initial + 1);
    });
  });

  describe('State persistence', () => {
    test('should serialize state to JSON', () => {
      stateManager.addTab('A1B2C3D4E5F6789012345678901234567', {
        id: 'A1B2C3D4E5F6789012345678901234567',
        title: 'Test',
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });

      const serialized = stateManager.serialize();
      expect(serialized).toBeTruthy();
      
      const parsed = JSON.parse(serialized);
      expect(parsed.stateId).toBe(stateManager.getStateId());
      expect(parsed.tabs).toHaveLength(1);
      expect(parsed.eventHistory).toHaveLength(1);
    });

    test('should deserialize state from JSON', () => {
      // Create initial state
      const originalManager = new StateManager();
      originalManager.addTab('A1B2C3D4E5F6789012345678901234567', {
        id: 'A1B2C3D4E5F6789012345678901234567',
        title: 'Test',
        url: 'https://test.com',
        connected: true,
        monitoring: false
      });
      originalManager.createSnapshot('test-snapshot');

      const serialized = originalManager.serialize();

      // Create new manager and deserialize
      const newManager = new StateManager();
      newManager.deserialize(serialized);

      // Verify state matches
      expect(newManager.getStateId()).toBe(originalManager.getStateId());
      expect(newManager.getState().tabs.size).toBe(1);
      expect(newManager.getTab('A1B2C3D4E5F6789012345678901234567')?.title).toBe('Test');
      expect(newManager.listSnapshots()).toHaveLength(1);
    });
  });
});