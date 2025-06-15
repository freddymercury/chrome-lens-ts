import {
  shouldSkipValidation,
  detectFileType,
  isRuntimeCode,
  getValidationStrategy,
  validateCSS,
  validateJSON,
  extractErrorLocation,
  needsTranspilation,
  createValidationResult
} from '../../src/utils/code-validation';

describe('Code Validation Pure Functions', () => {
  describe('shouldSkipValidation', () => {
    test('returns true when skipValidation is true', () => {
      expect(shouldSkipValidation({ skipValidation: true })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: true, validateSyntax: true })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: true, validateSyntax: false })).toBe(true);
    });

    test('returns true when validateSyntax is false', () => {
      expect(shouldSkipValidation({ validateSyntax: false })).toBe(true);
      expect(shouldSkipValidation({ skipValidation: false, validateSyntax: false })).toBe(true);
    });

    test('returns false by default', () => {
      expect(shouldSkipValidation({})).toBe(false);
      expect(shouldSkipValidation({ skipValidation: false })).toBe(false);
      expect(shouldSkipValidation({ validateSyntax: true })).toBe(false);
      expect(shouldSkipValidation({ skipValidation: false, validateSyntax: true })).toBe(false);
    });
  });

  describe('detectFileType', () => {
    test('detects TypeScript files', () => {
      expect(detectFileType('app.ts')).toEqual({
        type: 'typescript',
        isTypeScript: true,
        isJavaScript: false,
        requiresTranspilation: true
      });
      
      expect(detectFileType('Component.tsx')).toEqual({
        type: 'typescript',
        isTypeScript: true,
        isJavaScript: false,
        requiresTranspilation: true
      });
      
      expect(detectFileType('http://localhost:3000/src/utils.TS')).toEqual({
        type: 'typescript',
        isTypeScript: true,
        isJavaScript: false,
        requiresTranspilation: true
      });
    });

    test('detects JavaScript files', () => {
      expect(detectFileType('app.js')).toEqual({
        type: 'javascript',
        isTypeScript: false,
        isJavaScript: true,
        requiresTranspilation: false
      });
      
      expect(detectFileType('Component.jsx')).toEqual({
        type: 'javascript',
        isTypeScript: false,
        isJavaScript: true,
        requiresTranspilation: true
      });
    });

    test('detects CSS files', () => {
      expect(detectFileType('styles.css')).toEqual({
        type: 'css',
        isTypeScript: false,
        isJavaScript: false,
        requiresTranspilation: false
      });
    });

    test('detects JSON files', () => {
      expect(detectFileType('config.json')).toEqual({
        type: 'json',
        isTypeScript: false,
        isJavaScript: false,
        requiresTranspilation: false
      });
    });

    test('returns unknown for unrecognized files', () => {
      expect(detectFileType('data.xml')).toEqual({
        type: 'unknown',
        isTypeScript: false,
        isJavaScript: false,
        requiresTranspilation: false
      });
    });
  });

  describe('isRuntimeCode', () => {
    test('detects runtime JavaScript code', () => {
      expect(isRuntimeCode('console.log("Hello")')).toBe(true);
      expect(isRuntimeCode('document.getElementById("app")')).toBe(true);
      expect(isRuntimeCode('window.location = "/"')).toBe(true);
      expect(isRuntimeCode('alert("Test")')).toBe(true);
      expect(isRuntimeCode('$("#button").click()')).toBe(true);
      expect(isRuntimeCode('setTimeout(() => {}, 1000)')).toBe(true);
      expect(isRuntimeCode('el.addEventListener("click", handler)')).toBe(true);
    });

    test('detects development code', () => {
      expect(isRuntimeCode('import React from "react"')).toBe(false);
      expect(isRuntimeCode('export default App')).toBe(false);
      expect(isRuntimeCode('interface Props { name: string }')).toBe(false);
      expect(isRuntimeCode('type State = { count: number }')).toBe(false);
      expect(isRuntimeCode('enum Status { Active, Inactive }')).toBe(false);
      expect(isRuntimeCode('declare module "types"')).toBe(false);
    });

    test('detects JSX as development code', () => {
      expect(isRuntimeCode('<Button onClick={handleClick} />')).toBe(false);
      expect(isRuntimeCode('return <div>Hello</div>')).toBe(false);
    });

    test('handles mixed code correctly', () => {
      const mixedWithImport = `
import React from 'react';
console.log('Debug');
export default App;
      `;
      expect(isRuntimeCode(mixedWithImport)).toBe(false);
      
      const pureRuntime = `
const button = document.getElementById('btn');
button.addEventListener('click', () => {
  console.log('Clicked');
});
      `;
      expect(isRuntimeCode(pureRuntime)).toBe(true);
    });
  });

  describe('getValidationStrategy', () => {
    const jsFile = detectFileType('app.js');
    const tsFile = detectFileType('app.ts');

    test('returns skip when validation is disabled', () => {
      expect(getValidationStrategy('', jsFile, { skipValidation: true })).toBe('skip');
      expect(getValidationStrategy('', tsFile, { skipValidation: true })).toBe('skip');
      expect(getValidationStrategy('', jsFile, { validateSyntax: false })).toBe('skip');
    });

    test('returns runtime for runtime JavaScript with autoDetect', () => {
      const runtimeCode = 'console.log("test")';
      expect(getValidationStrategy(
        runtimeCode,
        jsFile,
        { autoDetectRuntime: true }
      )).toBe('runtime');
    });

    test('returns full for TypeScript regardless of content', () => {
      const runtimeCode = 'console.log("test")';
      expect(getValidationStrategy(
        runtimeCode,
        tsFile,
        { autoDetectRuntime: true }
      )).toBe('full');
    });

    test('returns full for development JavaScript', () => {
      const devCode = 'import React from "react"';
      expect(getValidationStrategy(
        devCode,
        jsFile,
        { autoDetectRuntime: true }
      )).toBe('full');
    });

    test('returns full by default', () => {
      expect(getValidationStrategy('', jsFile, {})).toBe('full');
      expect(getValidationStrategy('', tsFile, {})).toBe('full');
    });
  });

  describe('validateCSS', () => {
    test('validates correct CSS', () => {
      expect(validateCSS('.class { color: red; }')).toEqual({ valid: true });
      expect(validateCSS('/* comment */ body { margin: 0; }')).toEqual({ valid: true });
      expect(validateCSS('@media (max-width: 768px) { .mobile {} }')).toEqual({ valid: true });
    });

    test('detects empty property values', () => {
      const result = validateCSS('.class { color: ; }');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty property values');
    });

    test('detects unclosed braces', () => {
      const result = validateCSS('.class { color: red; ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1 opening braces but 0 closing braces');
    });

    test('detects unclosed strings', () => {
      const result = validateCSS('.class { content: "unclosed; }');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('unclosed string');
    });

    test('handles comments correctly', () => {
      expect(validateCSS('/* { broken comment */ .class { color: red; }')).toEqual({ valid: true });
    });
  });

  describe('validateJSON', () => {
    test('validates correct JSON', () => {
      expect(validateJSON('{"valid": true}')).toEqual({ valid: true });
      expect(validateJSON('[]')).toEqual({ valid: true });
      expect(validateJSON('"string"')).toEqual({ valid: true });
      expect(validateJSON('null')).toEqual({ valid: true });
    });

    test('detects invalid JSON', () => {
      expect(validateJSON('{invalid}')).toMatchObject({
        valid: false,
        error: expect.stringContaining('JSON parse error')
      });
      
      expect(validateJSON('{"key": undefined}')).toMatchObject({
        valid: false,
        error: expect.stringContaining('JSON parse error')
      });
      
      expect(validateJSON('{key: "value"}')).toMatchObject({
        valid: false,
        error: expect.stringContaining('JSON parse error')
      });
    });
  });

  describe('extractErrorLocation', () => {
    test('extracts line and column numbers', () => {
      expect(extractErrorLocation('Error at line 10, column 5')).toEqual({
        line: 10,
        column: 5
      });
      
      expect(extractErrorLocation('Line 42: Syntax error')).toEqual({
        line: 42,
        column: undefined
      });
      
      expect(extractErrorLocation('Error at col 15')).toEqual({
        line: undefined,
        column: 15
      });
    });

    test('handles case insensitive matching', () => {
      expect(extractErrorLocation('Error at LINE 10, COLUMN 5')).toEqual({
        line: 10,
        column: 5
      });
    });

    test('returns undefined for no matches', () => {
      expect(extractErrorLocation('Generic error message')).toEqual({
        line: undefined,
        column: undefined
      });
    });
  });

  describe('needsTranspilation', () => {
    test('returns true for TypeScript files', () => {
      const tsFile = detectFileType('app.ts');
      expect(needsTranspilation('const x: string = "test"', tsFile)).toBe(true);
    });

    test('returns true for JSX files', () => {
      const jsxFile = detectFileType('app.jsx');
      expect(needsTranspilation('const el = <div />', jsxFile)).toBe(true);
    });

    test('detects JSX in JavaScript files', () => {
      const jsFile = detectFileType('app.js');
      expect(needsTranspilation('const el = <Button />', jsFile)).toBe(true);
      expect(needsTranspilation('const el = document.createElement("div")', jsFile)).toBe(false);
    });

    test('detects TypeScript syntax in JavaScript files', () => {
      const jsFile = detectFileType('app.js');
      expect(needsTranspilation('const x: string = "test"', jsFile)).toBe(true);
      expect(needsTranspilation('interface Props {}', jsFile)).toBe(true);
      expect(needsTranspilation('type State = {}', jsFile)).toBe(true);
      expect(needsTranspilation('function test<T>()', jsFile)).toBe(true);
    });

    test('returns false for plain JavaScript', () => {
      const jsFile = detectFileType('app.js');
      expect(needsTranspilation('const x = "test"', jsFile)).toBe(false);
      expect(needsTranspilation('function test() {}', jsFile)).toBe(false);
    });
  });

  describe('createValidationResult', () => {
    test('creates successful result', () => {
      expect(createValidationResult(true)).toEqual({ valid: true });
      
      expect(createValidationResult(true, undefined, {
        validationSkipped: true,
        runtimeCodeDetected: true
      })).toEqual({
        valid: true,
        validationSkipped: true,
        runtimeCodeDetected: true
      });
    });

    test('creates error result with details', () => {
      expect(createValidationResult(false, 'Syntax error')).toEqual({
        valid: false,
        error: 'Syntax error',
        errorType: 'ValidationError',
        lineNumber: undefined,
        columnNumber: undefined
      });
      
      expect(createValidationResult(false, 'Error at line 10', {
        errorType: 'SyntaxError'
      })).toEqual({
        valid: false,
        error: 'Error at line 10',
        errorType: 'SyntaxError',
        lineNumber: 10,
        columnNumber: undefined
      });
    });

    test('uses provided line/column over extracted ones', () => {
      expect(createValidationResult(false, 'Error at line 10, column 5', {
        lineNumber: 20,
        columnNumber: 15
      })).toEqual({
        valid: false,
        error: 'Error at line 10, column 5',
        errorType: 'ValidationError',
        lineNumber: 20,
        columnNumber: 15
      });
    });
  });
});