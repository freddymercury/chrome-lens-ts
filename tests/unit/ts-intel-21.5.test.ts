import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { StrategyToolHandler } from '../../src/intelligence/strategy-tool-handler.js';
import { StrategySuggestionRequest } from '../../src/types/intelligence.js';

describe('Strategy Tool Handler Integration', () => {
  let handler: StrategyToolHandler;
  let mockStateManager: any;
  let mockEventManager: any;

  beforeEach(() => {
    // Mock state manager
    mockStateManager = {
      getTab: jest.fn(),
      getGlobalMetrics: jest.fn().mockReturnValue({
        totalEvents: 100,
        errors: 5
      }),
      getSession: jest.fn()
    };

    // Mock event manager
    mockEventManager = {
      getEventBuffer: jest.fn().mockReturnValue([]),
      getStreamStatistics: jest.fn()
    };

    handler = new StrategyToolHandler(mockStateManager, mockEventManager);
  });

  test('handles suggest_debugging_strategy request', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'TypeError: Cannot read property "name" of undefined',
      strategyType: 'step-by-step',
      confidence: 0.7,
      maxSteps: 5
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(response.strategies).toBeDefined();
    expect(response.strategies!.length).toBeGreaterThan(0);
    expect(response.problemCategory).toBeDefined();
    expect(response.problemCategory!.type).toBe('runtime-error');
  });

  test('includes context when tabId provided', async () => {
    const tabId = 'A1B2C3D4E5F6789012345678901234567';
    mockStateManager.getTab.mockReturnValue({
      id: tabId,
      title: 'Test Page',
      url: 'https://example.com',
      monitoring: true,
      metrics: {
        consoleMessages: 10,
        networkRequests: 20,
        runtimeErrors: 2
      }
    });

    const request: StrategySuggestionRequest = {
      problemDescription: 'Page is loading slowly',
      tabId,
      includeHistory: true
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(mockStateManager.getTab).toHaveBeenCalledWith(tabId);
    expect(response.metadata?.contextUsed).toContain('tab-metrics');
  });

  test('returns multiple ranked strategies', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'Network request failing with CORS error',
      strategyType: 'targeted'
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(response.strategies!.length).toBeGreaterThanOrEqual(1);
    
    // Verify strategies are ranked (highest confidence first)
    const confidences = response.strategies!.map(s => s.confidence);
    expect(confidences).toEqual([...confidences].sort((a, b) => b - a));
  });

  test('respects maxSteps parameter', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'Complex performance issue',
      maxSteps: 3
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    response.strategies!.forEach(strategy => {
      expect(strategy.steps.length).toBeLessThanOrEqual(3);
    });
  });

  test('handles unknown problems gracefully', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'Something weird is happening'
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(response.problemCategory!.type).toBe('unknown');
    expect(response.strategies!.length).toBeGreaterThan(0);
    
    // Should provide general debugging strategy
    const strategy = response.strategies![0];
    expect(strategy.type).toBe('exploratory');
    expect(strategy.confidence).toBeLessThan(0.6);
  });

  test('enriches strategies with current context', async () => {
    const tabId = 'A1B2C3D4E5F6789012345678901234567';
    mockStateManager.getTab.mockReturnValue({
      id: tabId,
      monitoring: true,
      streams: ['stream-123']
    });

    mockEventManager.getEventBuffer.mockReturnValue([
      { type: 'console', data: { level: 'error', text: 'Test error' } },
      { type: 'network', data: { status: 404 } }
    ]);

    const request: StrategySuggestionRequest = {
      problemDescription: 'Debugging issue',
      tabId,
      includeHistory: true
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(response.metadata?.contextUsed).toContain('recent-events');
    
    // Strategy should be adjusted based on context
    const strategy = response.strategies![0];
    expect(strategy.steps.some(s => s.tool === 'get_console_messages')).toBe(true);
  });

  test('handles errors gracefully', async () => {
    mockStateManager.getTab.mockImplementation(() => {
      throw new Error('Database error');
    });

    const request: StrategySuggestionRequest = {
      problemDescription: 'Test problem',
      tabId: 'A1B2C3D4E5F6789012345678901234567'
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error!.message).toContain('Failed to generate strategy');
    expect(response.error!.hint).toBeDefined();
  });

  test('validates request parameters', async () => {
    const invalidRequests = [
      { problemDescription: '' }, // Empty description
      { problemDescription: 'Test', confidence: 1.5 }, // Invalid confidence
      { problemDescription: 'Test', maxSteps: 0 }, // Invalid maxSteps
      { problemDescription: 'Test', strategyType: 'invalid' as any } // Invalid type
    ];

    for (const request of invalidRequests) {
      const response = await handler.handleStrategyRequest(request as StrategySuggestionRequest);
      expect(response.success).toBe(false);
      expect(response.error?.type).toBe('INVALID_REQUEST');
    }
  });

  test('calculates analysis metadata', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'Performance bottleneck in render loop'
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    expect(response.metadata).toBeDefined();
    expect(response.metadata!.analysisTime).toBeGreaterThan(0);
    expect(response.metadata!.analysisTime).toBeLessThan(1000); // Should be fast
    expect(response.metadata!.confidence).toBeGreaterThan(0);
    expect(response.metadata!.confidence).toBeLessThanOrEqual(1);
  });

  test('generates appropriate tool parameters', async () => {
    const request: StrategySuggestionRequest = {
      problemDescription: 'CORS error on API endpoint /api/users',
      tabId: 'A1B2C3D4E5F6789012345678901234567'
    };

    const response = await handler.handleStrategyRequest(request);

    expect(response.success).toBe(true);
    
    const strategy = response.strategies![0];
    const networkStep = strategy.steps.find(s => s.tool === 'get_network_activity');
    
    expect(networkStep).toBeDefined();
    expect(networkStep!.parameters).toBeDefined();
    // Should include tabId in parameters
    expect(networkStep!.parameters!.tabId).toBe(request.tabId);
  });
});