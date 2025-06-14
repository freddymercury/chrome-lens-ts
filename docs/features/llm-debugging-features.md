# Chrome Lens v1.1 - LLM Debugging Features

## Overview

Chrome Lens v1.1 transforms the MCP server from a monitoring tool into a comprehensive LLM-driven debugging environment. This document details the new debugging capabilities that enable AI agents to understand, analyze, and modify application code in real-time.

## Core Philosophy

**LLMs work at the code level, not the UI level**. This version prioritizes tools that enable AI agents to:
- Understand application state through runtime inspection
- Modify code and see changes immediately
- Debug issues through intelligent analysis
- Validate fixes through automated testing

## New Tools Summary

### Phase 16: Real-time Code Modification
1. **modify_source_code** - Live code editing with hot reload capabilities

### Phase 17: Breakpoint Management
2. **manage_breakpoints** - Set, remove, and manage debugging breakpoints
3. **debug_step_control** - Step through code execution (over, into, out)

### Phase 18: Runtime Variable Inspection
4. **inspect_variables** - Examine variables and scope chains during debugging
5. **analyze_runtime_state** - Comprehensive runtime state analysis

### Phase 19: Enhanced Error Analysis
6. **analyze_errors** - Intelligent error analysis with source mapping

### Phase 20: Live Development Workflow
7. **monitor_events** - Real-time event monitoring during development
8. **watch_state_changes** - Track variable and object state changes

## Tool Specifications

### modify_source_code

Enables real-time source code modification with immediate effect in the browser.

**Parameters:**
- `tabId` (string): Target tab identifier
- `sourceId` (string): Script ID or URL pattern to identify the source file
- `newContent` (string): Modified source code content
- `hotReload` (boolean): Whether to trigger hot reload after modification
- `validateSyntax` (boolean): Validate syntax before applying changes

**Returns:**
- `success` (boolean): Whether modification was successful
- `error` (string?): Error message if modification failed
- `reloadRequired` (boolean): Whether page reload is needed
- `affectedModules` (string[]): List of affected module IDs

### manage_breakpoints

Comprehensive breakpoint management for debugging workflows.

**Parameters:**
- `tabId` (string): Target tab identifier
- `operation` (enum): 'set' | 'remove' | 'list' | 'enable' | 'disable'
- `location` (object?): Breakpoint location for set operation
  - `url` (string): Source file URL
  - `lineNumber` (number): Line number (1-indexed)
  - `columnNumber` (number?): Optional column number
- `condition` (string?): Conditional breakpoint expression
- `logMessage` (string?): Log message for logpoint

**Returns:**
- `breakpointId` (string?): ID of created/modified breakpoint
- `breakpoints` (array?): List of all breakpoints (for list operation)
- `success` (boolean): Operation success status

### debug_step_control

Control debugging execution flow with step operations.

**Parameters:**
- `tabId` (string): Target tab identifier
- `stepType` (enum): 'over' | 'into' | 'out' | 'continue' | 'pause'
- `sessionId` (string?): Debug session identifier

**Returns:**
- `paused` (boolean): Whether execution is paused
- `location` (object?): Current execution location
- `callStack` (array?): Current call stack if paused

### inspect_variables

Inspect variables and scope chains at current execution point.

**Parameters:**
- `tabId` (string): Target tab identifier
- `scope` (enum): 'local' | 'closure' | 'global' | 'all'
- `variableName` (string?): Specific variable to inspect
- `depth` (number): Object traversal depth (default: 3)
- `includeGetters` (boolean): Whether to invoke getter properties

**Returns:**
- `variables` (object): Variable values organized by scope
- `thisObject` (object?): Current 'this' binding
- `returnValue` (any?): Return value if at return point

### analyze_runtime_state

Comprehensive runtime state analysis for deep debugging insights.

**Parameters:**
- `tabId` (string): Target tab identifier
- `analysisScope` (enum): 'current' | 'full' | 'memory'
- `includeCallStack` (boolean): Include full call stack analysis
- `includeHeapSnapshot` (boolean): Include heap snapshot data
- `performanceMetrics` (boolean): Include performance data

**Returns:**
- `executionContext` (object): Current execution context details
- `memoryUsage` (object): Memory usage statistics
- `activeTimers` (array): Active timers and intervals
- `eventListeners` (array): Registered event listeners
- `asyncOperations` (array): Pending async operations

### analyze_errors

Intelligent error analysis with source mapping and context.

**Parameters:**
- `tabId` (string): Target tab identifier
- `errorId` (string?): Specific error to analyze
- `includeSourceMap` (boolean): Resolve source maps
- `contextLines` (number): Lines of context around error
- `suggestFixes` (boolean): Generate fix suggestions

**Returns:**
- `error` (object): Error details with stack trace
- `sourceContext` (object): Source code context
- `relatedErrors` (array): Related or similar errors
- `suggestedFixes` (array?): AI-generated fix suggestions

### monitor_events

Real-time event monitoring for development workflows.

**Parameters:**
- `tabId` (string): Target tab identifier
- `eventTypes` (array): Event categories to monitor
- `filter` (object?): Event filtering rules
- `correlationId` (string?): Correlation ID for event grouping
- `throttle` (number?): Throttling interval in ms

**Returns:**
- `monitoringId` (string): Monitoring session identifier
- `eventStream` (boolean): Whether streaming is active

### watch_state_changes

Monitor specific variables and objects for state changes.

