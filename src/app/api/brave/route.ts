import { NextResponse } from 'next/server';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

if (!BRAVE_API_KEY) {
  console.warn('BRAVE_API_KEY is not set in environment variables. Using mock data.');
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (!BRAVE_API_KEY) {
      // Return mock data if API key is not set
      return NextResponse.json({
        results: [
          {
            title: `Mock result for "${query}"`,
            url: `https://example.com/search?q=${encodeURIComponent(query)}`,
            description: `This is a mock search result for "${query}". Set BRAVE_API_KEY in your environment variables to use the real Brave Search API.`
          }
        ]
      });
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Brave Search API error:', error);
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the response to match our frontend's expected format
    const results = data.web?.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in Brave Search API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}
