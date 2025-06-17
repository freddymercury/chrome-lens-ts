# Merge Resolution Guide for v1.2.1 → main

## Current Status
The merge from v1.2.1 to main is almost complete. Only `server.ts` has conflicts that need manual resolution.

## Test File Resolution (COMPLETED)
- Removed conflicting `tests/unit/ts-intel-21.1.test.ts` 
- Created new `tests/unit/ts-intel-strategy.test.ts` for intelligence layer tests from main
- This keeps v1.2.1 DOM agent tests separate from v1.2 intelligence layer tests

## Server.ts Conflicts

### Conflict 1: Lines 1334-1383 (Tool Definition)
**v1.2.1 (HEAD)** has:
- Inline definition of `suggest_debugging_strategy` tool with all properties

**main** has:
- `createStrategyToolSchema()` function call that returns the same tool definition

**Resolution**: Use main's approach with `createStrategyToolSchema()` since it's cleaner and already imported

### Conflict 2: Lines 8126-8341 (Missing content)
**v1.2.1 (HEAD)** has:
- Implementation of `suggestDebuggingStrategy` method

**main** has:
- Empty section (likely the implementation was moved to strategy-tool-handler.ts)

**Resolution**: Remove the v1.2.1 implementation since main uses StrategyToolHandler class

### Conflict 3: Lines 8346-8522 (Implementation details)
**v1.2.1 (HEAD)** has:
- Detailed implementation of debugging strategy generation
- Category-specific steps
- Tool recommendations

**main** has:
- Delegates to `this.strategyToolHandler.handleStrategyRequest(parameters)`

**Resolution**: Use main's approach that delegates to StrategyToolHandler

## How to Complete the Merge

1. Review the conflicts in `server.ts`
2. For each conflict, choose main's version (uses the modular intelligence layer architecture)
3. After resolving conflicts:
   ```bash
   git add server.ts
   git commit
   ```

## What Changed
- v1.2.1 originally had suggest_debugging_strategy implementation directly in server.ts
- main (v1.2) refactored this into a proper intelligence layer with separate modules
- The functionality is the same, but main's architecture is cleaner and more maintainable