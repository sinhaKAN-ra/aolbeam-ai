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
    title: "Exam Prep",
    description: "AI-driven questions for competitive exams & academic tests.",
  },
  {
    icon: Lightbulb,
    title: "Master Patterns",
    description: "Develop skill in quickly identifying effective solution patterns.",
  },
  {
    icon: Settings,
    title: "Solver Mentality",
    description: "Strengthen analytical thinking for complex challenges.",
  },
  {
    icon: Briefcase,
    title: "Interview Skills",
    description: "Practice conceptual & numerical questions for technical interviews.",
  },
  {
    icon: BookOpen,
    title: "Deepen Understanding",
    description: "Solidify core concepts with tailored questions and insights.",
  },
];

export function UseCaseBanner() {
  return (
    <section className="py-10 md:py-12 bg-background border-t border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title and description removed for subtlety */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-3 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="mb-2 flex-shrink-0">
                <useCase.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-card-foreground">{useCase.title}</h3>
              <p className="text-xs text-muted-foreground flex-grow">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
