/**
 * Pure functions for code validation and modification logic
 * These functions have no side effects and are easily testable
 */

export interface ValidationParams {
  skipValidation?: boolean;
  validateSyntax?: boolean;
  autoDetectRuntime?: boolean;
}

export interface FileTypeInfo {
  type: 'typescript' | 'javascript' | 'css' | 'json' | 'unknown';
  isTypeScript: boolean;
  isJavaScript: boolean;
  requiresTranspilation: boolean;
}

/**
 * Determine if validation should be skipped based on parameters
 */
export function shouldSkipValidation(params: ValidationParams): boolean {
  const { skipValidation = false, validateSyntax = true } = params;
  return skipValidation || !validateSyntax;
}

/**
 * Detect file type from URL or filename
 */
export function detectFileType(url: string): FileTypeInfo {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.endsWith('.ts') || lowerUrl.endsWith('.tsx')) {
    return {
      type: 'typescript',
      isTypeScript: true,
      isJavaScript: false,
      requiresTranspilation: true
    };
  }
  
  if (lowerUrl.endsWith('.js') || lowerUrl.endsWith('.jsx')) {
    return {
      type: 'javascript',
      isTypeScript: false,
      isJavaScript: true,
      requiresTranspilation: lowerUrl.endsWith('.jsx')
    };
  }
  
  if (lowerUrl.endsWith('.css')) {
    return {
      type: 'css',
      isTypeScript: false,
      isJavaScript: false,
      requiresTranspilation: false
    };
  }
  
  if (lowerUrl.endsWith('.json')) {
    return {
      type: 'json',
      isTypeScript: false,
      isJavaScript: false,
      requiresTranspilation: false
    };
  }
  
  return {
    type: 'unknown',
    isTypeScript: false,
    isJavaScript: false,
    requiresTranspilation: false
  };
}

/**
 * Detect if code is meant for runtime execution vs development
 */
export function isRuntimeCode(content: string): boolean {
  // Runtime indicators - code that's meant to be executed immediately
  const runtimePatterns = [
    /console\./,
    /document\./,
    /window\./,
    /alert\(/,
    /prompt\(/,
    /confirm\(/,
    /eval\(/,
    /Function\(/,
    /setTimeout\(/,
    /setInterval\(/,
    /\$\(/,  // jQuery
    /getElementById/,
    /querySelector/,
    /addEventListener/
  ];
  
  // Development indicators - code that needs compilation/bundling
  const devPatterns = [
    /^import\s+/m,
    /^export\s+/m,
    /^interface\s+/m,
    /^type\s+[A-Z]/m,
    /^enum\s+/m,
    /^declare\s+/m,
    /^namespace\s+/m,
    /^module\s+/m,
    /<[A-Z]\w*[^>]*>/  // JSX components
  ];
  
  const hasRuntimeCode = runtimePatterns.some(pattern => pattern.test(content));
  const hasDevCode = devPatterns.some(pattern => pattern.test(content));
  
  // If it has runtime patterns and no dev patterns, it's likely runtime code
  return hasRuntimeCode && !hasDevCode;
}

/**
 * Determine validation strategy based on content and file type
 */
export function getValidationStrategy(
  content: string,
  fileType: FileTypeInfo,
  params: ValidationParams
): 'skip' | 'runtime' | 'full' {
  // Explicit skip requested
  if (shouldSkipValidation(params)) {
    return 'skip';
  }
  
  // Auto-detect runtime code
  if (params.autoDetectRuntime && fileType.isJavaScript && isRuntimeCode(content)) {
    return 'runtime';
  }
  
  // TypeScript always needs full validation (or skip)
  if (fileType.isTypeScript) {
    return 'full';
  }
  
  // Default to full validation
  return 'full';
}

/**
 * Validate CSS syntax (pure function)
 */
export function validateCSS(content: string): { valid: boolean; error?: string } {
  // Remove comments for validation
  const cleanCSS = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Check for empty values
  if (cleanCSS.match(/:\s*;/)) {
    return {
      valid: false,
      error: 'CSS contains empty property values'
    };
  }
  
  // Check for unclosed braces
  const openBraces = (cleanCSS.match(/{/g) || []).length;
  const closeBraces = (cleanCSS.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    return {
      valid: false,
      error: `CSS has ${openBraces} opening braces but ${closeBraces} closing braces`
    };
  }
  
  // Check for unclosed strings
  const quotes = cleanCSS.match(/["'][^"']*$/);
  if (quotes) {
    return {
      valid: false,
      error: 'CSS contains unclosed string'
    };
  }
  
  return { valid: true };
}

/**
 * Validate JSON syntax (pure function)
 */
export function validateJSON(content: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: `JSON parse error: ${error.message}`
    };
  }
}

/**
 * Extract error location from error message
 */
export function extractErrorLocation(errorMessage: string): {
  line?: number;
  column?: number;
} {
  // Try to extract line and column from common error formats
  const lineMatch = errorMessage.match(/line\s+(\d+)/i);
  const colMatch = errorMessage.match(/col(?:umn)?\s+(\d+)/i);
  
  const result: { line?: number; column?: number } = {};
  
  if (lineMatch) {
    result.line = parseInt(lineMatch[1], 10);
  }
  
  if (colMatch) {
    result.column = parseInt(colMatch[1], 10);
  }
  
  return result;
}

/**
 * Check if content needs transpilation
 */
export function needsTranspilation(content: string, fileType: FileTypeInfo): boolean {
  if (fileType.requiresTranspilation) {
    return true;
  }
  
  // Check for JSX in JavaScript files
  if (fileType.isJavaScript && /<[A-Z]\w*[^>]*>/.test(content)) {
    return true;
  }
  
  // Check for TypeScript syntax in JavaScript files
  const tsPatterns = [
    /:\s*(?:string|number|boolean|any|void|never)/,
    /interface\s+\w+/,
    /type\s+\w+\s*=/,
    /<\w+>/  // Generic types
  ];
  
  if (fileType.isJavaScript && tsPatterns.some(p => p.test(content))) {
    return true;
  }
  
  return false;
}

/**
 * Create a validation result object
 */
export function createValidationResult(
  valid: boolean,
  error?: string,
  details?: {
    errorType?: string;
    lineNumber?: number;
    columnNumber?: number;
    validationSkipped?: boolean;
    runtimeCodeDetected?: boolean;
  }
): any {
  if (valid) {
    return { 
      valid: true,
      ...details
    };
  }
  
  const location = error ? extractErrorLocation(error) : {};
  
  return {
    valid: false,
    error: error || 'Validation failed',
    errorType: details?.errorType || 'ValidationError',
    lineNumber: details?.lineNumber || location.line,
    columnNumber: details?.columnNumber || location.column,
    ...details
  };
}