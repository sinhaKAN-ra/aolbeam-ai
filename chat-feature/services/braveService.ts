import { SearchResult } from '../types';

export class BraveSearchService {
  private readonly baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = import.meta.env.VITE_BRAVE_API_KEY;
  }

  async searchTopic(query: string): Promise<SearchResult[]> {
    // For demo purposes, return mock search results
    // In production, this would call the actual Brave Search API
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

    const mockResults: SearchResult[] = [
      {
        title: `${query} - Complete Guide and Tutorial`,
        url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Comprehensive guide covering all aspects of ${query}, including fundamentals, applications, and best practices.`,
        favicon: 'https://via.placeholder.com/16x16'
      },
      {
        title: `Latest Research in ${query}`,
        url: `https://research.example.com/${query.toLowerCase()}`,
        description: `Recent developments and breakthrough research in the field of ${query} from leading academic institutions.`,
        favicon: 'https://via.placeholder.com/16x16'
      },
      {
        title: `${query} for Beginners - Step by Step`,
        url: `https://learn.example.com/${query.toLowerCase()}-beginners`,
        description: `Perfect starting point for newcomers to ${query}, with easy-to-follow explanations and practical examples.`,
        favicon: 'https://via.placeholder.com/16x16'
      }
    ];

    return mockResults;
  }

  private async makeRequest(query: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Brave API key not configured');
    }

    const response = await fetch(`${this.baseUrl}?q=${encodeURIComponent(query)}`, {
      headers: {
        'X-Subscription-Token': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Brave API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const braveSearchService = new BraveSearchService();