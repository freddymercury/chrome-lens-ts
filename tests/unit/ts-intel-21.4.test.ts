import { describe, test, expect } from '@jest/globals';
import { rankStrategies, StrategyRanker } from '../../src/intelligence/strategy-ranking.js';
import { DebugStrategy, ProblemCategory } from '../../src/types/intelligence.js';

describe('Strategy Ranking', () => {
  const createMockStrategy = (
    confidence: number, 
    steps: number = 3,
    name: string = 'Test Strategy'
  ): DebugStrategy => ({
    id: `strategy-${Math.random()}`,
    name,
    type: 'step-by-step',
    steps: Array(steps).fill(null).map((_, i) => ({
      id: `step-${i}`,
      name: `Step ${i}`,
      description: 'Test step',
      estimatedDuration: 30
    })),
    estimatedTime: steps * 30,
    confidence,
    problemCategory: {
      type: 'runtime-error',
      confidence: 0.8
    },
    complexity: Math.min(steps * 2, 10)
  });

  test('ranks by confidence score', () => {
    // Input: [strategy1(0.8), strategy2(0.6), strategy3(0.9)]
    const strategies = [
      createMockStrategy(0.8, 3, 'Strategy 1'),
      createMockStrategy(0.6, 3, 'Strategy 2'),
      createMockStrategy(0.9, 3, 'Strategy 3')
    ];
    
    const ranked = rankStrategies(strategies);
    
    // Output: [strategy3, strategy1, strategy2]
    expect(ranked[0].confidence).toBe(0.9);
    expect(ranked[0].name).toBe('Strategy 3');
    expect(ranked[1].confidence).toBe(0.8);
    expect(ranked[2].confidence).toBe(0.6);
  });
  
  test('considers complexity in ranking', () => {
    // Simpler strategies ranked higher for equal confidence
    const strategies = [
      createMockStrategy(0.8, 5, 'Complex Strategy'), // 5 steps
      createMockStrategy(0.8, 2, 'Simple Strategy'),  // 2 steps
      createMockStrategy(0.8, 3, 'Medium Strategy')   // 3 steps
    ];
    
    const ranked = rankStrategies(strategies);
    
    expect(ranked[0].name).toBe('Simple Strategy');
    expect(ranked[1].name).toBe('Medium Strategy');
    expect(ranked[2].name).toBe('Complex Strategy');
  });
  
  test('applies success history weighting', () => {
    // Strategies with better historical success get boost
    const ranker = new StrategyRanker();
    
    // Record some success history
    ranker.recordSuccess('runtime-error', 'step-by-step', 0.9);
    ranker.recordSuccess('runtime-error', 'step-by-step', 0.85);
    ranker.recordSuccess('runtime-error', 'exploratory', 0.6);
    ranker.recordSuccess('performance', 'exploratory', 0.95);
    
    const strategies = [
      { ...createMockStrategy(0.7), type: 'step-by-step' as const },
      { ...createMockStrategy(0.7), type: 'exploratory' as const }
    ];
    
    const ranked = ranker.rank(strategies);
    
    // Step-by-step should rank higher due to better history for runtime-error
    expect(ranked[0].type).toBe('step-by-step');
  });

  test('handles empty strategy list', () => {
    const ranked = rankStrategies([]);
    expect(ranked).toEqual([]);
  });

  test('preserves all strategies in ranking', () => {
    const strategies = [
      createMockStrategy(0.5),
      createMockStrategy(0.7),
      createMockStrategy(0.3),
      createMockStrategy(0.9),
      createMockStrategy(0.6)
    ];
    
    const ranked = rankStrategies(strategies);
    
    expect(ranked).toHaveLength(5);
    expect(new Set(ranked.map(s => s.id))).toEqual(new Set(strategies.map(s => s.id)));
  });

  test('calculates composite score correctly', () => {
    const ranker = new StrategyRanker();
    const strategy = createMockStrategy(0.8, 4); // confidence: 0.8, complexity: 8
    
    const score = ranker.calculateScore(strategy);
    
    // Score should be weighted combination
    // Default weights: confidence(0.5), complexity(0.3), history(0.2)
    // complexity factor = (10 - 8) / 10 = 0.2
    // no history = 0.5 (neutral)
    // score = 0.8 * 0.5 + 0.2 * 0.3 + 0.5 * 0.2 = 0.4 + 0.06 + 0.1 = 0.56
    expect(score).toBeCloseTo(0.56, 2);
  });

  test('respects custom ranking weights', () => {
    const ranker = new StrategyRanker({
      confidenceWeight: 0.8,
      complexityWeight: 0.1,
      historyWeight: 0.1
    });
    
    const highConfidence = createMockStrategy(0.9, 5);
    const lowConfidenceSimple = createMockStrategy(0.5, 1);
    
    const strategies = [highConfidence, lowConfidenceSimple];
    const ranked = ranker.rank(strategies);
    
    // With high confidence weight, high confidence should win despite complexity
    expect(ranked[0]).toBe(highConfidence);
  });

  test('factors in estimated time for equal scores', () => {
    const strategies = [
      { ...createMockStrategy(0.8, 3), estimatedTime: 180 }, // 3 minutes
      { ...createMockStrategy(0.8, 3), estimatedTime: 90 }   // 1.5 minutes
    ];
    
    const ranked = rankStrategies(strategies);
    
    // Faster strategy should rank higher
    expect(ranked[0].estimatedTime).toBe(90);
  });

  test('maintains deterministic ordering', () => {
    const strategies = Array(10).fill(null).map((_, i) => 
      createMockStrategy(0.5 + i * 0.05, 3)
    );
    
    const ranked1 = rankStrategies([...strategies]);
    const ranked2 = rankStrategies([...strategies]);
    
    // Should produce same order
    expect(ranked1.map(s => s.id)).toEqual(ranked2.map(s => s.id));
  });

  test('adapts ranking based on problem type', () => {
    const ranker = new StrategyRanker();
    
    // Record that exploratory works well for unknown problems
    ranker.recordSuccess('unknown', 'exploratory', 0.8);
    ranker.recordSuccess('unknown', 'exploratory', 0.85);
    ranker.recordSuccess('unknown', 'step-by-step', 0.4);
    
    const unknownProblem: ProblemCategory = {
      type: 'unknown',
      confidence: 0.3
    };
    
    const strategies = [
      { ...createMockStrategy(0.5), type: 'step-by-step' as const, problemCategory: unknownProblem },
      { ...createMockStrategy(0.5), type: 'exploratory' as const, problemCategory: unknownProblem }
    ];
    
    const ranked = ranker.rank(strategies);
    
    // Exploratory should rank higher for unknown problems
    expect(ranked[0].type).toBe('exploratory');
  });
});