**Parameters:**
- `tabId` (string): Target tab identifier
- `target` (string): Variable path or object identifier
- `expression` (string?): Watch expression
- `changeType` (enum): 'any' | 'value' | 'property' | 'structure'
- `includeHistory` (boolean): Track change history

**Returns:**
- `watchId` (string): Watch identifier
- `currentValue` (any): Current value of watched target
- `changeCount` (number): Number of changes detected

## Usage Examples

### Debugging a React Component

```typescript
// 1. Set breakpoint in component render
await manage_breakpoints({
  tabId: "tab123",
  operation: "set",
  location: {
    url: "components/UserProfile.tsx",
    lineNumber: 45
  }
});

// 2. Inspect component state when breakpoint hits
await inspect_variables({
  tabId: "tab123",
  scope: "local",
  variableName: "state",
  depth: 5
});

// 3. Modify component code to fix issue
await modify_source_code({
  tabId: "tab123",
  sourceId: "components/UserProfile.tsx",
  newContent: updatedComponentCode,
  hotReload: true
});

// 4. Watch for state changes
await watch_state_changes({
  tabId: "tab123",
  target: "window.React.components.UserProfile.state",
  changeType: "any",
  includeHistory: true
});
```

### Analyzing Performance Issues

```typescript
// 1. Monitor events during slow operation
await monitor_events({
  tabId: "tab123",
  eventTypes: ["DOM", "network", "timer"],
  throttle: 100
});

// 2. Analyze runtime state during operation
const state = await analyze_runtime_state({
  tabId: "tab123",
  analysisScope: "full",
  includeCallStack: true,
  performanceMetrics: true
});

// 3. Identify bottleneck and modify code
await modify_source_code({
  tabId: "tab123",
  sourceId: state.bottleneck.sourceFile,
  newContent: optimizedCode,
  hotReload: true
});
```

### Intelligent Error Debugging

```typescript
// 1. Capture and analyze error
const errorAnalysis = await analyze_errors({
  tabId: "tab123",
  includeSourceMap: true,
  contextLines: 10,
  suggestFixes: true
});

// 2. Apply suggested fix
if (errorAnalysis.suggestedFixes.length > 0) {
  await modify_source_code({
    tabId: "tab123",
    sourceId: errorAnalysis.error.sourceFile,
    newContent: errorAnalysis.suggestedFixes[0].code,
    hotReload: true,
    validateSyntax: true
  });
}

// 3. Verify fix by monitoring
await monitor_events({
  tabId: "tab123",
  eventTypes: ["errors"],
  correlationId: errorAnalysis.error.id
});
```

## Environment Configuration

All debugging features are configurable through environment variables:

```bash
# Code Modification
CODE_MODIFICATION_ENABLED=true
HOT_RELOAD_TIMEOUT=5000
CODE_VALIDATION_STRICT=true
CODE_RELOAD_STRATEGY=hot

# Debugging
DEBUGGER_ENABLED=true
BREAKPOINT_TIMEOUT=30000
BREAKPOINT_PERSISTENCE=session
DEBUG_STEP_TIMEOUT=5000
DEBUG_SESSION_TIMEOUT=1800000

# Variable Inspection
VARIABLE_INSPECTION_DEPTH=5
SCOPE_ANALYSIS_ENABLED=true
OBJECT_TRAVERSAL_DEPTH=10

# Runtime Analysis
RUNTIME_STATE_TIMEOUT=10000
STATE_ANALYSIS_DEPTH=medium
CALL_STACK_DEPTH=50

# Error Analysis
ERROR_ANALYSIS_ENABLED=true
SOURCE_MAP_RESOLUTION=true
ERROR_SUGGESTION_ENABLED=true
ERROR_CONTEXT_DEPTH=10

# Event Monitoring
EVENT_MONITORING_ENABLED=true
EVENT_FILTER_RULES=strict
EVENT_CORRELATION_TIMEOUT=60000

# State Watching
STATE_WATCH_ENABLED=true
CHANGE_DETECTION_INTERVAL=100
STATE_HISTORY_SIZE=100
```

## Performance Considerations

1. **Code Modification**: Hot reload is faster than full page reload but may not work for all changes
2. **Breakpoints**: Too many breakpoints can slow down execution
3. **Variable Inspection**: Deep object traversal can be memory-intensive
4. **Event Monitoring**: High-frequency events should be throttled
5. **State Watching**: Watching large objects can impact performance

## Security Considerations

1. **Code Modification**: Only available in development environments
2. **Variable Inspection**: May expose sensitive data
3. **Source Maps**: Should not be exposed in production
4. **Event Monitoring**: Can capture sensitive user interactions
5. **Runtime State**: May include authentication tokens or secrets

## Integration with Existing Tools

The v1.1 debugging tools integrate seamlessly with existing v1.0 tools:

- **list_source_files** → **modify_source_code**: Source discovery to modification
- **get_console_messages** → **analyze_errors**: Console to error analysis
- **execute_js** → **inspect_variables**: Script execution to state inspection
- **get_performance_metrics** → **analyze_runtime_state**: Metrics to deep analysis

## Best Practices

1. **Use TDD**: Write tests before implementing debugging workflows
2. **Start Small**: Begin with simple debugging scenarios
3. **Correlate Data**: Use correlation IDs to link related debugging data
4. **Clean Up**: Remove breakpoints and watches when done
5. **Monitor Performance**: Watch for performance impact of debugging tools