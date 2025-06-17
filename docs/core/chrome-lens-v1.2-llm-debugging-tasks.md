# Chrome Lens v1.2 LLM Debugging - Detailed Task Plan

## Overview

This document provides a detailed, step-by-step implementation plan for the Chrome Lens v1.2 LLM Debugging features. Each task is designed to be small, testable, and focused on a single concern following TDD principles.

## Implementation Prerequisites

### Developer Inputs Required
- **Code Modification Settings**: Safety limits for live code editing
- **Debugging Permissions**: Breakpoint and execution control settings
- **Performance Limits**: Max breakpoints, inspection depth, monitoring buffer sizes

### Environment Variables
```env
# LLM Debugging Configuration
CODE_MODIFICATION_ENABLED=true
CODE_MODIFICATION_BACKUP=true
HOT_RELOAD_ENABLED=true
LIVE_EDIT_SECURITY_MODE=strict
STATE_PRESERVATION_STRATEGY=shallow
MAX_BREAKPOINTS=50
BREAKPOINT_TIMEOUT=30000
DEBUGGER_PAUSE_ON_EXCEPTIONS=true
DEBUG_STEP_TIMEOUT=5000
VARIABLE_INSPECTION_DEPTH=3
OBJECT_PROPERTY_LIMIT=100
RUNTIME_ANALYSIS_COMPONENTS=all
ERROR_ANALYSIS_DEPTH=5
SOURCE_MAP_ENABLED=true
STACK_TRACE_CONTEXT_LINES=5
EXECUTION_TRACE_LIMIT=1000
EVENT_MONITORING_BUFFER_SIZE=10000
REAL_TIME_EVENTS=true
EVENT_STREAM_THROTTLING=100
STATE_WATCH_POLLING_INTERVAL=500
AST_ANALYSIS_ENABLED=true
CODE_COMPLEXITY_METRICS=true
DEPENDENCY_ANALYSIS_DEPTH=3
QUALITY_CHECK_RULES=standard
```

## Phase 26: Real-time Code Modification

### Task ts-debug-26.1: Code Modification Tool Schema
**Goal**: Define the modify_source_code tool schema

**Unit Test Spec** (`tests/unit/ts-debug-26.1.test.ts`):
```typescript
describe('Code Modification Tool Schema', () => {
  test('tool definition has correct structure', () => {
    // Assert tool name is 'modify_source_code'
    // Assert description includes "real-time code modification"
    // Assert inputSchema has required properties
  });
  
  test('modification parameters', () => {
    // Assert tabId is required string
    // Assert fileUrl is required string
    // Assert modifications array structure
    // Assert hotReload is optional boolean
  });
  
  test('modification operation types', () => {
    // Assert operation enum: ['replace', 'insert', 'delete']
    // Assert line/column positions
    // Assert content for replace/insert
  });
});
```

**Pure Function**: Tool schema generator
```typescript
export function createModifyCodeToolSchema(): ToolSchema {
  return {
    name: 'modify_source_code',
    description: 'Modify JavaScript/CSS in real-time with hot reload',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', pattern: '^[A-F0-9]{32}$' },
        fileUrl: { type: 'string', format: 'uri' },
        modifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: { enum: ['replace', 'insert', 'delete'] },
              startLine: { type: 'integer', minimum: 1 },
              startColumn: { type: 'integer', minimum: 0 },
              endLine: { type: 'integer', minimum: 1 },
              endColumn: { type: 'integer', minimum: 0 },
              content: { type: 'string' }
            }
          }
        },
        hotReload: { type: 'boolean', default: true },
        createBackup: { type: 'boolean', default: true }
      },
      required: ['tabId', 'fileUrl', 'modifications']
    }
  };
}
```

### Task ts-debug-26.2: Script Source Management
**Goal**: Get and cache script sources for modification

