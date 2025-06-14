# Request for Proposal: Chrome Lens v1.1.1 Bug Fixes

**Document Version**: 1.0  
**Date**: June 14, 2025  
**Project**: Chrome Lens MCP Server  
**Current Version**: v1.1  
**Target Version**: v1.1.1  
**Priority**: CRITICAL - Blocking v1.2 Development

## Executive Summary

Chrome Lens v1.1 has three critical features with 0% success rates that must be fixed before proceeding to v1.2. These features are foundational to the LLM debugging workflow and their failure blocks the entire v1.2 roadmap. This RFP outlines the specific requirements, use cases, and acceptance criteria for fixing these issues.

## Background

Recent testing of Chrome Lens v1.1 against the BetFarm application (25 iterations) revealed:
- **11 of 14 features working perfectly** (78.6% success rate)
- **3 features completely broken** (0% success rate)
- These 3 features are dependencies for v1.2's advanced debugging capabilities

## Scope of Work

### 1. Source File Listing Fix

**Current State**:
- Error: "DOM agent needs to be enabled first"
- Success Rate: 0/25 iterations (0%)
- Tool: `list_source_files`

**Root Cause Analysis**:
- DOM agent is not automatically enabled when the tool is called
- The feature requires manual DOM.enable() call before use
- No auto-initialization logic exists

**Requirements**:
1. Automatically enable DOM agent when `list_source_files` is called
2. Maintain DOM agent state across multiple calls
3. Handle cases where DOM agent is already enabled
4. Provide meaningful error messages if DOM operations fail

**Use Cases**:
- **UC1.1**: LLM requests list of all JavaScript files in current tab
- **UC1.2**: LLM filters source files by type (js, ts, css, html)
- **UC1.3**: LLM requests source file content for analysis
- **UC1.4**: Multiple consecutive calls without re-initialization

**Technical Implementation**:
```typescript
// Before source file listing
if (!isDOMEnabled) {
  await client.send('DOM.enable');
  isDOMEnabled = true;
}
```

**Acceptance Criteria**:
- [ ] Source file listing works on first call without manual setup
- [ ] Subsequent calls work without re-enabling DOM
- [ ] Returns array of source files with URLs and types
- [ ] Graceful error handling with actionable messages
- [ ] 100% success rate across 25 test iterations

### 2. Code Modification Fix

**Current State**:
- Error: "Validation failed: Uncaught"
- Success Rate: 0/25 iterations (0%)
- Tool: `modify_source_code`

**Root Cause Analysis**:
- TypeScript/JSX syntax validation is rejecting valid code
- The validator doesn't understand modern JavaScript syntax
- Hot reload mechanism isn't properly integrated with bundlers

**Requirements**:
1. Support TypeScript and JSX syntax validation
2. Allow modification of TypeScript (.ts, .tsx) files
3. Integrate with common bundlers (Vite, Webpack)
4. Provide syntax error details before applying changes
5. Support rollback on failed modifications

**Use Cases**:
- **UC2.1**: LLM modifies a React component's JSX
- **UC2.2**: LLM updates TypeScript function with type annotations
- **UC2.3**: LLM adds console.log statements for debugging
- **UC2.4**: LLM modifies CSS-in-JS within components
- **UC2.5**: Failed modification rolls back automatically

**Technical Implementation**:
```typescript
// Enhance validation
const validateCode = (code: string, fileType: string) => {
  if (fileType === 'typescript' || fileType === 'tsx') {
    // Use TypeScript compiler API for validation
    return validateTypeScript(code);
  }
  // Existing JavaScript validation
  return validateJavaScript(code);
};
```

**Acceptance Criteria**:
- [ ] Successfully modifies TypeScript files (.ts, .tsx)
- [ ] Successfully modifies JSX syntax in React components
- [ ] Validates syntax before applying changes
- [ ] Provides clear error messages for invalid syntax
- [ ] Hot reload works with Vite and Webpack
- [ ] Rollback mechanism on failed modifications
- [ ] 95%+ success rate for valid code modifications

### 3. Error Analysis Fix

