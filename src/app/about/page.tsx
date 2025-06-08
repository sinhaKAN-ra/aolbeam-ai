// src/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Target, Rocket, Users, Mail, Phone, ExternalLink } from 'lucide-react';
// Footer is now global

export const metadata: Metadata = {
  title: 'About AOLBEAM - Our Mission & Vision',
  description: 'Learn about the mission, vision, and the problem AOLBEAM aims to solve for students preparing for competitive exams.',
};

export default function AboutUsPage() {
  return (
    <>
      <div className="pb-8">
        <div>
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

              <section className="mt-12">
                <h2 className="text-2xl font-semibold mb-6 text-center text-primary">
                  Meet the Founder
                </h2>
                <div className="bg-muted/50 p-6 rounded-lg">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-4xl font-bold text-primary">KS</span>
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold">Karan Sinha</h3>
                      <p className="text-muted-foreground mb-3">
                        🚀 Tech Founder | Full Stack Developer | AI + Web3 Enthusiast
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <a 
                          href="https://www.linkedin.com/in/sinhakan-ra/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          LinkedIn
                        </a>
                        <a 
                          href="https://x.com/karan_knows" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Twitter/X
                        </a>
                        <a 
                          href="mailto:aolbeam@outlook.com" 
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          aolbeam@outlook.com
                        </a>
                        <a 
                          href="tel:+16033240396" 
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          +1 (603) 324-0396
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="text-center mt-10">
                <Button asChild size="lg">
                  <Link href="/">Start Your Practice Journey</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
