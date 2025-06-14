# Chrome Lens v1.1.1 - Critical Bug Fixes

## 🧪 **TEST DRIVEN DEVELOPMENT (TDD) REQUIRED**
**ALL TASKS MUST FOLLOW RED-GREEN-REFACTOR CYCLE**
- **RED**: Write failing tests first that define expected behavior (in TypeScript)
- **GREEN**: Write minimal TypeScript code to make tests pass  
- **REFACTOR**: Improve code quality while keeping tests green

## 📋 **ADDITIONAL REQUIREMENTS**
- **Node.js**: v22.x (LTS as of June 2025)
- **Testing**: All bug fixes must include regression tests
- **Success Rate**: Each fix must achieve 95%+ success rate across 25 iterations
- **Environment**: Use `.env` for all configuration values

## 🎯 **OBJECTIVE: FIX CRITICAL v1.1 FEATURES**
Based on BetFarm testing results showing 0% success rates for three critical features that block v1.2 development.

---

## v1.1.1-BF1: Source File Listing - DOM Agent Initialization

### Task v1.1.1-BF1.1: Add DOM Agent Auto-Enable Logic
**Goal**: Automatically enable DOM agent when list_source_files is called
**TDD**: Write tests that verify DOM agent is enabled before listing files
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF1.1.test.ts`
- Test DOM agent is enabled on first call
- Test subsequent calls don't re-enable if already enabled
- Test error handling when DOM.enable fails
**Test**: Verify isDOMEnabled flag is set and DOM.enable is called correctly
**Code**: Add DOM enablement check before DOM.getDocument in list_source_files
**Start**: Tool fails with "DOM agent needs to be enabled first"
**End**: Tool automatically enables DOM agent when needed

### Task v1.1.1-BF1.2: Implement DOM State Tracking
**Goal**: Track DOM agent state across multiple tool calls
**TDD**: Test state persistence between calls
**Environment**: `process.env.DOM_STATE_CACHE_TTL` (default: 300000ms)
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF1.2.test.ts`
- Test state flag persists across calls
- Test state resets on new tab connection
- Test concurrent call handling
**Test**: Verify DOM state is maintained correctly
**Code**: Add isDOMEnabled flag to tab connection state
**Start**: No state tracking exists
**End**: DOM agent state tracked per tab connection

### Task v1.1.1-BF1.3: Add Graceful Error Recovery
**Goal**: Provide meaningful errors and recovery when DOM operations fail
**TDD**: Test various failure scenarios
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF1.3.test.ts`
- Test recovery from DOM.enable failure
- Test handling of stale DOM state
- Test clear error messages for users
**Test**: Verify errors are caught and user-friendly messages returned
**Code**: Wrap DOM operations in try-catch with specific error handling
**Start**: Generic errors thrown
**End**: Specific, actionable error messages with recovery suggestions

---

## v1.1.1-BF2: Code Modification - TypeScript/JSX Support

### Task v1.1.1-BF2.1: Add TypeScript/JSX Syntax Validation
**Goal**: Support TypeScript and JSX syntax in code validation
**TDD**: Test validation of various TS/JSX constructs
**Environment**: `process.env.TS_COMPILER_OPTIONS` (default: '{"jsx": "react", "target": "es2020"}')
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF2.1.test.ts`
- Test TypeScript interface validation
- Test JSX component validation
- Test async/await syntax
- Test decorators and generics
**Test**: Verify TS/JSX code passes validation
**Code**: Integrate TypeScript compiler API for syntax validation
**Start**: Validation rejects valid TypeScript/JSX
**End**: Full TypeScript/JSX syntax support