**Unit Test Spec** (`tests/unit/ts-debug-26.2.test.ts`):
```typescript
describe('Script Source Management', () => {
  test('retrieves script source', async () => {
    // Mock Debugger.getScriptSource
    // Assert source retrieved correctly
  });
  
  test('caches script sources', async () => {
    // First call fetches from Chrome
    // Second call uses cache
  });
  
  test('handles missing scripts', async () => {
    // Script not found error
  });
  
  test('validates script URLs', () => {
    // Only allow http/https/file URLs
  });
});
```

**Pure Function**:
```typescript
export interface ScriptSource {
  scriptId: string;
  url: string;
  source: string;
  sourceMapURL?: string;
}

export function isModifiableScript(url: string): boolean {
  // Check if URL is safe to modify
}
```

### Task ts-debug-26.3: Code Modification Engine
**Goal**: Apply modifications to source code

**Unit Test Spec** (`tests/unit/ts-debug-26.3.test.ts`):
```typescript
describe('Code Modification Engine', () => {
  test('applies replace operation', () => {
    // Input: "function foo() { return 1; }"
    // Replace "1" with "2"
    // Output: "function foo() { return 2; }"
  });
  
  test('applies insert operation', () => {
    // Insert console.log at line start
  });
  
  test('applies delete operation', () => {
    // Delete lines or ranges
  });
  
  test('validates modifications', () => {
    // Check bounds, overlaps
  });
  
  test('creates backup', () => {
    // Original source preserved
  });
});
```

**Pure Function**:
```typescript
export interface CodeModification {
  operation: 'replace' | 'insert' | 'delete';
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  content?: string;
}

export function applyModifications(
  source: string,
  modifications: CodeModification[]
): { modified: string; backup: string } {
  // Apply modifications in order
}
```

### Task ts-debug-26.4: JavaScript Syntax Validation
**Goal**: Validate modified code before applying

**Unit Test Spec** (`tests/unit/ts-debug-26.4.test.ts`):
```typescript
describe('JavaScript Validation', () => {
  test('validates correct JavaScript', () => {
    // Valid syntax passes
  });
  
  test('catches syntax errors', () => {
    // Missing brackets, etc.
  });
  
  test('validates ES6+ features', () => {
    // Arrow functions, async/await
  });
  
  test('respects security mode', () => {
    // LIVE_EDIT_SECURITY_MODE restrictions
  });
});
```

### Task ts-debug-26.5: Live Code Application
**Goal**: Apply modified code to running page

**Unit Test Spec** (`tests/unit/ts-debug-26.5.test.ts`):
```typescript
describe('Live Code Application', () => {
  test('sets script source via CDP', async () => {
    // Mock Debugger.setScriptSource
    // Assert called with correct params
  });
  
  test('handles compilation errors', async () => {
    // CDP returns compilation error
    // Rollback applied
  });
  
  test('updates CSS stylesheets', async () => {
    // Mock CSS.setStyleSheetText
    // Assert styles updated
  });
});
```

### Task ts-debug-26.6: Hot Reload Implementation
**Goal**: Reload modules while preserving state

**Unit Test Spec** (`tests/unit/ts-debug-26.6.test.ts`):
```typescript
describe('Hot Reload', () => {
  test('preserves component state', async () => {
    // State captured before reload
    // State restored after reload
  });
  
  test('updates module exports', async () => {
    // New exports available
    // Old references updated
  });
  
  test('handles reload failures', async () => {
    // Rollback on error
  });
});
```

## Phase 27: Breakpoint and Debug Control

### Task ts-debug-27.1: Breakpoint Tool Schema
**Goal**: Define breakpoint management tool

**Unit Test Spec** (`tests/unit/ts-debug-27.1.test.ts`):
```typescript
describe('Breakpoint Tool Schema', () => {
  test('supports all breakpoint operations', () => {
    // set, remove, enable, disable, list
  });
  
  test('location parameters', () => {
    // url, lineNumber, columnNumber
  });
  
  test('conditional breakpoints', () => {
    // condition expression support
  });
  
  test('logpoints', () => {
    // logMessage without pausing
  });
});
```

### Task ts-debug-27.2: Breakpoint State Management
**Goal**: Track and manage breakpoint state

