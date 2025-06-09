import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  scrollToProblemGenerator: () => void;
}

export const HeroSection = ({ scrollToProblemGenerator }: HeroSectionProps) => {
  return (
    <section id="home" className="py-16 md:py-24 text-center bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary-foreground brightness-125">
            <span className="text-black dark:text-primary">AOLBEAM</span>
          </h1>
          <div className="mt-4 flex justify-center">
            <a href="https://www.producthunt.com/products/aolbeam?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-aolbeam" 
               target="_blank" 
               rel="noopener noreferrer">
              <img 
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=975222&theme=light&t=1749297505262" 
                alt="AOLBeam - Learn and practice with AI. Be truly PREPARED for any EXAM | Product Hunt" 
                style={{ width: '250px', height: '54px' }} 
                width="250" 
                height="54" 
              />
            </a>
          </div>
          <p className="mt-6 text-lg sm:text-xl text-foreground/90 leading-relaxed">
            <span className="font-bold text-xl md:text-2xl">Access of Learning - Beam </span> into the world of knowledge! Master subjects - practice problems of your specific topic. 
            Build Solution pattern faster, <span className="font-semibold text-primary">prepare like a topper</span>, and achieve success.
          </p>
          <div className="mt-10 py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Start Practicing?</h2>
            <Button
              size="lg"
              onClick={scrollToProblemGenerator}
              className="group relative inline-flex items-center justify-center text-lg font-semibold px-8 py-3 
                rounded-2xl bg-gradient-to-r from-primary to-primary/80 
                text-white shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out 
                hover:from-primary/90 hover:to-primary/70 
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              <span className="mr-2 transition-transform duration-300 group-hover:-translate-x-1">
                Generate Your First Problem
              </span>
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
