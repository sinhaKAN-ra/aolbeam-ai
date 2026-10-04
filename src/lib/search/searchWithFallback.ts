import { isFallbackError } from '../ai/providers/types';

export interface SearchResultItem {
  title: string;
  url: string;
  description?: string;
  type?: string;
}

export interface SearchProvider {
  name: string;
  isConfigured: () => boolean;
  /** Server-side: performs the actual upstream search. Throws on failure. */
  search: (query: string, count: number) => Promise<SearchResultItem[]>;
}

/**
 * Brave Search provider. Primary web-search source.
 */
export const braveSearchProvider: SearchProvider = {
  name: 'brave',
  isConfigured: () => Boolean(process.env.BRAVE_API_KEY),
  async search(query: string, count: number): Promise<SearchResultItem[]> {
    const key = process.env.BRAVE_API_KEY!;
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      { headers: { 'X-Subscription-Token': key, Accept: 'application/json' } }
    );
    if (!res.ok) {
      const err = new Error(`Brave error ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    const data = await res.json();
    const results = data?.web?.results ?? [];
    return results.map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      type: r.type,
    }));
  },
};

/**
 * DuckDuckGo Instant Answer — keyless fallback. Limited coverage but needs no
 * API key, so it works as a last resort when Brave is down/over quota.
 */
export const duckduckgoSearchProvider: SearchProvider = {
  name: 'duckduckgo',
  isConfigured: () => true, // keyless
  async search(query: string, count: number): Promise<SearchResultItem[]> {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );
    if (!res.ok) {
      const err = new Error(`DuckDuckGo error ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }
    const data = await res.json();
    const topics = (data?.RelatedTopics ?? [])
      .filter((t: any) => t.FirstURL && t.Text)
      .slice(0, count);
    return topics.map((t: any) => ({
      title: t.Text?.split(' - ')[0] ?? t.Text,
      url: t.FirstURL,
      description: t.Text,
      type: 'web_page',
    }));
  },
};

/**
 * Ordered search chain.
 * TO ADD A PROVIDER: implement SearchProvider and append it here.
 */
export function getSearchProviders(): SearchProvider[] {
  return [
    braveSearchProvider, // primary
    duckduckgoSearchProvider, // keyless fallback
    // nextSearchProvider,  <-- append here
  ];
}

export async function searchWithFallback(
  query: string,
  count = 5
): Promise<{ results: SearchResultItem[]; provider: string }> {
  const configured = getSearchProviders().filter((p) => p.isConfigured());
  let lastError: unknown = null;

  for (const provider of configured) {
    try {
      const results = await provider.search(query, count);
      if (results.length > 0) return { results, provider: provider.name };
      lastError = new Error(`${provider.name} returned no results`);
    } catch (error) {
      lastError = error;
      if (isFallbackError(error)) {
        console.warn(`[search] "${provider.name}" unavailable, falling through:`, (error as Error)?.message);
        continue;
      }
      throw error;
    }
  }
  // Soft-fail: search is non-critical; return empty rather than breaking chat.
  console.error('[search] all providers failed:', lastError);
  return { results: [], provider: 'none' };
}
