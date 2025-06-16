/**
 * Intelligence Layer Types for Chrome Lens v1.2
 * AI-driven debugging strategies and workflow orchestration
 */

/**
 * MCP Tool Schema definition
 */
export interface ToolSchema {
  /** Tool name */
  name: string;
  /** Tool description for LLM understanding */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Schema property definition
 */
export interface SchemaProperty {
  /** Property type */
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  /** Property description */
  description?: string;
  /** Enum values */
  enum?: string[];
  /** Default value */
  default?: any;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** String pattern validation */
  pattern?: string;
  /** String format */
  format?: string;
  /** Array items schema */
  items?: SchemaProperty;
}

/**
 * Debugging strategy types
 */
export type StrategyType = 'step-by-step' | 'exploratory' | 'targeted';

/**
 * Problem category types
 */
export interface ProblemCategory {
  /** Main problem type */
  type: 'runtime-error' | 'performance' | 'logic-error' | 'security' | 'network' | 'unknown';
  /** Specific subtype */
  subtype?: string;
  /** Confidence in categorization (0-1) */
  confidence: number;
  /** Keywords that led to categorization */
  keywords?: string[];
}

/**
 * Debug step in a strategy
 */
export interface DebugStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Tool to use for this step */
  tool?: string;
  /** Tool parameters */
  parameters?: Record<string, any>;
  /** Expected outcome */
  expectedOutcome?: string;
  /** Estimated duration in seconds */
  estimatedDuration?: number;
  /** Dependencies on other steps */
  dependencies?: string[];
}

/**
 * Debugging strategy
 */
export interface DebugStrategy {
  /** Strategy ID */
  id: string;
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: StrategyType;
  /** Steps in the strategy */
  steps: DebugStep[];
  /** Total estimated time in seconds */
  estimatedTime: number;
  /** Confidence in strategy success (0-1) */
  confidence: number;
  /** Problem category this strategy addresses */
  problemCategory: ProblemCategory;
  /** Success rate from historical data */
  historicalSuccessRate?: number;
  /** Complexity score (1-10) */
  complexity?: number;
}

/**
 * Strategy suggestion request
 */
export interface StrategySuggestionRequest {
  /** Description of the debugging problem */
  problemDescription: string;
  /** Preferred strategy type */
  strategyType?: StrategyType;
  /** Minimum confidence threshold */
  confidence?: number;
  /** Maximum steps in strategy */
  maxSteps?: number;
  /** Tab ID for context */
  tabId?: string;
  /** Include historical debugging data */
  includeHistory?: boolean;
}

/**
 * Strategy suggestion response
 */
export interface StrategySuggestionResponse {
  /** Success status */
  success: boolean;
  /** Suggested strategies */
  strategies?: DebugStrategy[];
  /** Problem categorization */
  problemCategory?: ProblemCategory;
  /** Error information */
  error?: {
    type: string;
    message: string;
    hint?: string;
  };
  /** Metadata */
  metadata?: {
    analysisTime: number;
    contextUsed: string[];
    confidence: number;
  };
}

/**
 * Session context for intelligence
 */
export interface SessionContext {
  /** Session ID */
  sessionId: string;
  /** Tab ID */
  tabId: string;
  /** Previous strategies tried */
  previousStrategies: DebugStrategy[];
  /** Current state */
  currentState: {
    errors: any[];
    performance: any;
    variables: any;
  };
  /** Success metrics */
  successMetrics: {
    strategiesAttempted: number;
    strategiesSucceeded: number;
    averageTime: number;
  };
}

/**
 * Strategy execution result
 */
export interface StrategyExecutionResult {
  /** Strategy ID */
  strategyId: string;
  /** Execution success */
  success: boolean;
  /** Steps completed */
  stepsCompleted: string[];
  /** Steps failed */
  stepsFailed: string[];
  /** Total execution time */
  executionTime: number;
  /** Findings */
  findings: {
    stepId: string;
    finding: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  /** Recommendations */
  recommendations?: string[];
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
  /** Change description */
  change: string;
  /** Affected files */
  affectedFiles: string[];
  /** Affected functions */
  affectedFunctions: string[];
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Potential side effects */
  sideEffects: string[];
  /** Confidence in analysis */
  confidence: number;
}

/**
 * Test generation result
 */
export interface GeneratedTest {
  /** Test name */
  name: string;
  /** Test description */
  description: string;
  /** Test code */
  code: string;
  /** Test type */
  type: 'unit' | 'integration' | 'e2e';
  /** Coverage estimate */
  coverageEstimate: number;
  /** Framework */
  framework: string;
}

/**
 * Dependency analysis result  
 */
export interface DependencyAnalysis {
  /** File being analyzed */
  file: string;
  /** Direct dependencies */
  directDependencies: string[];
  /** Transitive dependencies */
  transitiveDependencies: string[];
  /** Circular dependencies detected */
  circularDependencies: string[][];
  /** Dependency tree depth */
  depth: number;
  /** External dependencies */
  externalDependencies: {
    name: string;
    version: string;
    location: string;
  }[];
}