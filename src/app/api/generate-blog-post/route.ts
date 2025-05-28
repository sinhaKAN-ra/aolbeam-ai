import { generateBlogPost, type GenerateBlogPostInput } from '@/ai/flows/generate-blog-post';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const input: GenerateBlogPostInput = await request.json();

    const result = await generateBlogPost(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating blog post in API route:", error);
    return NextResponse.json(
      { 
        error: 'Failed to generate blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 