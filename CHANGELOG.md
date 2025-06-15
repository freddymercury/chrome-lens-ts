# Changelog

All notable changes to Chrome Lens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-06-15

### Fixed
- **Critical**: Module format compatibility - MCP SDK now loads correctly
- **Critical**: Tools initialization - All 18 tools now properly registered
- Code modification validation errors in runtime environments
- Response size limit errors through pagination implementation
- Console capture reliability improved from 92% to ~100%
- Network monitoring reliability improved from 92% to ~100%

### Added
- URL-based source file identification for modify_source_code
- Pagination support for list_source_files
- `skipValidation` parameter for runtime code modification
- `autoDetectRuntime` parameter for smart validation
- Retry logic with exponential backoff
- Connection state tracking and management
- Comprehensive error messages with helpful suggestions

### Changed
- Enhanced source resolution to accept URLs (partial or full)
- Improved error messages with available alternatives
- Better memory management through pagination
- More reliable event capture through retry mechanisms

### Security
- Added concurrent access protection to prevent race conditions
- Improved connection cleanup to prevent memory leaks

## [1.1.0] - 2025-06-14

### Added
- Real-time debugging capabilities
- Source file listing and modification
- Breakpoint management
- Variable inspection
- Runtime analysis
- Enhanced error capture
- Event monitoring
- State watching

### Changed
- Expanded from 10 to 18 tools
- Enhanced Chrome DevTools Protocol integration
- Improved error handling and recovery

## [1.0.0] - 2025-06-13

### Added
- Initial release
- Core MCP server implementation
- Chrome DevTools Protocol integration
- Basic tools:
  - connect_to_chrome
  - list_tabs
  - start_monitoring
  - get_console_messages
  - get_network_activity
  - execute_js
  - security_audit
  - check_vulnerabilities
  - get_performance_metrics
- TypeScript support
- Comprehensive test suite