### Task v1.1.1-BF2.2: Implement File Type Detection
**Goal**: Detect and handle different file types (.js, .ts, .jsx, .tsx)
**TDD**: Test file type detection logic
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF2.2.test.ts`
- Test .ts file detection
- Test .tsx file detection
- Test mixed file types in same session
**Test**: Verify correct validator is used based on file extension
**Code**: Add file type detection and routing to appropriate validator
**Start**: All files treated as JavaScript
**End**: Correct validation based on file type

### Task v1.1.1-BF2.3: Add Modification Rollback Support
**Goal**: Rollback changes when modification fails
**TDD**: Test rollback on various failure scenarios
**Environment**: `process.env.ENABLE_CODE_ROLLBACK` (default: 'true')
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF2.3.test.ts`
- Test rollback on syntax error
- Test rollback on runtime error
- Test rollback history limit
**Test**: Verify original code restored on failure
**Code**: Store original code and implement rollback mechanism
**Start**: Failed modifications leave broken code
**End**: Automatic rollback on modification failure

### Task v1.1.1-BF2.4: Integrate with Hot Module Reload
**Goal**: Ensure modifications trigger HMR in Vite/Webpack
**TDD**: Test HMR triggering with common bundlers
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF2.4.test.ts`
- Test Vite HMR trigger
- Test Webpack HMR trigger
- Test fallback reload mechanism
**Test**: Verify page updates without full reload
**Code**: Detect and integrate with bundler HMR APIs
**Start**: Modifications don't trigger updates
**End**: Seamless hot reload on code changes

---

## v1.1.1-BF3: Error Analysis - Async Error Capture

### Task v1.1.1-BF3.1: Install Global Error Handlers
**Goal**: Capture window.onerror and unhandledrejection events
**TDD**: Test error handler installation and capture
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF3.1.test.ts`
- Test window.onerror handler installation
- Test unhandledrejection handler installation
- Test handler doesn't override existing handlers
**Test**: Verify handlers capture all error types
**Code**: Use Runtime.evaluate to install error event listeners
**Start**: Only console.error captured
**End**: All uncaught errors captured

### Task v1.1.1-BF3.2: Implement Error History Storage
**Goal**: Store captured errors with timestamps and context
**TDD**: Test error storage and retrieval
**Environment**: `process.env.MAX_ERROR_HISTORY` (default: '1000')
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF3.2.test.ts`
- Test error storage with metadata
- Test error history limit enforcement
- Test time-based filtering
**Test**: Verify errors stored and queryable by time
**Code**: Implement circular buffer for error history
**Start**: No error history maintained
**End**: Queryable error history with metadata

### Task v1.1.1-BF3.3: Add Stack Trace Source Mapping
**Goal**: Provide source-mapped stack traces for minified code
**TDD**: Test source map resolution
**Environment**: `process.env.ENABLE_SOURCE_MAPS` (default: 'true')
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF3.3.test.ts`
- Test source map URL detection
- Test stack trace mapping
- Test fallback for missing source maps
**Test**: Verify stack traces show original source locations
**Code**: Integrate source-map library for trace resolution
**Start**: Minified stack traces
**End**: Human-readable source locations

### Task v1.1.1-BF3.4: Implement Error Categorization
**Goal**: Categorize errors by type (runtime, network, security)
**TDD**: Test error classification logic
**Unit Tests**:
- `tests/unit/task-v1.1.1-BF3.4.test.ts`
- Test runtime error categorization
- Test network error categorization
- Test security error categorization
- Test custom error types
**Test**: Verify errors correctly categorized
**Code**: Add pattern matching for error classification
**Start**: All errors treated the same
**End**: Errors categorized for easier analysis

---

## 🎯 **Completion Criteria**

### Success Metrics
- [ ] Source file listing: 100% success rate (25 iterations)
- [ ] Code modification: 95%+ success rate for valid code
- [ ] Error analysis: 100% capture rate for async errors
- [ ] All regression tests passing
- [ ] No performance regression (< 50ms overhead)

### Testing Requirements
- [ ] Unit tests for each bug fix task
- [ ] Integration tests with BetFarm application
- [ ] 25-iteration stress test for each fix
- [ ] Concurrent operation tests
- [ ] Error recovery tests

### Documentation
- [ ] Updated API documentation for fixed behaviors
- [ ] Migration notes for v1.1 → v1.1.1
- [ ] Known limitations documented
- [ ] Error message reference guide

### Deliverables
- [ ] All bug fixes implemented and tested
- [ ] Version bumped to v1.1.1
- [ ] Release notes prepared
- [ ] No regression in working v1.1 features