**Current State**:
- Issue: "Async error capture not working"
- Success Rate: 0/25 iterations (0%)
- Tool: `analyze_errors`

**Root Cause Analysis**:
- No event listeners for window.onerror
- No handler for unhandledrejection events
- Only captures synchronous console.error calls
- Missing Promise rejection tracking

**Requirements**:
1. Capture all uncaught exceptions via window.onerror
2. Capture unhandled Promise rejections
3. Maintain error history with timestamps
4. Provide stack traces with source mapping
5. Categorize errors by type (runtime, network, security)

**Use Cases**:
- **UC3.1**: LLM detects uncaught TypeError in application
- **UC3.2**: LLM captures unhandled Promise rejection
- **UC3.3**: LLM analyzes error patterns over time
- **UC3.4**: LLM gets source-mapped stack traces
- **UC3.5**: LLM filters errors by time range or type

**Technical Implementation**:
```typescript
// Install error handlers on page
await client.send('Runtime.evaluate', {
  expression: `
    window.addEventListener('error', (e) => {
      console.error('[ChromeLens:Error]', {
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack
      });
    });
    
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[ChromeLens:UnhandledRejection]', {
        reason: e.reason,
        promise: e.promise
      });
    });
  `
});
```

**Acceptance Criteria**:
- [ ] Captures window.onerror events
- [ ] Captures unhandledrejection events
- [ ] Maintains error history for time-based queries
- [ ] Provides full stack traces with source mapping
- [ ] Categorizes errors by type
- [ ] Returns non-zero error count when errors exist
- [ ] 100% capture rate for async errors

## Testing Requirements

### Test Environment
- Chrome with remote debugging enabled (port 9222)
- Test application: BetFarm (http://localhost:5174)
- Test framework: Existing Chrome Lens test suite

### Test Scenarios
1. **Source File Listing**:
   - Fresh Chrome instance (DOM not enabled)
   - Multiple consecutive calls
   - Different file type filters
   - Large applications with many source files

2. **Code Modification**:
   - Modify React component with JSX
   - Modify TypeScript with interfaces
   - Add/remove console.log statements
   - Syntax error handling
   - Hot reload verification

3. **Error Analysis**:
   - Throw uncaught exception after delay
   - Reject Promise without catch
   - Multiple errors in sequence
   - Error filtering by time range

### Success Metrics
- Each feature must achieve 95%+ success rate
- 25 consecutive test iterations without failure
- No regression in working features
- Performance impact < 50ms per operation

## Deliverables

1. **Code Changes**:
   - Fixed source file listing with auto-DOM enablement
   - TypeScript/JSX-aware code modification
   - Async error capture implementation

2. **Tests**:
   - Unit tests for each fix
   - Integration tests with BetFarm
   - 25-iteration stress test

3. **Documentation**:
   - Updated API documentation
   - Migration notes for v1.1 users
   - Known limitations (if any)

## Timeline

**Estimated Effort**: 2-3 days
- Day 1: Source file listing and error analysis fixes
- Day 2: Code modification TypeScript/JSX support
- Day 3: Testing, documentation, and validation

## Dependencies

- Access to Chrome Lens v1.1 source code
- Chrome DevTools Protocol documentation
- TypeScript compiler API (for validation)
- Test environment with BetFarm application

## Risk Mitigation

1. **DOM Agent State**: Track enablement state to prevent duplicate calls
2. **TypeScript Validation**: Use official TypeScript compiler API
3. **Error Handler Conflicts**: Check for existing handlers before installing
4. **Performance Impact**: Implement caching for repeated operations

## Acceptance Process

1. Developer implements fixes in feature branch
2. Run 25-iteration test suite
3. Code review focusing on error handling
4. Merge to v1.1.1 release branch
5. Tag release after successful validation

## Contact Information

**Project Owner**: Chrome Lens Development Team  
**Technical Lead**: [Assigned Developer]  
**QA Lead**: [Assigned Tester]  
**Deadline**: Before v1.2 development begins

---

*This RFP represents the minimum requirements for v1.1.1. Additional improvements are welcome but should not delay these critical fixes.*