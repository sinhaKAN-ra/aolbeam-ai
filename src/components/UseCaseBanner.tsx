
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
    <section className="py-12 md:py-20 bg-background border-t border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            How AOLBEAM Empowers You
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From acing exams to building a robust problem-solving toolkit, discover how AOLBEAM adapts to your learning journey.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="mb-4 flex-shrink-0">
                <useCase.icon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground flex-grow">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
