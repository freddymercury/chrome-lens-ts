/**
 * Pure functions for pagination and response size management
 */

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  maxResponseSize?: number;
  continuationToken?: string;
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    responseSize: number;
  };
  continuationToken?: string;
}

export interface ContinuationTokenData {
  tabId: string;
  page: number;
  filters?: any;
  timestamp: number;
}

/**
 * Calculate the size of data when serialized to JSON
 */
export function calculateResponseSize(data: any): number {
  try {
    return new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    // If serialization fails, return a large number to trigger pagination
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Create a continuation token for pagination
 */
export function createContinuationToken(
  tabId: string, 
  page: number, 
  filters?: any
): string {
  const tokenData: ContinuationTokenData = {
    tabId,
    page,
    filters,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

/**
 * Parse a continuation token
 */
export function parseContinuationToken(token: string): ContinuationTokenData | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const data = JSON.parse(decoded) as ContinuationTokenData;
    
    // Validate token age (expire after 1 hour)
    const tokenAge = Date.now() - data.timestamp;
    if (tokenAge > 3600000) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Paginate results with automatic size management
 */
export function paginateResults<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { 
    page = 1, 
    pageSize = 100, 
    maxResponseSize = 500000, // 500KB default
    continuationToken 
  } = options;
  
  // Parse continuation token if provided
  let actualPage = page;
  if (continuationToken) {
    const tokenData = parseContinuationToken(continuationToken);
    if (tokenData) {
      actualPage = tokenData.page;
    }
  }
  
  // Calculate start and end indices
  const startIndex = (actualPage - 1) * pageSize;
  let endIndex = startIndex + pageSize;
  let pageItems = items.slice(startIndex, endIndex);
  
  // Check response size and reduce if necessary
  let currentSize = calculateResponseSize(pageItems);
  while (pageItems.length > 1 && currentSize > maxResponseSize) {
    // Reduce by 20% each iteration
    const newLength = Math.floor(pageItems.length * 0.8);
    pageItems = pageItems.slice(0, newLength);
    currentSize = calculateResponseSize(pageItems);
  }
  
  // Calculate actual pagination info
  const actualPageSize = pageItems.length;
  // Use the original requested pageSize for total pages calculation, not the reduced size
  const totalPages = Math.ceil(items.length / pageSize);
  
  return {
    items: pageItems,
    pagination: {
      page: actualPage,
      pageSize: actualPageSize,
      totalItems: items.length,
      totalPages,
      hasNextPage: actualPage < totalPages,
      hasPrevPage: actualPage > 1,
      responseSize: currentSize
    }
  };
}

/**
 * Filter items based on criteria
 */
export interface FilterCriteria {
  path?: string;
  extension?: string;
  minSize?: number;
  maxSize?: number;
  pattern?: string;
}

export function filterSourceFiles<T extends { url?: string; length?: number }>(
  items: T[],
  filters: FilterCriteria
): T[] {
  return items.filter(item => {
    // Path filter
    if (filters.path && item.url) {
      if (!item.url.toLowerCase().includes(filters.path.toLowerCase())) {
        return false;
      }
    }
    
    // Extension filter
    if (filters.extension && item.url) {
      if (!item.url.toLowerCase().endsWith(filters.extension.toLowerCase())) {
        return false;
      }
    }
    
    // Size filters
    if (filters.minSize !== undefined && item.length !== undefined) {
      if (item.length < filters.minSize) {
        return false;
      }
    }
    
    if (filters.maxSize !== undefined && item.length !== undefined) {
      if (item.length > filters.maxSize) {
        return false;
      }
    }
    
    // Pattern filter (regex)
    if (filters.pattern && item.url) {
      try {
        const regex = new RegExp(filters.pattern, 'i');
        if (!regex.test(item.url)) {
          return false;
        }
      } catch {
        // Invalid regex, skip filter
      }
    }
    
    return true;
  });
}

/**
 * Sort source files by various criteria
 */
export type SortCriteria = 'url' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export function sortSourceFiles<T extends { url?: string; length?: number }>(
  items: T[],
  sortBy: SortCriteria = 'url',
  order: SortOrder = 'asc'
): T[] {
  const sorted = [...items].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'url':
        comparison = (a.url || '').localeCompare(b.url || '');
        break;
      case 'size':
        comparison = (a.length || 0) - (b.length || 0);
        break;
      case 'type':
        const getExt = (url: string) => url.split('.').pop() || '';
        comparison = getExt(a.url || '').localeCompare(getExt(b.url || ''));
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Create a summary of source files by type
 */
export interface SourceFileSummary {
  totalFiles: number;
  totalSize: number;
  byExtension: Record<string, { count: number; totalSize: number }>;
  largestFiles: Array<{ url: string; size: number }>;
}

export function createSourceFileSummary<T extends { url?: string; length?: number }>(
  items: T[]
): SourceFileSummary {
  const summary: SourceFileSummary = {
    totalFiles: items.length,
    totalSize: 0,
    byExtension: {},
    largestFiles: []
  };
  
  // Calculate totals and group by extension
  items.forEach(item => {
    const size = item.length || 0;
    summary.totalSize += size;
    
    if (item.url) {
      const ext = item.url.split('.').pop() || 'unknown';
      if (!summary.byExtension[ext]) {
        summary.byExtension[ext] = { count: 0, totalSize: 0 };
      }
      summary.byExtension[ext].count++;
      summary.byExtension[ext].totalSize += size;
    }
  });
  
  // Find largest files
  summary.largestFiles = items
    .filter(item => item.url && item.length)
    .sort((a, b) => (b.length || 0) - (a.length || 0))
    .slice(0, 10)
    .map(item => ({
      url: item.url!,
      size: item.length!
    }));
  
  return summary;
}