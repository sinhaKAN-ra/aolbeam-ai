import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-40 bg-gradient-to-b from-primary/5 to-background">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Master Any Subject with AI-Powered Practice
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Get personalized practice problems, instant feedback, and detailed explanations to help you learn faster and more effectively.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="#start-practicing">
                <Button className="w-full sm:w-auto">
                  Start Practicing Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" className="w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square bg-primary/10 rounded-2xl p-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary/20"></div>
              <div className="relative z-10 space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Image
                    src="/assets/logo.png"
                    alt="AOLBEAM Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10"
                  />
                </div>
                <h3 className="text-xl font-semibold">Smart Learning</h3>
                <p className="text-muted-foreground">
                  Our AI adapts to your learning style and provides targeted practice to help you improve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
