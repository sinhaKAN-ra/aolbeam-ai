import { NextResponse } from 'next/server';
import { searchWithFallback } from '@/lib/search/searchWithFallback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Web search endpoint. Runs through the search fallback chain
 * (Brave -> DuckDuckGo -> ...). Response is shaped like the Brave API
 * ({ web: { results } }) so existing consumers (braveResources.ts) keep working.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const { results, provider } = await searchWithFallback(query, 5);
    return NextResponse.json(
      { web: { results }, _provider: provider },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Search request failed:', error);
    // Soft-fail: return empty results so the chat UI doesn't break.
    return NextResponse.json(
      { web: { results: [] }, _provider: 'none' },
      { status: 200, headers: corsHeaders }
    );
  }
}
