# Chrome Lens v1.2 Implementation Prompt Document

## Context

You are implementing Chrome Lens v1.2, which adds two major feature sets to the existing v1.1 debugging platform:

1. **Intelligence Layer**: AI-driven debugging strategies and workflow orchestration
2. **LLM Debugging**: Real-time code modification and advanced debugging controls

## Current State (v1.1.1)

Chrome Lens is a Chrome DevTools MCP (Model Context Protocol) Server that provides:
- 18 working tools for browser debugging
- ES module architecture (`"type": "module"`)
- TypeScript-only codebase
- ~98% success rate in production
- Node.js 22.x requirement

### Key Architecture Decisions from v1.1.1:
- Pure functions for all utilities
- TDD methodology (RED-GREEN-REFACTOR)
- Comprehensive error messages with suggestions
- Response size management through pagination
- Connection reliability with retry logic

## Implementation Guidelines

### 1. Test-Driven Development (MANDATORY)

**Every task MUST follow**:
```
1. RED: Write failing tests first
2. GREEN: Write minimal code to pass
3. REFACTOR: Improve while keeping tests green
```

### 2. Pure Functions Priority

**Prefer pure functions**:
```typescript
// ✅ GOOD - Pure function
export function calculateComplexity(ast: ASTNode): number {
  // No side effects, deterministic
  return complexity;
}

// ❌ BAD - Side effects
function updateComplexity(ast: ASTNode): void {
  globalComplexity = calculate(ast); // Side effect!
}
```

### 3. Error Handling Pattern

Follow v1.1.1's successful pattern:
```typescript
{
  success: false,
  error: {
    type: 'SpecificErrorType',
    message: 'User-friendly description',
    availableSources?: [...],  // Show alternatives
    hint: 'Use list_source_files to discover files'
  }
}
```

### 4. Tool Definition Pattern

All new tools follow this structure:
```typescript
{
  name: 'tool_name',
  description: 'Clear description for LLM understanding',
  inputSchema: {
    type: 'object',
    properties: {
      requiredParam: {
        type: 'string',
        description: 'What this parameter does',
        pattern: '^[A-F0-9]{32}$'  // Validation
      },
      optionalParam: {
        type: 'boolean',
        default: true,
        description: 'Optional with default'
      }
    },
    required: ['requiredParam']
  }
}
```

### 5. Environment Variables

All configuration through .env:
```env
# Feature flags
FEATURE_ENABLED=true

# Limits and thresholds  
MAX_ITEMS=100
TIMEOUT_MS=5000

# Paths
STORAGE_PATH=./data
```

## Implementation Sequence

### Phase 1: Foundation (Required First)

Before implementing v1.2 features, ensure:

1. **Event System Enhancement**
   - Builds on v1.1's monitoring
   - Required for both Intelligence and LLM features
   - Pure event streaming architecture

2. **State Management Layer**
   - Centralized state for all features
   - Event sourcing for time travel
   - Required for session persistence

### Phase 2: Choose Path

After foundation, implement EITHER:

**Option A: Intelligence Layer First (Recommended)**
- Lower risk (no code modification)
- Provides immediate value
- Helps debug the LLM features later

**Option B: LLM Debugging First**
- Higher risk (modifies live code)
- More complex testing
- Bigger impact when working

### Phase 3: Integration

Combine both layers for full v1.2 capabilities.

## Key Technical Patterns

### 1. Chrome DevTools Protocol (CDP)

```typescript
// Pattern for CDP calls
const client = this.clients.get(tabId);
if (!client) {
  return { success: false, error: { type: 'TabNotConnected' } };
}

try {
  const result = await client.Domain.method(params);
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: { type: 'CDPError', message: error.message } };
}
```

### 2. Tab ID Validation

```typescript
// Chrome tab IDs are 32-character hex strings
if (!/^[A-F0-9]{32}$/i.test(tabId)) {
  throw new Error(`Invalid tab ID format: ${tabId}`);
}
```

### 3. Pagination Pattern (from v1.1.1)

```typescript
export function paginateResults<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  // Smart size-aware pagination
}
```

### 4. Retry Pattern (from v1.1.1)

```typescript
export function createRetryWrapper<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): () => Promise<T> {
  // Exponential backoff retry
}
```

## Common CDP Domains

### For Intelligence Layer:
- `Runtime`: Evaluate expressions, get properties
- `Debugger`: Source code analysis
- `Profiler`: Performance metrics

### For LLM Debugging:
- `Debugger`: Breakpoints, stepping, source modification
- `Runtime`: Variable inspection, expression evaluation
- `DOM`: Event monitoring, mutations
- `Network`: Request/response tracking
- `HeapProfiler`: Memory analysis

## Testing Requirements

### Unit Tests
- 100% coverage for new code
- Test both positive and negative cases
- Mock all external dependencies
- Use pure functions to simplify testing

### Integration Tests
- Test actual CDP interactions
- Verify tool registration
- Check error handling paths

### Performance Tests
- Strategy generation: <100ms
- Code modification: <500ms
- Variable inspection: <100ms

## Security Considerations

### Code Modification
- Validate all URLs before modification
- Backup original source
- Syntax validation before applying
- Rollback on errors

### Expression Evaluation
- Sanitize user expressions
- Prevent infinite loops
- Limit execution time
- No access to sensitive globals

## v1.2 Success Criteria

### Intelligence Layer
- Strategy suggestions with >80% success rate
- Session persistence across debugging sessions
- Impact predictions with >75% accuracy
- Generated tests with >90% coverage

### LLM Debugging
- Code modifications apply in <500ms
- Breakpoint operations work reliably
- Variable inspection with full context
- Real-time event streaming

## Common Pitfalls to Avoid

1. **Module Format**: Keep `"type": "module"` in package.json
2. **Tool Registration**: Call `setupToolHandlers()` in constructor
3. **Validation**: Always validate inputs before CDP calls
4. **State Management**: Clean up resources on disconnect
5. **Error Messages**: Provide actionable hints
6. **Testing**: Write tests FIRST, not after

## Reference Implementation

Look at these v1.1.1 implementations for patterns:
- `/src/utils/pagination.ts` - Pure function architecture
- `/src/utils/retry-wrapper.ts` - Connection reliability
- `/src/utils/code-validation.ts` - Validation strategies
- `server.ts` - Tool registration and error handling

## Questions to Ask

Before implementing each task:
1. Have I written the failing tests first?
2. Is this a pure function where possible?
3. Are errors handled with helpful messages?
4. Is configuration through environment variables?
5. Have I validated all inputs?
6. Are there security implications?

## Final Notes

- Start small, test everything
- Follow existing patterns from v1.1.1
- When in doubt, check the test files
- Performance matters - profile if needed
- Keep the success rate at ~98%+