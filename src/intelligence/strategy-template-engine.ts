import { DebugStrategy, DebugStep, ProblemCategory, StrategyType } from '../types/intelligence.js';
import { randomBytes } from 'crypto';

/**
 * Strategy template definitions
 */
interface StrategyTemplate {
  name: string;
  type: StrategyType;
  steps: Omit<DebugStep, 'id'>[];
  baseConfidence: number;
}

const STRATEGY_TEMPLATES: Record<string, StrategyTemplate> = {
  'runtime-error:null-reference': {
    name: 'Null Reference Debugging',
    type: 'step-by-step',
    steps: [
      {
        name: 'inspect_variables',
        description: 'Inspect variables at the error location',
        tool: 'inspect_variables',
        expectedOutcome: 'Identify which variable is null/undefined',
        estimatedDuration: 30
      },
      {
        name: 'trace_execution',
        description: 'Trace execution path to error',
        tool: 'analyze_runtime_state',
        expectedOutcome: 'Understand code flow leading to error',
        estimatedDuration: 60,
        dependencies: []
      },
      {
        name: 'check_null_values',
        description: 'Check for null/undefined values in scope',
        tool: 'execute_js',
        parameters: { expression: 'Object.entries(this).filter(([k,v]) => v == null)' },
        expectedOutcome: 'List all null/undefined variables',
        estimatedDuration: 20,
        dependencies: []
      },
      {
        name: 'set_breakpoint',
        description: 'Set breakpoint before error occurs',
        tool: 'manage_breakpoints',
        expectedOutcome: 'Pause execution to inspect state',
        estimatedDuration: 15,
        dependencies: []
      }
    ],
    baseConfidence: 0.85
  },

  'runtime-error:default': {
    name: 'General Runtime Error Debugging',
    type: 'step-by-step',
    steps: [
      {
        name: 'check_console',
        description: 'Review console for error details',
        tool: 'get_console_messages',
        parameters: { level: 'error' },
        expectedOutcome: 'Full error message and stack trace',
        estimatedDuration: 15
      },
      {
        name: 'inspect_variables',
        description: 'Inspect variables in error scope',
        tool: 'inspect_variables',
        expectedOutcome: 'Current variable states',
        estimatedDuration: 30,
        dependencies: []
      },
      {
        name: 'analyze_stack',
        description: 'Analyze error stack trace',
        tool: 'analyze_errors',
        expectedOutcome: 'Error origin and call stack',
        estimatedDuration: 45,
        dependencies: []
      }
    ],
    baseConfidence: 0.75
  },

  'performance:slow-load': {
    name: 'Page Load Performance Analysis',
    type: 'exploratory',
    steps: [
      {
        name: 'profile_performance',
        description: 'Run performance profiler',
        tool: 'get_performance_metrics',
        expectedOutcome: 'Performance metrics and timings',
        estimatedDuration: 120
      },
      {
        name: 'analyze_network',
        description: 'Analyze network requests',
        tool: 'get_network_activity',
        parameters: { limit: 100 },
        expectedOutcome: 'Identify slow requests',
        estimatedDuration: 60,
        dependencies: []
      },
      {
        name: 'identify_bottlenecks',
        description: 'Identify performance bottlenecks',
        tool: 'analyze_runtime_state',
        expectedOutcome: 'List of performance issues',
        estimatedDuration: 90,
        dependencies: []
      },
      {
        name: 'check_resources',
        description: 'Check resource loading',
        tool: 'list_source_files',
        expectedOutcome: 'Resource loading patterns',
        estimatedDuration: 30,
        dependencies: []
      }
    ],
    baseConfidence: 0.8
  },

  'performance:memory-leak': {
    name: 'Memory Leak Detection',
    type: 'exploratory',
    steps: [
      {
        name: 'baseline_memory',
        description: 'Capture baseline memory snapshot',
        tool: 'get_performance_metrics',
        expectedOutcome: 'Initial memory usage',
        estimatedDuration: 30
      },
      {
        name: 'monitor_growth',
        description: 'Monitor memory growth over time',
        tool: 'watch_state_changes',
        parameters: { expressions: ['performance.memory'] },
        expectedOutcome: 'Memory usage patterns',
        estimatedDuration: 180
      },
      {
        name: 'analyze_objects',
        description: 'Analyze object retention',
        tool: 'analyze_runtime_state',
        expectedOutcome: 'Identify retained objects',
        estimatedDuration: 120
      }
    ],
    baseConfidence: 0.75
  },

  'logic-error:incorrect-output': {
    name: 'Logic Error Investigation',
    type: 'targeted',
    steps: [
      {
        name: 'identify_function',
        description: 'Identify problematic function',
        tool: 'list_source_files',
        expectedOutcome: 'Locate function with issue',
        estimatedDuration: 45
      },
      {
        name: 'trace_values',
        description: 'Trace values through execution',
        tool: 'debug_step_control',
        expectedOutcome: 'Value transformations',
        estimatedDuration: 90,
        dependencies: []
      },
      {
        name: 'compare_expected',
        description: 'Compare actual vs expected output',
        tool: 'execute_js',
        expectedOutcome: 'Identify discrepancies',
        estimatedDuration: 60,
        dependencies: []
      }
    ],
    baseConfidence: 0.7
  },

  'network:cors': {
    name: 'CORS Issue Resolution',
    type: 'targeted',
    steps: [
      {
        name: 'check_network_requests',
        description: 'Check failed network requests',
        tool: 'get_network_activity',
        parameters: { type: 'response' },
        expectedOutcome: 'CORS error details',
        estimatedDuration: 30
      },
      {
        name: 'verify_cors_headers',
        description: 'Verify CORS headers',
        tool: 'execute_js',
        parameters: { expression: 'fetch(url).then(r => r.headers)' },
        expectedOutcome: 'Header configuration',
        estimatedDuration: 45,
        dependencies: []
      },
      {
        name: 'test_endpoint',
        description: 'Test endpoint directly',
        tool: 'execute_js',
        expectedOutcome: 'Direct response validation',
        estimatedDuration: 30,
        dependencies: []
      }
    ],
    baseConfidence: 0.85
  },

  'network:default': {
    name: 'Network Issue Debugging',
    type: 'exploratory',
    steps: [
      {
        name: 'check_network_requests',
        description: 'Review all network activity',
        tool: 'get_network_activity',
        expectedOutcome: 'Network request patterns',
        estimatedDuration: 45
      },
      {
        name: 'analyze_failures',
        description: 'Analyze failed requests',
        tool: 'analyze_errors',
        expectedOutcome: 'Failure reasons',
        estimatedDuration: 60,
        dependencies: []
      }
    ],
    baseConfidence: 0.7
  },

  'security:csp-violation': {
    name: 'CSP Violation Resolution',
    type: 'targeted',
    steps: [
      {
        name: 'security_audit',
        description: 'Run security audit',
        tool: 'security_audit',
        expectedOutcome: 'Security issues list',
        estimatedDuration: 90
      },
      {
        name: 'check_csp_headers',
        description: 'Check CSP headers',
        tool: 'check_vulnerabilities',
        parameters: { checks: ['csp'] },
        expectedOutcome: 'CSP configuration',
        estimatedDuration: 30,
        dependencies: []
      },
      {
        name: 'identify_violations',
        description: 'Identify specific violations',
        tool: 'get_console_messages',
        parameters: { level: 'error' },
        expectedOutcome: 'Violation details',
        estimatedDuration: 20,
        dependencies: []
      }
    ],
    baseConfidence: 0.8
  },

  'unknown:default': {
    name: 'General Debugging Approach',
    type: 'exploratory',
    steps: [
      {
        name: 'gather_information',
        description: 'Gather initial information',
        tool: 'analyze_runtime_state',
        expectedOutcome: 'Current application state',
        estimatedDuration: 60
      },
      {
        name: 'check_console',
        description: 'Check console for clues',
        tool: 'get_console_messages',
        expectedOutcome: 'Console output analysis',
        estimatedDuration: 30,
        dependencies: []
      },
      {
        name: 'check_network',
        description: 'Review network activity',
        tool: 'get_network_activity',
        expectedOutcome: 'Network patterns',
        estimatedDuration: 45,
        dependencies: []
      },
      {
        name: 'analyze_errors',
        description: 'Analyze any errors',
        tool: 'analyze_errors',
        expectedOutcome: 'Error patterns',
        estimatedDuration: 45,
        dependencies: []
      }
    ],
    baseConfidence: 0.4
  }
};

