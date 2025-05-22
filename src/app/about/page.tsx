
// src/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Target, Rocket, Users } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About AOLBEAM - Our Mission & Vision',
  description: 'Learn about the mission, vision, and the problem AOLBEAM aims to solve for students preparing for competitive exams.',
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header is now global */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                 <Rocket className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">About AOLBEAM</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Our Mission, Vision, and the Path to Smarter Learning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 text-base md:text-lg leading-relaxed">
              <section>
                <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-primary">
                  <Users className="h-6 w-6" /> Why We Built AOLBEAM
                </h2>
                <p className="text-muted-foreground">
                  We observed that many students, despite their hard work, struggle to bridge the gap between knowing concepts and applying them effectively under exam pressure. The key to excelling in competitive exams often lies in rapidly recognizing problem patterns and recalling relevant solution strategies. AOLBEAM was born from a desire to leverage the power of Artificial Intelligence to make this crucial skill-building process more efficient, personalized, and accessible to every student aiming for success.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-primary">
                  <Target className="h-6 w-6" /> The Challenge: Mastering Problem-Solving Patterns
                </h2>
                <p className="text-muted-foreground">
                  Getting better at solving complex problems isn't just about understanding individual topics; it's about <strong className="text-foreground">knowing or swiftly recalling similar patterns</strong> used for solving that kind of problem. Traditional study methods can sometimes be slow in helping students internalize the vast array of patterns encountered in competitive exams. This is the core challenge AOLBEAM is designed to address.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-primary">
                  <Lightbulb className="h-6 w-6" /> Our Solution: AI-Powered Learning & Pattern Recognition
                </h2>
                <p className="text-muted-foreground">
                  AOLBEAM provides a dynamic platform where students can:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-2 text-muted-foreground pl-4">
                  <li><strong className="text-foreground">Practice Endlessly:</strong> Generate a wide variety of problems across different topics, types, and difficulty levels, tailored by AI.</li>
                  <li><strong className="text-foreground">Revise Strategically:</strong> Instantly access concise topic details relevant to the problem at hand, reinforcing the underlying principles and patterns.</li>
                  <li><strong className="text-foreground">Learn from Feedback:</strong> Receive immediate evaluations on answers, helping to correct misunderstandings and solidify learning.</li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  Our goal is to accelerate your ability to internalize these crucial problem-solving patterns, making you more confident and efficient – just like a topper.
                </p>
              </section>
              
              <section>
                <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2 text-primary">
                  <Rocket className="h-6 w-6" /> Our Vision: The Future of Education
                </h2>
                <p className="text-muted-foreground">
                  We believe in creating a platform for students to learn and become educated in a new, more intuitive way. The journey with AOLBEAM is just beginning. Our long-term vision is to evolve into a comprehensive, <strong className="text-foreground">search-based learning platform</strong>. Imagine a system where you can instantly find, understand, and master any concept or problem-solving technique you need, precisely when you need it, all powered by intelligent assistance.
                </p>
              </section>

              <div className="text-center mt-10">
                <Button asChild size="lg">
                  <Link href="/">Start Your Practice Journey</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
       <Footer />
    </div>
  );
}

    