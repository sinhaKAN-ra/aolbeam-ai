
// src/app/blog/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import Image from 'next/image';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'AOLBEAM Blog - Insights & Motivation',
  description: 'Stay motivated and informed with articles on learning strategies, exam preparation, and educational insights from AOLBEAM.',
};

const placeholderPosts = [
  {
    slug: 'effective-learning-strategies',
    title: 'Unlock Your Potential: Top 5 Effective Learning Strategies',
    date: 'October 26, 2023',
    excerpt: 'Discover proven techniques to enhance your study sessions and retain information more effectively for your exams.',
    tags: ['Study Tips', 'Learning Techniques'],
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'study desk'
  },
  {
    slug: 'managing-exam-stress',
    title: 'Beat Exam Stress: Tips for Staying Calm and Focused',
    date: 'October 22, 2023',
    excerpt: 'Learn how to manage anxiety and maintain focus during the stressful exam period with these practical tips.',
    tags: ['Mental Health', 'Exam Prep'],
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'calm nature'
  },
  {
    slug: 'power-of-practice-problems',
    title: 'The Power of Practice: Why Solving Problems is Key to Success',
    date: 'October 18, 2023',
    excerpt: 'Understand the crucial role of practice problems in mastering concepts and boosting your confidence for competitive exams.',
    tags: ['Practice', 'Success Mindset'],
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'problem solving'
  },
];

export default function BlogListPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header is now global */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-primary">AOLBEAM Blog</h1>
          <p className="text-xl text-muted-foreground">Insights, motivation, and learning strategies to help you succeed.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {placeholderPosts.map((post) => (
            <Card key={post.slug} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="relative w-full h-48">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    data-ai-hint={post.imageHint}
                  />
                </div>
              </Link>
              <CardHeader>
                <CardTitle className="text-xl hover:text-primary transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </CardTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1"><CalendarDays size={14} /> {post.date}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{post.excerpt}</CardDescription>
                 <div className="mt-3">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="mr-1 mb-1 text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Button asChild variant="link" className="px-0">
                  <Link href={`/blog/${post.slug}`}>Read More &rarr;</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

    