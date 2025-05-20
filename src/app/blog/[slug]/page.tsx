
// src/app/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays, UserCircle, Tag } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

// This is a placeholder. In a real app, you'd fetch this data based on the slug.
const getPostData = async (slug: string) => {
  // Simulate fetching post data
  await new Promise(resolve => setTimeout(resolve, 100)); 
  if (slug === 'effective-learning-strategies') {
    return {
      title: 'Unlock Your Potential: Top 5 Effective Learning Strategies',
      author: 'AOLBEAM Team',
      date: 'October 26, 2023',
      content: `
        <p class="lead text-lg text-muted-foreground mb-6">Discover proven techniques to enhance your study sessions and retain information more effectively for your exams. Mastering these strategies can significantly impact your learning outcomes.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">1. Active Recall</h2>
        <p class="mb-4">Instead of passively rereading notes, actively test yourself. Try to retrieve information from memory. This could be through flashcards, practice questions, or summarizing concepts in your own words without looking at the material.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">2. Spaced Repetition</h2>
        <p class="mb-4">Review material at increasing intervals over time. This technique helps combat the forgetting curve. Tools like Anki can automate this process for you.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">3. Feynman Technique</h2>
        <p class="mb-4">Explain a concept in simple terms as if you were teaching it to someone else, like a child. Identify gaps in your understanding when you struggle to simplify.</p>
        
        <h2 class="text-2xl font-semibold mt-8 mb-4">4. Interleaved Practice</h2>
        <p class="mb-4">Mix different types of problems or subjects in one study session rather than focusing on one topic for a long time (blocked practice). This helps your brain learn to differentiate between concepts and choose the right solution strategy.</p>

        <h2 class="text-2xl font-semibold mt-8 mb-4">5. Pomodoro Technique</h2>
        <p class="mb-4">Work in focused 25-minute intervals (Pomodoros) separated by short breaks. This helps maintain concentration and prevents burnout during long study sessions.</p>

        <p class="mt-8">By incorporating these strategies into your study routine, you can learn more efficiently and achieve better results in your exams. Remember, consistency is key!</p>
      `,
      tags: ['Study Tips', 'Learning Techniques', 'Productivity'],
      imageUrl: 'https://placehold.co/800x400.png',
      imageHint: 'focused student'
    };
  }
  // Fallback for other slugs or if not found
  return {
    title: 'Blog Post Not Found',
    author: 'AOLBEAM Team',
    date: new Date().toLocaleDateString(),
    content: '<p>The blog post you are looking for could not be found. Please check the URL or navigate back to the blog homepage.</p>',
    tags: ['Error'],
    imageUrl: 'https://placehold.co/800x400.png',
    imageHint: 'error page'
  };
};

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostData(params.slug);
  return {
    title: `${post.title} - AOLBEAM Blog`,
    description: post.content.substring(0, 160).replace(/<[^>]*>?/gm, '') + '...', // Simple excerpt
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPostData(params.slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 bg-card/50 border-b mb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-3xl font-bold text-primary">AOLBEAM</Link>
          <Button asChild variant="outline">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="max-w-3xl mx-auto bg-card p-6 sm:p-8 rounded-lg shadow-xl">
          <header className="mb-8">
            <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden mb-6">
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                priority
                style={{ objectFit: 'cover' }}
                data-ai-hint={post.imageHint}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">{post.title}</h1>
            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1"><UserCircle size={16} /> {post.author}</span>
              <span className="flex items-center gap-1"><CalendarDays size={16} /> {post.date}</span>
            </div>
            <div className="mt-3">
              {post.tags.map(tag => (
                <Badge key={tag} variant="outline" className="mr-1 mb-1 text-xs">{tag}</Badge>
              ))}
            </div>
          </header>
          
          <div 
            className="prose prose-lg dark:prose-invert max-w-none" 
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />

        </article>
      </main>

      <footer className="mt-12 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
