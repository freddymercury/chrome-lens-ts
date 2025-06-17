import { ToolSchema } from '../types/intelligence.js';

/**
 * Creates the tool schema for suggest_debugging_strategy
 * This tool provides AI-driven debugging workflow suggestions
 */
export function createStrategyToolSchema(): ToolSchema {
  return {
    name: 'suggest_debugging_strategy',
    description: 'AI-driven debugging workflow suggestions based on problem description and context. Analyzes the debugging scenario and recommends optimal strategies.',
    inputSchema: {
      type: 'object',
      properties: {
        problemDescription: {
          type: 'string',
          description: 'Detailed description of the debugging problem or issue being investigated',
          default: undefined
        },
        strategyType: {
          type: 'string',
          enum: ['step-by-step', 'exploratory', 'targeted'],
          description: 'Preferred debugging strategy approach: step-by-step (methodical), exploratory (broad investigation), or targeted (specific focus)',
          default: 'step-by-step'
        },
        confidence: {
          type: 'number',
          description: 'Minimum confidence threshold for suggested strategies (0-1)',
          minimum: 0,
          maximum: 1,
          default: 0.7
        },
        maxSteps: {
          type: 'integer',
          description: 'Maximum number of steps in the debugging strategy',
          minimum: 1,
          maximum: 10,
          default: 5
        },
        tabId: {
          type: 'string',
          description: 'Chrome tab ID for context-aware suggestions',
          pattern: '^[A-F0-9]{32}$'
        },
        includeHistory: {
          type: 'boolean',
          description: 'Include historical debugging data in strategy generation',
          default: false
        }
      },
      required: ['problemDescription'],
      additionalProperties: false
    }
  };
}