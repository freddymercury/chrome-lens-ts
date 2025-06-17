import * as dotenv from 'dotenv';
import { jest } from '@jest/globals';

// Load test environment
dotenv.config();

// Set environment variables before importing server
process.env.CHROME_DEBUG_PORT = '9222';
process.env.CHROME_DEBUG_HOST = 'localhost';
process.env.DEBUGGER_ENABLED = 'true';
process.env.STEP_TIMEOUT = '5000';

import ChromeDevToolsMCPServer from '../../server';

describe('Task 17.4: Step Debugging Engine', () => {
  let server: ChromeDevToolsMCPServer;
  let mockClient: any;

  beforeEach(() => {
    server = new ChromeDevToolsMCPServer();
    server.setupToolHandlers();
    
    // Create a mock Chrome client
    mockClient = {
      send: jest.fn(),
      Debugger: {
        enable: jest.fn(() => Promise.resolve({})),
        pause: jest.fn(() => Promise.resolve({})),
        resume: jest.fn(() => Promise.resolve({})),
        stepOver: jest.fn(() => Promise.resolve({})),
        stepInto: jest.fn(() => Promise.resolve({})),
        stepOut: jest.fn(() => Promise.resolve({})),
        setPauseOnExceptions: jest.fn(() => Promise.resolve({}))
      },
      Runtime: {
        enable: jest.fn(() => Promise.resolve({})),
        evaluate: jest.fn()
      }
    };
    
    // Store mock client
    server.addStorageEntry('clients', 'ABCDEF0123456789ABCDEF0123456789', mockClient);
  });

  afterEach(() => {
    server.clearStorage();
    jest.clearAllMocks();
  });

  test('should pause execution using Debugger.pause', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'pause'
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.pause).toHaveBeenCalled();
    expect(result.stepControl.action).toBe('pause');
  });

  test('should resume execution using Debugger.resume', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'resume'
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.resume).toHaveBeenCalled();
    expect(result.stepControl.action).toBe('resume');
  });

  test('should step over using Debugger.stepOver', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-123';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'stepOver',
      callFrameId
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.stepOver).toHaveBeenCalled();
    expect(result.stepControl.action).toBe('stepOver');
  });

  test('should step into using Debugger.stepInto', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-456';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'stepInto',
      callFrameId
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.stepInto).toHaveBeenCalled();
    expect(result.stepControl.action).toBe('stepInto');
  });

  test('should step out using Debugger.stepOut', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-789';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'stepOut',
      callFrameId
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.stepOut).toHaveBeenCalled();
    expect(result.stepControl.action).toBe('stepOut');
  });

  test('should require callFrameId for step actions', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Test stepOver without callFrameId
    const stepOverResult = await server.debugStepControl({
      tabId,
      action: 'stepOver'
    });
    
    expect(stepOverResult.success).toBe(false);
    expect(stepOverResult.error).toContain('callFrameId required');
    
    // Test stepInto without callFrameId
    const stepIntoResult = await server.debugStepControl({
      tabId,
      action: 'stepInto'
    });
    
    expect(stepIntoResult.success).toBe(false);
    expect(stepIntoResult.error).toContain('callFrameId required');
    
    // Test stepOut without callFrameId
    const stepOutResult = await server.debugStepControl({
      tabId,
      action: 'stepOut'
    });
    
    expect(stepOutResult.success).toBe(false);
    expect(stepOutResult.error).toContain('callFrameId required');
  });

  test('should handle debugger state tracking', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Pause should set state
    await server.debugStepControl({
      tabId,
      action: 'pause'
    });
    
    const debugState = server.getDebuggerState(tabId);
    expect(debugState.isPaused).toBe(true);
    
    // Resume should clear state
    await server.debugStepControl({
      tabId,
      action: 'resume'
    });
    
    const resumedState = server.getDebuggerState(tabId);
    expect(resumedState.isPaused).toBe(false);
  });

  test('should handle pause timeout', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Mock pause that times out
    mockClient.Debugger.pause.mockRejectedValue(new Error('Timeout'));
    
    const result = await server.debugStepControl({
      tabId,
      action: 'pause'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  });

  test('should validate tab connection before debugging', async () => {
    const tabId = 'FEDCBA9876543210FEDCBA9876543210';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'pause'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tab not connected');
  });

  test('should handle step operation failures gracefully', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-error';
    
    // Mock step failure
    mockClient.Debugger.stepInto.mockRejectedValue(
      new Error('Cannot step - not at breakpoint')
    );
    
    const result = await server.debugStepControl({
      tabId,
      action: 'stepInto',
      callFrameId
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot step');
  });

  test('should track call stack depth during stepping', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-depth';
    
    // Mock paused event with call frames
    const pausedEvent = {
      callFrames: [
        { callFrameId: 'frame-0', functionName: 'main' },
        { callFrameId: 'frame-1', functionName: 'helper' },
        { callFrameId: 'frame-2', functionName: 'deepFunction' }
      ],
      reason: 'other'
    };
    
    // Store paused state
    server.updateDebuggerState(tabId, pausedEvent);
    
    const result = await server.debugStepControl({
      tabId,
      action: 'stepOut',
      callFrameId
    });
    
    expect(result.success).toBe(true);
    expect(result.stepControl.callStackDepth).toBe(3);
  });

  test('should validate action parameter', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    const result = await server.debugStepControl({
      tabId,
      action: 'invalidAction'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid action');
  });

  test('should handle concurrent step operations', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    const callFrameId = 'frame-concurrent';
    
    // Start first step operation
    const step1Promise = server.debugStepControl({
      tabId,
      action: 'stepOver',
      callFrameId
    });
    
    // Try concurrent operation - should fail
    const step2Promise = server.debugStepControl({
      tabId,
      action: 'stepInto',
      callFrameId
    });
    
    const [step1Result, step2Result] = await Promise.all([step1Promise, step2Promise]);
    
    // One should succeed, one should fail with "operation in progress"
    const results = [step1Result, step2Result];
    const successCount = results.filter(r => r.success).length;
    const inProgressError = results.find(r => r.error?.includes('in progress'));
    
    expect(successCount).toBe(1);
    expect(inProgressError).toBeDefined();
  });

  test('should support exception pause modes', async () => {
    const tabId = 'ABCDEF0123456789ABCDEF0123456789';
    
    // Test setting pause on exceptions
    const result = await server.debugStepControl({
      tabId,
      action: 'pause',
      pauseOnExceptions: 'all'
    });
    
    expect(result.success).toBe(true);
    expect(mockClient.Debugger.setPauseOnExceptions).toHaveBeenCalledWith({
      state: 'all'
    });
  });
});