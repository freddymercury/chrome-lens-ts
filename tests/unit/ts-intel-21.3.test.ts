import { describe, test, expect } from '@jest/globals';
import { generateStrategy } from '../../src/intelligence/strategy-template-engine.js';
import { ProblemCategory } from '../../src/types/intelligence.js';

describe('Strategy Template Engine', () => {
  test('generates runtime error strategy', () => {
    // Input: { type: 'runtime-error', subtype: 'null-reference' }
    const category: ProblemCategory = {
      type: 'runtime-error',
      subtype: 'null-reference',
      confidence: 0.9,
      keywords: ['TypeError', 'undefined']
    };
    
    const strategy = generateStrategy(category);
    
    expect(strategy.steps.length).toBeGreaterThan(0);
    expect(strategy.steps.length).toBeLessThanOrEqual(10);
    
    // Should include key debugging steps
    const stepNames = strategy.steps.map(s => s.name);
    expect(stepNames).toContain('inspect_variables');
    expect(stepNames).toContain('trace_execution');
    expect(stepNames).toContain('check_null_values');
    
    // Should have reasonable time estimate
    expect(strategy.estimatedTime).toBeGreaterThan(0);
    expect(strategy.estimatedTime).toBeLessThan(3600); // Less than 1 hour
    
    // Should have high confidence for well-categorized problems
    expect(strategy.confidence).toBeGreaterThan(0.7);
  });
  
  test('generates performance strategy', () => {
    // Input: { type: 'performance', subtype: 'slow-load' }
    const category: ProblemCategory = {
      type: 'performance',
      subtype: 'slow-load',
      confidence: 0.8,
      keywords: ['slow', 'load', 'seconds']
    };
    
    const strategy = generateStrategy(category);
    
    const stepNames = strategy.steps.map(s => s.name);
    expect(stepNames).toContain('profile_performance');
    expect(stepNames).toContain('identify_bottlenecks');
    expect(stepNames).toContain('analyze_network');
    
    // Performance strategies might take longer
    expect(strategy.estimatedTime).toBeGreaterThan(60); // At least 1 minute
  });
  
  test('limits strategy complexity', () => {
    const category: ProblemCategory = {
      type: 'logic-error',
      subtype: 'incorrect-output',
      confidence: 0.7
    };
    
    // Default limit
    const defaultStrategy = generateStrategy(category);
    expect(defaultStrategy.steps.length).toBeLessThanOrEqual(10);
    
    // Custom limit
    const limitedStrategy = generateStrategy(category, 3);
    expect(limitedStrategy.steps.length).toBeLessThanOrEqual(3);
    expect(limitedStrategy.steps.length).toBeGreaterThan(0);
  });

  test('generates network error strategy', () => {
    const category: ProblemCategory = {
      type: 'network',
      subtype: 'cors',
      confidence: 0.95,
      keywords: ['CORS', 'Cross-Origin']
    };
    
    const strategy = generateStrategy(category);
    
    const stepNames = strategy.steps.map(s => s.name);
    expect(stepNames).toContain('check_network_requests');
    expect(stepNames).toContain('verify_cors_headers');
    expect(stepNames).toContain('test_endpoint');
  });

  test('generates security issue strategy', () => {
    const category: ProblemCategory = {
      type: 'security',
      subtype: 'csp-violation',
      confidence: 0.9,
      keywords: ['CSP', 'violation']
    };
    
    const strategy = generateStrategy(category);
    
    const stepNames = strategy.steps.map(s => s.name);
    expect(stepNames).toContain('security_audit');
    expect(stepNames).toContain('check_csp_headers');
    expect(stepNames).toContain('identify_violations');
  });

  test('generates generic strategy for unknown problems', () => {
    const category: ProblemCategory = {
      type: 'unknown',
      confidence: 0.3
    };
    
    const strategy = generateStrategy(category);
    
    // Should still provide a basic strategy
    expect(strategy.steps.length).toBeGreaterThan(0);
    expect(strategy.confidence).toBeLessThan(0.5); // Low confidence
    
    const stepNames = strategy.steps.map(s => s.name);
    expect(stepNames).toContain('gather_information');
    expect(stepNames).toContain('check_console');
  });

  test('includes proper step details', () => {
    const category: ProblemCategory = {
      type: 'runtime-error',
      subtype: 'null-reference',
      confidence: 0.9
    };
    
    const strategy = generateStrategy(category);
    const firstStep = strategy.steps[0];
    
    // Each step should have required properties
    expect(firstStep.id).toBeTruthy();
    expect(firstStep.name).toBeTruthy();
    expect(firstStep.description).toBeTruthy();
    expect(firstStep.tool).toBeTruthy();
    expect(firstStep.expectedOutcome).toBeTruthy();
    expect(firstStep.estimatedDuration).toBeGreaterThan(0);
  });

  test('calculates total estimated time correctly', () => {
    const category: ProblemCategory = {
      type: 'performance',
      subtype: 'slow-load',
      confidence: 0.8
    };
    
    const strategy = generateStrategy(category);
    
    const totalStepTime = strategy.steps.reduce(
      (sum, step) => sum + (step.estimatedDuration || 0), 
      0
    );
    
    expect(strategy.estimatedTime).toBe(totalStepTime);
  });

  test('adjusts confidence based on problem confidence', () => {
    const highConfidenceCategory: ProblemCategory = {
      type: 'runtime-error',
      subtype: 'null-reference',
      confidence: 0.95
    };
    
    const lowConfidenceCategory: ProblemCategory = {
      type: 'runtime-error',
      subtype: 'null-reference',
      confidence: 0.4
    };
    
    const highConfStrategy = generateStrategy(highConfidenceCategory);
    const lowConfStrategy = generateStrategy(lowConfidenceCategory);
    
    expect(highConfStrategy.confidence).toBeGreaterThan(lowConfStrategy.confidence);
  });

  test('creates dependencies between steps', () => {
    const category: ProblemCategory = {
      type: 'performance',
      subtype: 'memory-leak',
      confidence: 0.85
    };
    
    const strategy = generateStrategy(category);
    
    // Later steps should depend on earlier ones
    const laterStep = strategy.steps.find(s => s.dependencies && s.dependencies.length > 0);
    expect(laterStep).toBeDefined();
    
    if (laterStep?.dependencies) {
      // Dependencies should reference valid step IDs
      const stepIds = strategy.steps.map(s => s.id);
      laterStep.dependencies.forEach(dep => {
        expect(stepIds).toContain(dep);
      });
    }
  });
});