/**
 * Generates a debugging strategy based on problem category
 */
export function generateStrategy(
  category: ProblemCategory,
  maxSteps: number = 10
): DebugStrategy {
  // Select appropriate template
  const templateKey = category.subtype 
    ? `${category.type}:${category.subtype}`
    : `${category.type}:default`;
    
  let template = STRATEGY_TEMPLATES[templateKey];
  
  // Fallback to type default or unknown
  if (!template) {
    template = STRATEGY_TEMPLATES[`${category.type}:default`] || 
               STRATEGY_TEMPLATES['unknown:default'];
  }

  // Generate strategy ID
  const strategyId = generateId();
  
  // Create steps with IDs and proper dependencies
  const steps: DebugStep[] = template.steps
    .slice(0, maxSteps)
    .map((stepTemplate, index) => {
      const stepId = `${strategyId}-step-${index + 1}`;
      
      // Set dependencies to previous step if not specified
      const dependencies = stepTemplate.dependencies !== undefined
        ? stepTemplate.dependencies
        : index > 0 ? [`${strategyId}-step-${index}`] : [];
      
      return {
        ...stepTemplate,
        id: stepId,
        dependencies
      };
    });

  // Calculate total estimated time
  const estimatedTime = steps.reduce(
    (sum, step) => sum + (step.estimatedDuration || 0),
    0
  );

  // Adjust confidence based on problem categorization confidence
  const confidence = Math.min(
    template.baseConfidence * category.confidence,
    0.95
  );

  return {
    id: strategyId,
    name: template.name,
    type: template.type,
    steps,
    estimatedTime,
    confidence,
    problemCategory: category,
    complexity: calculateComplexity(steps)
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Calculate strategy complexity (1-10 scale)
 */
function calculateComplexity(steps: DebugStep[]): number {
  const factors = {
    stepCount: steps.length / 10 * 3, // 30% weight
    dependencies: steps.filter(s => s.dependencies && s.dependencies.length > 0).length / steps.length * 3, // 30% weight
    duration: Math.min(steps.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0) / 600, 1) * 4 // 40% weight
  };
  
  const complexity = factors.stepCount + factors.dependencies + factors.duration;
  return Math.round(Math.min(complexity, 10));
}