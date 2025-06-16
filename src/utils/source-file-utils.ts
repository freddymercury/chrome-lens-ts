/**
 * Pure utility functions for source file management
 * Implements v1.2.1 Task 21.1: Fix Source File Listing
 */

export interface Source {
  scriptId: string;
  url: string;
  content?: string;
}

export interface EnrichedSource extends Source {
  size: number;
  type: string;
  lastModified: number;
  priority?: number;
}

export interface DomainState {
  DOM?: {
    enabled: boolean;
  };
  [key: string]: any;
}

/**
 * Validates if DOM agent is enabled
 * Pure function - no side effects
 */
export function validateDomAgentEnabled(domainState: DomainState): boolean {
  return domainState.DOM?.enabled === true;
}

/**
 * Filters out invalid source files
 * Pure function - returns new array
 */
export function filterValidSourceFiles(sources: Source[]): Source[] {
  return sources.filter(source => {
    // Filter out empty URLs
    if (!source.url || source.url.trim() === '') {
      return false;
    }
    
    // Filter out data URLs
    if (source.url.startsWith('data:')) {
      return false;
    }
    
    // Filter out blob URLs
    if (source.url.startsWith('blob:')) {
      return false;
    }
    
    // Filter out chrome extensions
    if (source.url.startsWith('chrome-extension://')) {
      return false;
    }
    
    // Filter out internal chrome URLs
    if (source.url.startsWith('chrome://')) {
      return false;
    }
    
    return true;
  });
}

/**
 * Sorts sources by priority (application files first)
 * Pure function - returns new sorted array
 */
export function sortSourcesByPriority(sources: Source[]): Source[] {
  return [...sources].sort((a, b) => {
    const aPriority = calculateSourcePriority(a);
    const bPriority = calculateSourcePriority(b);
    return bPriority - aPriority;
  });
}

/**
 * Calculates priority score for a source file
 * Pure function - higher score = higher priority
 */
function calculateSourcePriority(source: Source): number {
  let priority = 0;
  const url = source.url.toLowerCase();
  
  // Application source files get highest priority
  if (url.includes('/src/') || url.includes('/app/')) {
    priority += 100;
  }
  
  // JavaScript/TypeScript files
  if (url.endsWith('.js') || url.endsWith('.ts') || url.endsWith('.jsx') || url.endsWith('.tsx')) {
    priority += 50;
  }
  
  // HTML files
  if (url.endsWith('.html') || url.endsWith('.htm')) {
    priority += 30;
  }
  
  // CSS files
  if (url.endsWith('.css') || url.endsWith('.scss') || url.endsWith('.less')) {
    priority += 20;
  }
  
  // Vendor/node_modules get lower priority
  if (url.includes('node_modules') || url.includes('vendor')) {
    priority -= 50;
  }
  
  // Minified files get lower priority
  if (url.includes('.min.')) {
    priority -= 30;
  }
  
  return priority;
}

/**
 * Enriches source metadata with additional information
 * Pure function - returns new enriched object
 */
export function enrichSourceMetadata(source: Source): EnrichedSource {
  const type = detectFileType(source.url);
  const size = source.content ? new TextEncoder().encode(source.content).length : 0;
  
  return {
    ...source,
    size,
    type,
    lastModified: Date.now(),
    priority: calculateSourcePriority(source)
  };
}

/**
 * Detects file type from URL
 * Pure function
 */
function detectFileType(url: string): string {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.endsWith('.js') || lowerUrl.endsWith('.mjs')) {
    return 'javascript';
  }
  if (lowerUrl.endsWith('.ts')) {
    return 'typescript';
  }
  if (lowerUrl.endsWith('.jsx')) {
    return 'javascript-react';
  }
  if (lowerUrl.endsWith('.tsx')) {
    return 'typescript-react';
  }
  if (lowerUrl.endsWith('.css')) {
    return 'css';
  }
  if (lowerUrl.endsWith('.scss') || lowerUrl.endsWith('.sass')) {
    return 'sass';
  }
  if (lowerUrl.endsWith('.less')) {
    return 'less';
  }
  if (lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm')) {
    return 'html';
  }
  if (lowerUrl.endsWith('.json')) {
    return 'json';
  }
  if (lowerUrl.endsWith('.xml')) {
    return 'xml';
  }
  if (lowerUrl.endsWith('.svg')) {
    return 'svg';
  }
  
  // Try to detect from MIME type in URL if available
  if (url.includes('.js?') || url.includes('.js#')) {
    return 'javascript';
  }
  
  return 'unknown';
}

/**
 * Creates a cache key for source files based on tab ID
 * Pure function
 */
export function createSourceCacheKey(tabId: string): string {
  return `sources_${tabId}`;
}

/**
 * Checks if cached sources are still valid
 * Pure function
 */
export function isCacheValid(cachedAt: number, maxAge: number = 60000): boolean {
  return Date.now() - cachedAt < maxAge;
}