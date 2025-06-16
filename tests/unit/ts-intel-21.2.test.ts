import { describe, test, expect } from '@jest/globals';
import { categorizeProblem } from '../../src/intelligence/problem-categorization.js';

describe('Problem Categorization', () => {
  test('categorizes error problems', () => {
    // Input: "TypeError: Cannot read property 'x' of undefined"
    const result = categorizeProblem("TypeError: Cannot read property 'x' of undefined");
    
    expect(result.type).toBe('runtime-error');
    expect(result.subtype).toBe('null-reference');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.keywords).toContain('TypeError');
    expect(result.keywords).toContain('undefined');
  });
  
  test('categorizes performance problems', () => {
    // Input: "Page load takes 10 seconds"
    const result = categorizeProblem("Page load takes 10 seconds");
    
    expect(result.type).toBe('performance');
    expect(result.subtype).toBe('slow-load');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.keywords).toContain('load');
    expect(result.keywords).toContain('seconds');
  });
  
  test('categorizes logic problems', () => {
    // Input: "Function returns wrong value"
    const result = categorizeProblem("Function returns wrong value");
    
    expect(result.type).toBe('logic-error');
    expect(result.subtype).toBe('incorrect-output');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.keywords).toContain('wrong');
    expect(result.keywords).toContain('returns');
  });
  
  test('handles unknown problems', () => {
    // Input: "Something weird happening"
    const result = categorizeProblem("Something weird happening");
    
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.confidence).toBeGreaterThan(0.2);
    expect(result.subtype).toBeUndefined();
  });

  test('categorizes network problems', () => {
    const testCases = [
      { input: "CORS error when fetching API", expectedSubtype: 'cors' },
      { input: "404 Not Found error", expectedSubtype: 'http-error' },
      { input: "Network request timeout after 30s", expectedSubtype: 'timeout' },
      { input: "ERR_CONNECTION_REFUSED", expectedSubtype: 'connection-failed' }
    ];

    testCases.forEach(({ input, expectedSubtype }) => {
      const result = categorizeProblem(input);
      expect(result.type).toBe('network');
      expect(result.subtype).toBe(expectedSubtype);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  test('categorizes security problems', () => {
    const testCases = [
      { input: "Content Security Policy violation", expectedSubtype: 'csp-violation' },
      { input: "Mixed content blocked", expectedSubtype: 'mixed-content' },
      { input: "XSS attempt detected", expectedSubtype: 'xss' },
      { input: "CSRF token mismatch", expectedSubtype: 'csrf' }
    ];

    testCases.forEach(({ input, expectedSubtype }) => {
      const result = categorizeProblem(input);
      expect(result.type).toBe('security');
      expect(result.subtype).toBe(expectedSubtype);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  test('handles multiple problem indicators', () => {
    const result = categorizeProblem("TypeError in network request causing slow page load");
    
    // Should prioritize the most specific problem (TypeError)
    expect(result.type).toBe('runtime-error');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.keywords).toContain('TypeError');
    expect(result.keywords).toContain('network');
    expect(result.keywords).toContain('slow');
  });

  test('is case insensitive', () => {
    const result1 = categorizeProblem("TYPEERROR: cannot read property");
    const result2 = categorizeProblem("TypeError: Cannot Read Property");
    
    expect(result1.type).toBe(result2.type);
    expect(result1.subtype).toBe(result2.subtype);
  });

  test('handles empty or invalid input', () => {
    const emptyResult = categorizeProblem("");
    expect(emptyResult.type).toBe('unknown');
    expect(emptyResult.confidence).toBeLessThan(0.3);

    const whitespaceResult = categorizeProblem("   \n\t   ");
    expect(whitespaceResult.type).toBe('unknown');
    expect(whitespaceResult.confidence).toBeLessThan(0.3);
  });

  test('extracts relevant keywords', () => {
    const result = categorizeProblem("ReferenceError: myVariable is not defined at line 42");
    
    expect(result.keywords).toContain('ReferenceError');
    expect(result.keywords).toContain('not defined');
    expect(result.keywords).toContain('line 42');
    expect(result.keywords?.length || 0).toBeGreaterThan(2);
    expect(result.keywords?.length || 0).toBeLessThan(10); // Don't extract too many
  });
});