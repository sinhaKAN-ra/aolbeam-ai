// src/components/UseCaseBanner.tsx
import { Target, Lightbulb, Settings, Briefcase, BookOpen, Puzzle } from 'lucide-react';
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
  {
    icon: Puzzle, // New Icon
    title: "Strategic Revision", // New Use Case
    description: "Focus on weak areas and reinforce learning efficiently.",
  },
];

export function UseCaseBanner() {
  return (
    <section className="py-10 md:py-12 bg-background border-t border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-3 bg-card rounded-lg"
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
