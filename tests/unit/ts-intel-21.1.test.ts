import { describe, test, expect, beforeEach } from '@jest/globals';
import { createStrategyToolSchema } from '../../src/intelligence/strategy-tool-schema.js';
import { ToolSchema } from '../../src/types/intelligence.js';

describe('Strategy Tool Schema', () => {
  let toolSchema: ToolSchema;

  beforeEach(() => {
    toolSchema = createStrategyToolSchema();
  });

  test('tool definition has correct structure', () => {
    // Assert tool name is 'suggest_debugging_strategy'
    expect(toolSchema.name).toBe('suggest_debugging_strategy');
    
    // Assert description includes "AI-driven debugging workflow"
    expect(toolSchema.description).toContain('AI-driven debugging workflow');
    
    // Assert inputSchema has required properties
    expect(toolSchema.inputSchema).toBeDefined();
    expect(toolSchema.inputSchema.type).toBe('object');
    expect(toolSchema.inputSchema.properties).toBeDefined();
    expect(toolSchema.inputSchema.required).toBeDefined();
  });
  
  test('problem description parameter', () => {
    const properties = toolSchema.inputSchema.properties;
    
    // Assert problemDescription is string type
    expect(properties.problemDescription).toBeDefined();
    expect(properties.problemDescription.type).toBe('string');
    
    // Assert it has proper description
    expect(properties.problemDescription.description).toBeTruthy();
    expect(properties.problemDescription.description).toContain('problem');
    
    // Assert it's required
    expect(toolSchema.inputSchema.required).toContain('problemDescription');
  });
  
  test('strategy parameters', () => {
    const properties = toolSchema.inputSchema.properties;
    
    // Assert strategyType enum: ['step-by-step', 'exploratory', 'targeted']
    expect(properties.strategyType).toBeDefined();
    expect(properties.strategyType.enum).toEqual(['step-by-step', 'exploratory', 'targeted']);
    expect(properties.strategyType.description).toBeTruthy();
    
    // Assert confidence threshold is number 0-1
    expect(properties.confidence).toBeDefined();
    expect(properties.confidence.type).toBe('number');
    expect(properties.confidence.minimum).toBe(0);
    expect(properties.confidence.maximum).toBe(1);
    expect(properties.confidence.description).toBeTruthy();
    
    // Assert maxSteps is integer with max 10
    expect(properties.maxSteps).toBeDefined();
    expect(properties.maxSteps.type).toBe('integer');
    expect(properties.maxSteps.minimum).toBe(1);
    expect(properties.maxSteps.maximum).toBe(10);
    expect(properties.maxSteps.default).toBeDefined();
  });

  test('optional parameters have defaults', () => {
    const properties = toolSchema.inputSchema.properties;
    
    // strategyType should have default
    expect(properties.strategyType.default).toBe('step-by-step');
    
    // confidence should have default
    expect(properties.confidence.default).toBe(0.7);
    
    // maxSteps should have default
    expect(properties.maxSteps.default).toBe(5);
  });

  test('includes context parameters', () => {
    const properties = toolSchema.inputSchema.properties;
    
    // Should include tabId for context
    expect(properties.tabId).toBeDefined();
    expect(properties.tabId.type).toBe('string');
    expect(properties.tabId.pattern).toBe('^[A-F0-9]{32}$');
    
    // Should include includeHistory flag
    expect(properties.includeHistory).toBeDefined();
    expect(properties.includeHistory.type).toBe('boolean');
    expect(properties.includeHistory.default).toBe(false);
  });
});