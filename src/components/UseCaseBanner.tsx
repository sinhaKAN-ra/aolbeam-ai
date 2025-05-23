
// src/components/UseCaseBanner.tsx
import { Target, Lightbulb, Settings, Briefcase, BookOpen } from 'lucide-react';
import type * as React from 'react';

interface UseCase {
  icon: React.ElementType;
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    icon: Target,
    title: "Ace Your Exams",
    description: "Targeted practice for competitive exams & academic tests with AI-driven questions.",
  },
  {
    icon: Lightbulb,
    title: "Master Problem Patterns",
    description: "Develop the crucial skill of quickly identifying and applying effective solution patterns.",
  },
  {
    icon: Settings, // Using Settings to imply fine-tuning problem-solving approaches
    title: "Build Solver Mentality",
    description: "Strengthen your analytical thinking and systematic approach to complex challenges.",
  },
  {
    icon: Briefcase,
    title: "Sharpen Interview Skills",
    description: "Practice conceptual & numerical questions often encountered in technical interviews.",
  },
  {
    icon: BookOpen,
    title: "Deepen Understanding",
    description: "Solidify your grasp of core concepts through tailored questions and instant insights.",
  },
];

export function UseCaseBanner() {
  return (
    <section className="py-10 md:py-16 bg-background border-t border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary-foreground">
            How AOLBEAM Empowers You
          </h2>
          <p className="mt-3 text-md text-muted-foreground max-w-xl mx-auto">
            Discover how AOLBEAM adapts to your learning journey, helping you excel from exams to interviews.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="mb-3 flex-shrink-0">
                <useCase.icon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-card-foreground">{useCase.title}</h3>
              <p className="text-xs text-muted-foreground flex-grow">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

