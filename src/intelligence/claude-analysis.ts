import Anthropic from '@anthropic-ai/sdk';
import { ProblemCategory, DebugStrategy } from '../types/intelligence.js';

export interface ClaudeAnalysisConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  enabled?: boolean;
}

export class ClaudeAnalysisService {
  private anthropic: Anthropic | null = null;
  private config: ClaudeAnalysisConfig;

  constructor(config: ClaudeAnalysisConfig) {
    this.config = config;
    
    if (config.enabled && config.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey
      });
    }
  }

  /**
   * Enhance problem categorization with Claude
   */
  async enhanceProblemCategorization(
    description: string, 
    basicCategory: ProblemCategory
  ): Promise<ProblemCategory> {
    if (!this.anthropic || !this.config.enabled) {
      return basicCategory; // Fallback to basic categorization
    }

    try {
      const prompt = `As a debugging expert, analyze this problem description and categorize it:

Problem: "${description}"

Current basic categorization:
- Type: ${basicCategory.type}
- Subtype: ${basicCategory.subtype || 'none'}
- Confidence: ${basicCategory.confidence}

Please provide a more detailed analysis:
1. Confirm or correct the problem type (runtime-error, performance, logic-error, network, security, or unknown)
2. Provide a specific subtype
3. Rate confidence (0-1)
4. Extract key indicators/keywords
5. Suggest any additional context that would help

Respond in JSON format:
{
  "type": "...",
  "subtype": "...",
  "confidence": 0.9,
  "keywords": ["..."],
  "analysis": "Brief explanation"
}`;

      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-opus-20240229',
        max_tokens: this.config.maxTokens || 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const analysis = JSON.parse(content.text);
        return {
          type: analysis.type || basicCategory.type,
          subtype: analysis.subtype,
          confidence: analysis.confidence || basicCategory.confidence,
          keywords: [...new Set([...(basicCategory.keywords || []), ...(analysis.keywords || [])])]
        };
      }
    } catch (error) {
      console.error('Claude analysis error:', error);
    }

    return basicCategory;
  }

  /**
   * Generate advanced debugging strategy with Claude
   */
  async generateAdvancedStrategy(
    problemDescription: string,
    category: ProblemCategory,
    context?: any
  ): Promise<DebugStrategy | null> {
    if (!this.anthropic || !this.config.enabled) {
      return null;
    }

    try {
      const contextInfo = context ? `
Current context:
- Tab connected: ${context.tab?.connected || false}
- Console errors: ${context.tab?.metrics?.consoleMessages || 0}
- Network requests: ${context.tab?.metrics?.networkRequests || 0}
- Recent events: ${context.recentEvents?.length || 0}
` : '';

      const prompt = `As a Chrome DevTools expert, create a detailed debugging strategy for:

Problem: "${problemDescription}"
Category: ${category.type} (${category.subtype || 'general'})
${contextInfo}

Available Chrome DevTools MCP tools:
- get_console_messages: Retrieve console output
- get_network_activity: Check network requests
- execute_js: Run JavaScript in page context
- inspect_variables: Examine variable values
- manage_breakpoints: Set/remove breakpoints
- debug_step_control: Step through code
- analyze_runtime_state: Get full runtime analysis
- analyze_errors: Deep error analysis
- security_audit: Security vulnerability check
- get_performance_metrics: Performance profiling

Create a step-by-step debugging strategy with:
1. Clear, actionable steps using the tools above
2. Expected outcomes for each step
3. Time estimates
4. Dependencies between steps

Respond in JSON format:
{
  "name": "Strategy name",
  "steps": [
    {
      "name": "step_name",
      "description": "What to do",
      "tool": "tool_name",
      "parameters": {},
      "expectedOutcome": "What we expect to find",
      "estimatedDuration": 30
    }
  ],
  "confidence": 0.9,
  "reasoning": "Why this approach"
}`;

      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-opus-20240229',
        max_tokens: this.config.maxTokens || 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const strategy = JSON.parse(content.text);
        
        // Convert to our format
        return {
          id: `claude-${Date.now()}`,
          name: strategy.name,
          type: 'targeted', // Claude strategies are usually targeted
          steps: strategy.steps.map((step: any, index: number) => ({
            id: `step-${index}`,
            ...step,
            dependencies: index > 0 ? [`step-${index - 1}`] : []
          })),
          estimatedTime: strategy.steps.reduce((sum: number, s: any) => sum + (s.estimatedDuration || 30), 0),
          confidence: strategy.confidence || 0.85,
          problemCategory: category,
          complexity: Math.min(strategy.steps.length * 1.5, 10)
        };
      }
    } catch (error) {
      console.error('Claude strategy generation error:', error);
    }

    return null;
  }

  /**
   * Analyze debugging context for insights
   */
  async analyzeContext(
    problemDescription: string,
    recentEvents: any[],
    tabMetrics: any
  ): Promise<string | null> {
    if (!this.anthropic || !this.config.enabled) {
      return null;
    }

    try {
      const prompt = `Analyze this debugging context:

Problem: "${problemDescription}"

Recent Events (last 10):
${recentEvents.slice(-10).map(e => `- ${e.type}: ${JSON.stringify(e.data)}`).join('\n')}

Tab Metrics:
${JSON.stringify(tabMetrics, null, 2)}

Provide brief insights about:
1. Potential root causes based on events
2. Patterns in the data
3. Suggested focus areas

Keep response under 200 words.`;

      const response = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-opus-20240229',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
    } catch (error) {
      console.error('Claude context analysis error:', error);
    }

    return null;
  }

  /**
   * Check if Claude integration is available
   */
  isAvailable(): boolean {
    return this.anthropic !== null && this.config.enabled === true;
  }
}