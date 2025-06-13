import type { ResourceLink } from "../types/chat-feature/enhanced-message";

// Types for Brave API response
interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
  page_age?: string;
  age?: string;
  type?: string;
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon?: string;
  };
}

interface BraveApiResponse {
  web?: {
    results?: BraveWebResult[];
  };
  query?: {
    original: string;
  };
  mixed?: {
    main: Array<{ type: string }>;
  };
}

// Configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RESULTS = 5;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Simple in-memory cache
const cache = new Map<string, { data: ResourceLink[]; timestamp: number }>();

/**
 * Fetches external learning resources from Brave Search with retry logic and caching.
 * Returns an array of ResourceLink objects with enhanced metadata.
 * Implements exponential backoff for retries and basic caching.
 */
export async function fetchBraveResources(
  query: string,
  options: {
    maxRetries?: number;
    signal?: AbortSignal;
    useCache?: boolean;
  } = {}
): Promise<ResourceLink[]> {
  const {
    maxRetries = MAX_RETRIES,
    signal,
    useCache = true,
  } = options;

  // Check cache first if enabled
  const cacheKey = query.toLowerCase().trim();
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    // Add incremental delay for retries (exponential backoff)
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      // Combine signals if both are provided
      const abortSignal = signal
        ? (() => {
            const combined = new AbortController();
            signal.addEventListener("abort", () => combined.abort());
            return combined.signal;
          })()
        : controller.signal;

      const response = await fetch(`/api/brave?q=${encodeURIComponent(query)}`, {
        signal: abortSignal,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BraveApiResponse = await response.json();
      const webResults: BraveWebResult[] = data.web?.results || [];

      // Transform results to ResourceLink format
      const resources: ResourceLink[] = webResults.slice(0, MAX_RESULTS).map((result) => ({
        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
        title: result.title,
        url: result.url,
        type: mapBraveTypeToResourceType(result.type),
        description: result.description,
        duration: result.page_age || result.age ? parseDuration((result.page_age || result.age) as string) : undefined,
        icon: result.meta_url?.favicon,
        source: 'brave',
        timestamp: new Date().toISOString(),
      }));

      // Update cache
      if (useCache) {
        cache.set(cacheKey, {
          data: resources,
          timestamp: Date.now(),
        });
      }

      return resources;
    } catch (error) {
      const typedError = error as Error & { response?: { status?: number } };
      lastError = typedError;
      console.warn(`Attempt ${attempt + 1} failed:`, typedError);
      
      // Don't retry on 4xx errors (except 429) or if aborted
      if (typedError.name === 'AbortError' || 
          (typedError.response?.status && 
           typedError.response.status >= 400 && 
           typedError.response.status < 500 && 
           typedError.response.status !== 429)) {
        break;
      }
      
      attempt++;
    }
  }

  // If we have a cached result, return it even if fresh fetch failed
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      console.warn('Returning cached results due to fetch error');
      return cached.data;
    }
  }

  // If we get here, all retries failed
  console.error('All retry attempts failed:', lastError);
  throw lastError || new Error('Failed to fetch resources');
}

// Helper function to map Brave result types to our ResourceType
export function mapBraveTypeToResourceType(braveType?: string): ResourceLink['type'] {
  if (!braveType) return 'web_page';
  
  const typeMap: Record<string, ResourceLink['type']> = {
    video: 'video',
    article: 'article',
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    xls: 'document',
    xlsx: 'document',
    ppt: 'document',
    pptx: 'document',
    tutorial: 'tutorial',
    documentation: 'documentation',
  };
  
  return typeMap[braveType.toLowerCase()] || 'web_page';
}

// Helper function to parse duration strings (e.g., "2 days ago")
function parseDuration(durationStr: string): string | undefined {
  if (!durationStr) return undefined;
  
  // Simple implementation - can be enhanced with a proper date parser if needed
  try {
    const match = durationStr.match(/(\d+)\s+(\w+)/i);
    if (match) {
      const [, value, unit] = match;
      return `${value} ${unit}`;
    }
  } catch (error) {
    console.warn('Failed to parse duration:', durationStr, error);
  }
  
  return durationStr;
}

// Export a function to clear the cache
export function clearBraveCache(query?: string): void {
  if (query) {
    cache.delete(query.toLowerCase().trim());
  } else {
    cache.clear();
  }
}

// Export a function to preload resources for better UX
export async function preloadBraveResources(
  queries: string[],
  signal?: AbortSignal
): Promise<void> {
  await Promise.all(
    queries.map((query) =>
      fetchBraveResources(query, { signal, useCache: true }).catch(() => {
        // Silently fail individual preloads
      })
    )
  );
}