**Unit Test Spec** (`tests/unit/ts-debug-27.2.test.ts`):
```typescript
describe('Breakpoint State', () => {
  test('tracks active breakpoints', () => {
    // Map of breakpointId -> location
  });
  
  test('enforces MAX_BREAKPOINTS', () => {
    // Reject when limit reached
  });
  
  test('validates breakpoint locations', () => {
    // URL and line must exist
  });
});
```

**Pure Function**:
```typescript
export interface Breakpoint {
  id: string;
  url: string;
  lineNumber: number;
  columnNumber?: number;
  condition?: string;
  logMessage?: string;
  enabled: boolean;
}

export function createBreakpoint(
  location: BreakpointLocation,
  options?: BreakpointOptions
): Breakpoint {
  // Factory with validation
}
```

### Task ts-debug-27.3: Breakpoint CDP Operations
**Goal**: Set/remove breakpoints via Chrome DevTools

**Unit Test Spec** (`tests/unit/ts-debug-27.3.test.ts`):
```typescript
describe('Breakpoint CDP Operations', () => {
  test('sets breakpoint by URL', async () => {
    // Mock Debugger.setBreakpointByUrl
    // Assert breakpointId returned
  });
  
  test('removes breakpoint', async () => {
    // Mock Debugger.removeBreakpoint
  });
  
  test('sets conditional breakpoint', async () => {
    // Condition passed to CDP
  });
});
```

### Task ts-debug-27.4: Debug Step Control Implementation
**Goal**: Control execution flow during debugging

**Unit Test Spec** (`tests/unit/ts-debug-27.4.test.ts`):
```typescript
describe('Debug Step Control', () => {
  test('steps over function calls', async () => {
    // Mock Debugger.stepOver
  });
  
  test('steps into functions', async () => {
    // Mock Debugger.stepInto
  });
  
  test('continues execution', async () => {
    // Mock Debugger.resume
  });
  
  test('respects step timeout', async () => {
    // DEBUG_STEP_TIMEOUT enforced
  });
});
```

## Phase 28: Runtime State Inspection

### Task ts-debug-28.1: Variable Inspector Schema
**Goal**: Define variable inspection tool

**Unit Test Spec** (`tests/unit/ts-debug-28.1.test.ts`):
```typescript
describe('Variable Inspector Schema', () => {
  test('scope types', () => {
    // local, closure, global
  });
  
  test('variable path navigation', () => {
    // object.property.nested
  });
  
  test('expression evaluation', () => {
    // Arbitrary JS expressions
  });
});
```

### Task ts-debug-28.2: Scope Chain Navigation
**Goal**: Navigate through scope chain

**Unit Test Spec** (`tests/unit/ts-debug-28.2.test.ts`):
```typescript
describe('Scope Chain Navigation', () => {
  test('gets local variables', async () => {
    // Current function scope
  });
  
  test('gets closure variables', async () => {
    // Parent scope access
  });
  
  test('gets global variables', async () => {
    // Window/global object
  });
});
```

### Task ts-debug-28.3: Object Property Enumeration
**Goal**: Enumerate object properties safely

**Unit Test Spec** (`tests/unit/ts-debug-28.3.test.ts`):
```typescript
describe('Object Property Enumeration', () => {
  test('lists own properties', () => {
    // Not inherited
  });
  
  test('handles circular references', () => {
    // Detects and marks cycles
  });
  
  test('respects property limit', () => {
    // OBJECT_PROPERTY_LIMIT applied
  });
  
  test('shows property descriptors', () => {
    // writable, enumerable, etc.
  });
});
```

**Pure Function**:
```typescript
export interface PropertyInfo {
  name: string;
  value: any;
  type: string;
  writable: boolean;
  enumerable: boolean;
  isCircular?: boolean;
}

export function enumerateProperties(
  obj: any,
  depth: number = 0,
  visited: WeakSet<any> = new WeakSet()
): PropertyInfo[] {
  // Safe property enumeration
}
```

### Task ts-debug-28.4: Expression Evaluator
**Goal**: Evaluate expressions in context

