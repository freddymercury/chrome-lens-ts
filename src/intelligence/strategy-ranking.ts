import { DebugStrategy, StrategyType, ProblemCategory } from '../types/intelligence.js';

/**
 * Configuration for strategy ranking weights
 */
export interface RankingWeights {
  confidenceWeight: number;
  complexityWeight: number;
  historyWeight: number;
}

/**
 * Success history entry
 */
interface SuccessHistoryEntry {
  problemType: ProblemCategory['type'];
  strategyType: StrategyType;
  successRate: number;
  timestamp: number;
}

/**
 * Strategy ranker with historical success tracking
 */
export class StrategyRanker {
  private weights: RankingWeights;
  private successHistory: SuccessHistoryEntry[] = [];
  
  constructor(weights?: Partial<RankingWeights>) {
    // Default weights must sum to 1.0
    this.weights = {
      confidenceWeight: weights?.confidenceWeight ?? 0.5,
      complexityWeight: weights?.complexityWeight ?? 0.3,
      historyWeight: weights?.historyWeight ?? 0.2
    };
    
    // Validate weights sum to 1.0
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new Error('Ranking weights must sum to 1.0');
    }
  }
  
  /**
   * Rank strategies by composite score
   */
  rank(strategies: DebugStrategy[]): DebugStrategy[] {
    if (strategies.length === 0) return [];
    
    // Calculate scores for each strategy
    const scoredStrategies = strategies.map(strategy => ({
      strategy,
      score: this.calculateScore(strategy)
    }));
    
    // Sort by score descending, then by estimated time ascending for ties
    return scoredStrategies
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) < 0.001) {
          // Tie breaker: prefer faster strategies
          return a.strategy.estimatedTime - b.strategy.estimatedTime;
        }
        return scoreDiff;
      })
      .map(item => item.strategy);
  }
  
  /**
   * Calculate composite score for a strategy
   */
  calculateScore(strategy: DebugStrategy): number {
    const confidenceScore = strategy.confidence * this.weights.confidenceWeight;
    
    // Complexity score (inverted - lower complexity is better)
    const complexityFactor = (10 - (strategy.complexity || 5)) / 10;
    const complexityScore = complexityFactor * this.weights.complexityWeight;
    
    // History score
    const historyScore = this.getHistoryScore(
      strategy.problemCategory.type,
      strategy.type
    ) * this.weights.historyWeight;
    
    return confidenceScore + complexityScore + historyScore;
  }
  
  /**
   * Get historical success score for problem/strategy combination
   */
  private getHistoryScore(problemType: ProblemCategory['type'], strategyType: StrategyType): number {
    const relevantHistory = this.successHistory.filter(
      entry => entry.problemType === problemType && entry.strategyType === strategyType
    );
    
    if (relevantHistory.length === 0) {
      // No history: neutral score
      return 0.5;
    }
    
    // Average success rate, with recent entries weighted more heavily
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    
    relevantHistory.forEach(entry => {
      // Exponential decay over 30 days
      const age = now - entry.timestamp;
      const weight = Math.exp(-age / (30 * 24 * 60 * 60 * 1000));
      
      weightedSum += entry.successRate * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }
  
  /**
   * Record a strategy execution result
   */
  recordSuccess(problemType: ProblemCategory['type'], strategyType: StrategyType, successRate: number): void {
    this.successHistory.push({
      problemType,
      strategyType,
      successRate: Math.max(0, Math.min(1, successRate)),
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.successHistory.length > 1000) {
      // Keep most recent 800 entries
      this.successHistory = this.successHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 800);
    }
  }
  
  /**
   * Get success history for analysis
   */
  getHistory(): ReadonlyArray<SuccessHistoryEntry> {
    return [...this.successHistory];
  }
  
  /**
   * Clear success history
   */
  clearHistory(): void {
    this.successHistory = [];
  }
}

/**
 * Convenience function for ranking strategies with default weights
 */
export function rankStrategies(strategies: DebugStrategy[]): DebugStrategy[] {
  const ranker = new StrategyRanker();
  return ranker.rank(strategies);
}