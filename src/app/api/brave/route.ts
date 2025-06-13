import { NextResponse } from 'next/server';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204, // No Content
    headers: corsHeaders,
  });
}

// Handle GET requests
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server configuration error: BRAVE_API_KEY is not set' },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'X-Subscription-Token': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brave API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch from Brave API', details: errorText },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Brave API request failed:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500, headers: corsHeaders }
    );
  }
}