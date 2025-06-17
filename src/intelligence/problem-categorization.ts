import { ProblemCategory } from '../types/intelligence.js';

/**
 * Pattern definitions for problem categorization
 */
interface ProblemPattern {
  type: ProblemCategory['type'];
  subtype?: string;
  patterns: RegExp[];
  confidence: number;
  keywords: string[];
}

const PROBLEM_PATTERNS: ProblemPattern[] = [
  // Runtime errors
  {
    type: 'runtime-error',
    subtype: 'null-reference',
    patterns: [
      /TypeError.*Cannot\s+read\s+property.*of\s+(undefined|null)/i,
      /Cannot\s+access.*before\s+initialization/i,
      /undefined\s+is\s+not\s+an?\s+\w+/i
    ],
    confidence: 0.9,
    keywords: ['TypeError', 'undefined', 'null', 'Cannot read property']
  },
  {
    type: 'runtime-error',
    subtype: 'reference-error',
    patterns: [
      /ReferenceError.*is\s+not\s+defined/i,
      /\w+\s+is\s+not\s+defined/i,
      /Cannot\s+find\s+\w+/i
    ],
    confidence: 0.9,
    keywords: ['ReferenceError', 'not defined']
  },
  {
    type: 'runtime-error',
    subtype: 'type-error',
    patterns: [
      /TypeError(?!.*Cannot\s+read\s+property)/i,
      /is\s+not\s+a\s+function/i,
      /expected\s+\w+\s+but\s+got\s+\w+/i
    ],
    confidence: 0.85,
    keywords: ['TypeError', 'not a function', 'expected']
  },

  // Performance issues
  {
    type: 'performance',
    subtype: 'slow-load',
    patterns: [
      /(?:page|site|app)?\s*load\s*(?:takes?|time|slow|timing).*\d+\s*(?:seconds?|ms)/i,
      /slow\s+(?:loading|page|performance)/i,
      /performance\s+(?:issue|problem|degradation)/i
    ],
    confidence: 0.8,
    keywords: ['load', 'slow', 'seconds', 'performance']
  },
  {
    type: 'performance',
    subtype: 'memory-leak',
    patterns: [
      /memory\s+(?:leak|usage|consumption)/i,
      /out\s+of\s+memory/i,
      /heap\s+(?:size|usage|limit)/i
    ],
    confidence: 0.85,
    keywords: ['memory', 'leak', 'heap']
  },
  {
    type: 'performance',
    subtype: 'render-blocking',
    patterns: [
      /render[- ]?blocking/i,
      /(?:slow|laggy)\s+(?:scroll|animation|ui)/i,
      /frame\s*rate|fps\s+drop/i
    ],
    confidence: 0.75,
    keywords: ['render', 'blocking', 'scroll', 'animation']
  },

  // Logic errors
  {
    type: 'logic-error',
    subtype: 'incorrect-output',
    patterns: [
      /(?:function|method)?\s*returns?\s*(?:wrong|incorrect|unexpected)\s*(?:value|result|output)/i,
      /(?:wrong|incorrect|unexpected)\s*(?:value|result|output|data)/i,
      /not\s+(?:working|behaving)\s+(?:as\s+)?expected/i
    ],
    confidence: 0.75,
    keywords: ['wrong', 'incorrect', 'returns', 'expected']
  },
  {
    type: 'logic-error',
    subtype: 'infinite-loop',
    patterns: [
      /infinite\s+loop/i,
      /(?:function|loop)\s+(?:never|won't)\s+(?:stop|end|terminate)/i,
      /maximum\s+call\s+stack/i
    ],
    confidence: 0.85,
    keywords: ['infinite', 'loop', 'never stop', 'call stack']
  },

  // Network issues
  {
    type: 'network',
    subtype: 'cors',
    patterns: [
      /CORS\s+(?:error|issue|problem|policy)/i,
      /Cross[- ]?Origin\s+Resource\s+Sharing/i,
      /Access[- ]?Control[- ]?Allow[- ]?Origin/i
    ],
    confidence: 0.95,
    keywords: ['CORS', 'Cross-Origin', 'Access-Control']
  },
  {
    type: 'network',
    subtype: 'http-error',
    patterns: [
      /\b(4\d{2}|5\d{2})\s+(?:error|status)/i,
      /(?:404|403|401|500|502|503)\s+(?:Not\s+Found|Forbidden|Unauthorized|Error)/i,
      /HTTP\s+error\s+\d{3}/i
    ],
    confidence: 0.9,
    keywords: ['404', '500', 'HTTP error', 'Not Found']
  },
  {
    type: 'network',
    subtype: 'timeout',
    patterns: [
      /(?:network|request|connection)\s*(?:timeout|timed?\s*out)/i,
      /timeout.*after\s*\d+/i,
      /ERR_.*TIMEOUT/i
    ],
    confidence: 0.85,
    keywords: ['timeout', 'timed out', 'network']
  },
  {
    type: 'network',
    subtype: 'connection-failed',
    patterns: [
      /ERR_CONNECTION_(?:REFUSED|FAILED|RESET)/i,
      /(?:connection|network)\s+(?:refused|failed|error)/i,
      /unable\s+to\s+connect/i
    ],
    confidence: 0.9,
    keywords: ['connection', 'refused', 'failed', 'ERR_CONNECTION']
  },

  // Security issues
  {
    type: 'security',
    subtype: 'csp-violation',
    patterns: [
      /Content[- ]?Security[- ]?Policy/i,
      /CSP\s+(?:violation|error|blocked)/i,
      /refused\s+to\s+(?:load|execute).*violates.*directive/i
    ],
    confidence: 0.95,
    keywords: ['Content Security Policy', 'CSP', 'violation']
  },
  {
    type: 'security',
    subtype: 'mixed-content',
    patterns: [
      /mixed\s+content/i,
      /(?:blocked|preventing).*insecure.*https/i,
      /https.*http\s+(?:content|resource)/i
    ],
    confidence: 0.9,
    keywords: ['mixed content', 'insecure', 'https']
  },
  {
    type: 'security',
    subtype: 'xss',
    patterns: [
      /(?:XSS|cross[- ]?site[- ]?scripting)/i,
      /script\s+injection/i,
      /dangerous\s+(?:HTML|script)/i
    ],
    confidence: 0.85,
    keywords: ['XSS', 'cross-site scripting', 'injection']
  },
  {
    type: 'security',
    subtype: 'csrf',
    patterns: [
      /CSRF/i,
      /cross[- ]?site[- ]?request[- ]?forgery/i,
      /(?:CSRF|token)\s+(?:mismatch|invalid|missing)/i
    ],
    confidence: 0.85,
    keywords: ['CSRF', 'token', 'mismatch']
  }
];

/**
 * Categorizes a debugging problem based on its description
 * Uses pattern matching to identify problem type and subtype
 */
export function categorizeProblem(description: string): ProblemCategory {
  // Handle empty or invalid input
  if (!description || description.trim().length === 0) {
    return {
      type: 'unknown',
      confidence: 0.1,
      keywords: []
    };
  }

  const normalizedDescription = description.toLowerCase();
  const extractedKeywords = extractKeywords(description);
  
  let bestMatch: ProblemCategory = {
    type: 'unknown',
    confidence: 0.3,
    keywords: extractedKeywords
  };

  // Check each pattern
  for (const pattern of PROBLEM_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(description)) {
        // Calculate confidence based on keyword matches
        const keywordMatches = pattern.keywords.filter(kw => 
          normalizedDescription.includes(kw.toLowerCase())
        ).length;
        
        const adjustedConfidence = pattern.confidence + 
          (keywordMatches * 0.05); // Boost confidence for keyword matches
        
        if (adjustedConfidence > bestMatch.confidence) {
          bestMatch = {
            type: pattern.type,
            ...(pattern.subtype ? { subtype: pattern.subtype } : {}),
            confidence: Math.min(adjustedConfidence, 0.99),
            keywords: [...new Set([...extractedKeywords, ...pattern.keywords])]
              .slice(0, 8) // Limit keywords
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Extracts relevant keywords from problem description
 */
function extractKeywords(description: string): string[] {
  const keywords: string[] = [];
  
  // Extract error types
  const errorMatches = description.match(/\b\w*Error\b/gi);
  if (errorMatches) {
    keywords.push(...errorMatches);
  }
  
  // Extract quoted strings
  const quotedMatches = description.match(/'[^']+'/g);
  if (quotedMatches) {
    keywords.push(...quotedMatches.map(s => s.replace(/'/g, '')));
  }
  
  // Extract line numbers
  const lineMatches = description.match(/line\s+\d+/gi);
  if (lineMatches) {
    keywords.push(...lineMatches);
  }
  
  // Extract specific patterns
  if (/not\s+defined/i.test(description)) {
    keywords.push('not defined');
  }
  if (/Cannot\s+read\s+property/i.test(description)) {
    keywords.push('Cannot read property');
  }
  if (/undefined|null/i.test(description)) {
    const match = description.match(/undefined|null/gi);
    if (match) keywords.push(...match);
  }
  
  // Extract important technical terms
  const techTerms = description.match(/\b(network|request|slow|performance|load|error|function|TypeError|ReferenceError)\b/gi);
  if (techTerms) {
    keywords.push(...techTerms);
  }
  
  // Extract numbers (potential status codes, durations)
  const numberMatches = description.match(/\b\d{3,4}\b|\b\d+\s*(?:seconds?|ms|minutes?)\b/gi);
  if (numberMatches) {
    keywords.push(...numberMatches);
  }
  
  // Remove duplicates and limit
  return [...new Set(keywords)].slice(0, 8);
}

// Re-export ProblemCategory type for convenience
export type { ProblemCategory } from '../types/intelligence.js';