**Unit Test Spec** (`tests/unit/ts-debug-28.4.test.ts`):
```typescript
describe('Expression Evaluation', () => {
  test('evaluates in current context', async () => {
    // Has access to local vars
  });
  
  test('handles evaluation errors', async () => {
    // Syntax errors caught
  });
  
  test('sanitizes expressions', () => {
    // Prevent dangerous operations
  });
});
```

### Task ts-debug-28.5: Runtime State Analyzer
**Goal**: Analyze overall runtime state

**Unit Test Spec** (`tests/unit/ts-debug-28.5.test.ts`):
```typescript
describe('Runtime State Analysis', () => {
  test('analyzes memory usage', async () => {
    // Heap statistics
  });
  
  test('profiles performance', async () => {
    // CPU usage patterns
  });
  
  test('detects memory leaks', () => {
    // Growing heap over time
  });
});
```

## Phase 29: Error Analysis

### Task ts-debug-29.1: Error Capture Enhancement
**Goal**: Enhance error capture with context

**Unit Test Spec** (`tests/unit/ts-debug-29.1.test.ts`):
```typescript
describe('Error Capture', () => {
  test('captures full stack trace', () => {
    // All frames included
  });
  
  test('adds source context', () => {
    // STACK_TRACE_CONTEXT_LINES around error
  });
  
  test('resolves source maps', () => {
    // Original locations shown
  });
});
```

### Task ts-debug-29.2: Stack Trace Enhancement
**Goal**: Enhance stack traces with source maps

**Unit Test Spec** (`tests/unit/ts-debug-29.2.test.ts`):
```typescript
describe('Stack Trace Enhancement', () => {
  test('maps minified to original', () => {
    // bundle.js:1:1234 -> app.ts:45:10
  });
  
  test('handles missing source maps', () => {
    // Graceful fallback
  });
  
  test('adds code snippets', () => {
    // Show code at each frame
  });
});
```

**Pure Function**:
```typescript
export interface EnhancedStackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  originalLocation?: SourceLocation;
  codeSnippet?: string;
}

export function enhanceStackTrace(
  frames: StackFrame[],
  sourceMapCache: Map<string, SourceMap>
): EnhancedStackFrame[] {
  // Map and enhance frames
}
```

### Task ts-debug-29.3: Root Cause Analysis
**Goal**: Analyze root cause of errors

**Unit Test Spec** (`tests/unit/ts-debug-29.3.test.ts`):
```typescript
describe('Root Cause Analysis', () => {
  test('identifies null reference cause', () => {
    // Trace where null originated
  });
  
  test('identifies type mismatches', () => {
    // Where wrong type introduced
  });
  
  test('suggests fixes', () => {
    // Common fix patterns
  });
});
```

### Task ts-debug-29.4: Execution Path Tracer
**Goal**: Trace execution leading to errors

**Unit Test Spec** (`tests/unit/ts-debug-29.4.test.ts`):
```typescript
describe('Execution Path Tracing', () => {
  test('reconstructs execution path', () => {
    // Function call sequence
  });
  
  test('includes async operations', () => {
    // Promise chains tracked
  });
  
  test('measures execution time', () => {
    // Performance bottlenecks
  });
});
```

## Phase 30: Event Monitoring

### Task ts-debug-30.1: Event Monitor Schema
**Goal**: Define event monitoring tool

**Unit Test Spec** (`tests/unit/ts-debug-30.1.test.ts`):
```typescript
describe('Event Monitor Schema', () => {
  test('event type categories', () => {
    // DOM, network, console, errors
  });
  
  test('filtering options', () => {
    // By type, URL pattern, etc.
  });
  
  test('real-time streaming', () => {
    // Live updates vs buffered
  });
});
```

### Task ts-debug-30.2: DOM Event Monitoring
**Goal**: Monitor DOM events and mutations

