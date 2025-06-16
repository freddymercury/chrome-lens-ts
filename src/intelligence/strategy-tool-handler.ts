import {
  StrategySuggestionRequest,
  StrategySuggestionResponse,
  DebugStrategy,
  StrategyType
} from '../types/intelligence.js';
import { StateManager } from '../state-management/state-manager.js';
import { EventStreamManager } from '../event-system/event-stream-manager.js';
import { categorizeProblem } from './problem-categorization.js';
import { generateStrategy } from './strategy-template-engine.js';
import { StrategyRanker } from './strategy-ranking.js';
import { ClaudeAnalysisService } from './claude-analysis.js';

/**
 * Handler for the suggest_debugging_strategy tool
 * Integrates all intelligence components to provide debugging strategies
 */
export class StrategyToolHandler {
  private stateManager: StateManager;
  private eventManager: EventStreamManager;
  private strategyRanker: StrategyRanker;
  private claudeService: ClaudeAnalysisService;

  constructor(stateManager: StateManager, eventManager: EventStreamManager) {
    this.stateManager = stateManager;
    this.eventManager = eventManager;
    this.strategyRanker = new StrategyRanker();
    
    // Initialize Claude service
    this.claudeService = new ClaudeAnalysisService({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      ...(process.env.CLAUDE_MODEL && { model: process.env.CLAUDE_MODEL }),
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '1000', 10),
      enabled: process.env.CLAUDE_ANALYSIS_ENABLED === 'true'
    });
  }

  /**
   * Handle strategy suggestion request
   */
  async handleStrategyRequest(request: StrategySuggestionRequest): Promise<StrategySuggestionResponse> {
    const startTime = Date.now();
    
    try {
      // Validate request
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            type: 'INVALID_REQUEST',
            message: validation.error!,
            hint: 'Check request parameters and try again'
          }
        };
      }

      // Categorize the problem
      let problemCategory = categorizeProblem(request.problemDescription);
      
      // Enhance with Claude if available
      if (this.claudeService.isAvailable()) {
        console.log('🤖 Enhancing with Claude analysis...');
        problemCategory = await this.claudeService.enhanceProblemCategorization(
          request.problemDescription,
          problemCategory
        );
      }

      // Get context if tabId provided
      let context = null;
      if (request.tabId) {
        try {
          context = this.getTabContext(request.tabId);
        } catch (error) {
          // If tabId is provided but context fails, it's an error
          throw new Error(`Failed to get tab context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate multiple strategies
      let strategies = this.generateStrategies(
        problemCategory,
        request.strategyType,
        request.maxSteps || 10,
        context
      );
      
      // Add Claude-generated strategy if available
      if (this.claudeService.isAvailable()) {
        const claudeStrategy = await this.claudeService.generateAdvancedStrategy(
          request.problemDescription,
          problemCategory,
          context
        );
        if (claudeStrategy) {
          console.log('🤖 Added Claude-generated strategy');
          strategies = [claudeStrategy, ...strategies];
        }
      }

      // Filter by confidence threshold
      const filteredStrategies = strategies.filter(
        s => s.confidence >= (request.confidence || 0.0)
      );

      // Rank strategies
      const rankedStrategies = this.strategyRanker.rank(filteredStrategies);

      // Enrich strategies with context-specific parameters
      const enrichedStrategies = request.tabId 
        ? this.enrichStrategiesWithContext(rankedStrategies, request.tabId, context)
        : rankedStrategies;

      // Calculate metadata
      const analysisTime = Math.max(1, Date.now() - startTime);
      const contextUsed = this.getContextUsed(request, context);
      const overallConfidence = this.calculateOverallConfidence(problemCategory, enrichedStrategies);

      return {
        success: true,
        strategies: enrichedStrategies,
        problemCategory,
        metadata: {
          analysisTime,
          contextUsed,
          confidence: overallConfidence
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STRATEGY_GENERATION_ERROR',
          message: `Failed to generate strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
          hint: 'Try simplifying the problem description or check system logs'
        }
      };
    }
  }

  /**
   * Validate request parameters
   */
  private validateRequest(request: StrategySuggestionRequest): { valid: boolean; error?: string } {
    if (!request.problemDescription || request.problemDescription.trim().length === 0) {
      return { valid: false, error: 'Problem description is required' };
    }

    if (request.confidence !== undefined && (request.confidence < 0 || request.confidence > 1)) {
      return { valid: false, error: 'Confidence must be between 0 and 1' };
    }

    if (request.maxSteps !== undefined && (request.maxSteps < 1 || request.maxSteps > 10)) {
      return { valid: false, error: 'Max steps must be between 1 and 10' };
    }

    if (request.strategyType && !['step-by-step', 'exploratory', 'targeted'].includes(request.strategyType)) {
      return { valid: false, error: 'Invalid strategy type' };
    }

    return { valid: true };
  }

  /**
   * Get context for a specific tab
   */
  private getTabContext(tabId: string): any {
    try {
      const tab = this.stateManager.getTab(tabId);
      if (!tab) return null;

      const context: any = {
        tab,
        metrics: this.stateManager.getGlobalMetrics()
      };

      // Get recent events if monitoring
      if (tab.monitoring) {
        const recentEvents = this.eventManager.getEventBuffer().slice(-20);
        context.recentEvents = recentEvents;
      }

      return context;
    } catch (error) {
      // Re-throw to let caller handle
      throw error;
    }
  }

  /**
   * Generate multiple strategy variations
   */
  private generateStrategies(
    problemCategory: any,
    preferredType?: StrategyType,
    maxSteps: number = 10,
    context?: any
  ): DebugStrategy[] {
    const strategies: DebugStrategy[] = [];

    // Generate primary strategy
    const primaryStrategy = generateStrategy(problemCategory, maxSteps);
    strategies.push(primaryStrategy);

    // Generate alternative strategies if no preferred type
    if (!preferredType || preferredType !== primaryStrategy.type) {
      // Try different strategy types
      const types: StrategyType[] = ['step-by-step', 'exploratory', 'targeted'];
      
      for (const type of types) {
        if (type !== primaryStrategy.type && (!preferredType || type === preferredType)) {
          // Create variation with different type
          const variation = {
            ...primaryStrategy,
            id: `${primaryStrategy.id}-${type}`,
            type,
            confidence: primaryStrategy.confidence * 0.9 // Slightly lower confidence for variations
          };
          strategies.push(variation);
        }
      }
    }

    // Adjust based on context
    if (context?.recentEvents) {
      strategies.forEach(strategy => {
        this.adjustStrategyForContext(strategy, context);
      });
    }

    return strategies;
  }

  /**
   * Adjust strategy based on context
   */
  private adjustStrategyForContext(strategy: DebugStrategy, context: any): void {
    if (!context.recentEvents || context.recentEvents.length === 0) return;

    // Check for specific event types
    const hasConsoleErrors = context.recentEvents.some(
      (e: any) => e.type === 'console' && e.data?.level === 'error'
    );
    const hasNetworkErrors = context.recentEvents.some(
      (e: any) => e.type === 'network' && e.data?.status >= 400
    );

    // Boost confidence if context matches problem
    if (strategy.problemCategory.type === 'runtime-error' && hasConsoleErrors) {
      strategy.confidence = Math.min(strategy.confidence * 1.1, 0.95);
    }
    if (strategy.problemCategory.type === 'network' && hasNetworkErrors) {
      strategy.confidence = Math.min(strategy.confidence * 1.1, 0.95);
    }
  }

  /**
   * Enrich strategies with context-specific parameters
   */
  private enrichStrategiesWithContext(
    strategies: DebugStrategy[],
    tabId: string,
    context: any
  ): DebugStrategy[] {
    return strategies.map(strategy => ({
      ...strategy,
      steps: strategy.steps.map(step => {
        // Create base parameters
        const baseParameters: Record<string, any> = {
          ...(step.parameters || {}),
          tabId
        };

        // Add specific parameters based on tool
        if (step.tool === 'get_console_messages' && context?.tab?.metrics?.consoleMessages) {
          baseParameters.limit = Math.min(context.tab.metrics.consoleMessages, 100);
        }

        if (step.tool === 'get_network_activity' && context?.tab?.metrics?.networkRequests) {
          baseParameters.limit = Math.min(context.tab.metrics.networkRequests, 50);
        }

        return {
          ...step,
          parameters: baseParameters
        };
      })
    }));
  }

  /**
   * Get list of context sources used
   */
  private getContextUsed(request: StrategySuggestionRequest, context: any): string[] {
    const used: string[] = [];

    if (request.includeHistory) {
      used.push('history');
    }

    if (context) {
      if (context.tab) used.push('tab-metrics');
      if (context.recentEvents?.length > 0) used.push('recent-events');
      if (context.metrics) used.push('global-metrics');
    }

    return used;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(problemCategory: any, strategies: DebugStrategy[]): number {
    if (strategies.length === 0) return 0;

    // Weight by problem categorization confidence and best strategy confidence
    const bestStrategyConfidence = Math.max(...strategies.map(s => s.confidence));
    return problemCategory.confidence * 0.4 + bestStrategyConfidence * 0.6;
  }
}