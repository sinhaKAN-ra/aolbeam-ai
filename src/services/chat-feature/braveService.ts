import { SearchResult } from '../../types/chat-feature';

export class BraveSearchService {
  async searchTopic(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`/api/brave?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch from local Brave API proxy:', errorText);
        throw new Error(`Failed to fetch search results: ${response.statusText}`);
      }

      const data = await response.json();
      const webResults: any[] = data.web?.results ?? [];

      return webResults.slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        description: r.description,
        favicon: r.favicon || 'https://www.brave.com/static-assets/images/brave-icon.png' // Default favicon
      }));

    } catch (error) {
      console.error('BraveSearchService searchTopic error:', error);
      return [];
    }
  }
}

export const braveSearchService = new BraveSearchService();