**Unit Test Spec** (`tests/unit/ts-debug-30.2.test.ts`):
```typescript
describe('DOM Event Monitoring', () => {
  test('captures click events', async () => {
    // Element, coordinates, modifiers
  });
  
  test('captures mutations', async () => {
    // Added/removed/changed nodes
  });
  
  test('filters by selector', () => {
    // Only specific elements
  });
});
```

### Task ts-debug-30.3: Network Event Stream
**Goal**: Stream network events in real-time

**Unit Test Spec** (`tests/unit/ts-debug-30.3.test.ts`):
```typescript
describe('Network Event Stream', () => {
  test('streams requests', async () => {
    // URL, method, headers
  });
  
  test('streams responses', async () => {
    // Status, timing, size
  });
  
  test('applies throttling', () => {
    // EVENT_STREAM_THROTTLING respected
  });
});
```

### Task ts-debug-30.4: State Change Watcher
**Goal**: Watch variables for changes

**Unit Test Spec** (`tests/unit/ts-debug-30.4.test.ts`):
```typescript
describe('State Change Watcher', () => {
  test('detects value changes', () => {
    // Polling comparison
  });
  
  test('tracks object mutations', () => {
    // Deep comparison
  });
  
  test('records change history', () => {
    // Timeline of changes
  });
});
```

**Pure Function**:
```typescript
export interface StateChange {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export function detectChanges(
  oldState: any,
  newState: any,
  path: string = ''
): StateChange[] {
  // Deep diff algorithm
}
```

## Phase 31: Code Intelligence

### Task ts-debug-31.1: AST Analysis Integration
**Goal**: Parse and analyze code structure

**Unit Test Spec** (`tests/unit/ts-debug-31.1.test.ts`):
```typescript
describe('AST Analysis', () => {
  test('parses function definitions', () => {
    // Name, params, body location
  });
  
  test('identifies dependencies', () => {
    // Import/require statements
  });
  
  test('maps code locations', () => {
    // AST node -> line/column
  });
});
```

### Task ts-debug-31.2: Complexity Analysis
**Goal**: Analyze code complexity metrics

**Unit Test Spec** (`tests/unit/ts-debug-31.2.test.ts`):
```typescript
describe('Complexity Analysis', () => {
  test('calculates cyclomatic complexity', () => {
    // Decision points counted
  });
  
  test('identifies complex functions', () => {
    // Threshold exceeded warnings
  });
  
  test('suggests refactoring', () => {
    // Extract method, etc.
  });
});
```

### Task ts-debug-31.3: Quality Check Engine
**Goal**: Check code quality issues

**Unit Test Spec** (`tests/unit/ts-debug-31.3.test.ts`):
```typescript
describe('Quality Checks', () => {
  test('detects unused variables', () => {
    // Declared but not used
  });
  
  test('detects unreachable code', () => {
    // After return/throw
  });
  
  test('checks naming conventions', () => {
    // camelCase, etc.
  });
});
```

## Implementation Order & Dependencies

### Recommended Sequence:

1. **Foundation Phase (Week 1-2)**
   - Event System Enhancement (builds on v1.1 monitoring)
   - State Management Layer (required for all features)

2. **Code Modification Phase (Week 3-4)**
   - Tasks 26.1-26.6 (Code modification foundation)
   - Critical for LLM fix application

3. **Debugging Control Phase (Week 5-6)**
   - Tasks 27.1-27.4 (Breakpoints and stepping)
   - Tasks 28.1-28.5 (Variable inspection)

4. **Analysis Phase (Week 7-8)**
   - Tasks 29.1-29.4 (Error analysis)
   - Tasks 30.1-30.4 (Event monitoring)

5. **Intelligence Phase (Week 9-10)**
   - Tasks 31.1-31.3 (Code intelligence)
   - Integration with Intelligence Layer

## Success Metrics

- All unit tests passing (100% coverage)
- All pure functions have no side effects
- Integration tests for each phase
- Performance benchmarks:
  - Code modification: <500ms
  - Variable inspection: <100ms
  - Event streaming: <10ms latency
- Memory limits:
  - Event buffer: <10MB
  - State snapshots: <5MB each