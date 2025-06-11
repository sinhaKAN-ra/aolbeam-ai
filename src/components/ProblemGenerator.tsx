"use client";

import type * as React from 'react';
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookText, MessageSquareText, ListChecks, Sparkles, Loader2, BarChartBig, Brain, Sigma, GitFork, Shuffle } from 'lucide-react';
import type { ProblemType, DifficultyLevel, AIGeneratedProblemType } from '@/types';

const ALL_CONCRETE_PROBLEM_TYPES: AIGeneratedProblemType[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];

interface ProblemGeneratorProps {
  onGenerate: (topic: string, type: AIGeneratedProblemType, difficulty: DifficultyLevel) => void;
  isLoading: boolean;
  defaultTopic?: string;
  defaultProblemType?: ProblemType;
  defaultDifficulty?: DifficultyLevel;
}

export interface ProblemGeneratorHandles {
  focusTopicInput: () => void;
}

const problemTypeOptions: { value: ProblemType; label: string; icon: React.ElementType }[] = [
  { value: 'theory', label: 'Theory', icon: MessageSquareText },
  { value: 'practical', label: 'Practical (MCQ)', icon: ListChecks },
  { value: 'conceptual', label: 'Conceptual', icon: Brain },
  { value: 'numerical', label: 'Numerical', icon: Sigma },
  { value: 'diagram_based', label: 'Diagram-Based', icon: GitFork },
  { value: 'random', label: 'Random', icon: Shuffle },
];

export const ProblemGenerator = forwardRef<ProblemGeneratorHandles, ProblemGeneratorProps>(
  (
    {
      onGenerate,
      isLoading,
      defaultTopic = "",
      defaultProblemType = "theory",
      defaultDifficulty = "medium"
    },
    ref
  ) => {
    const [topic, setTopic] = useState<string>(defaultTopic);
    const [problemType, setProblemType] = useState<ProblemType>(defaultProblemType);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);
    
    const topicInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusTopicInput: () => {
        topicInputRef.current?.focus();
      },
    }));

    useEffect(() => {
      setTopic(defaultTopic);
    }, [defaultTopic]);

    useEffect(() => {
      setProblemType(defaultProblemType);
    }, [defaultProblemType]);

    useEffect(() => {
      setDifficulty(defaultDifficulty);
    }, [defaultDifficulty]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedTopic = topic.trim();
      if (trimmedTopic) {
        let actualProblemType: AIGeneratedProblemType;
        if (problemType === 'random') {
          actualProblemType = ALL_CONCRETE_PROBLEM_TYPES[Math.floor(Math.random() * ALL_CONCRETE_PROBLEM_TYPES.length)];
        } else {
          actualProblemType = problemType as AIGeneratedProblemType;
        }
        onGenerate(trimmedTopic, actualProblemType, difficulty);
      }
    };

    const isTopicValid = Boolean(topic.trim());

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="text-primary" /> Generate a New Problem
          </CardTitle>
          <CardDescription>Enter a topic, select type, and choose difficulty.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic" className="flex items-center gap-2 text-base font-medium">
                <BookText className="w-5 h-5" /> Topic
              </Label>
              <Input
                ref={topicInputRef}
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Quantum Physics, Organic Chemistry"
                required
                className="text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-medium">Problem Type</Label>
              <RadioGroup
                value={problemType}
                onValueChange={(value: string) => setProblemType(value as ProblemType)}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {problemTypeOptions.map(option => (
                  <div key={option.value} className="flex-1 min-w-[120px]">
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only peer"/>
                    <Label 
                      htmlFor={option.value} 
                      className="flex items-center justify-center gap-2 p-3 border rounded-md cursor-pointer text-base
                                 hover:border-primary transition-colors 
                                 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                 peer-data-[state=checked]:text-primary"
                    >
                      <option.icon className="w-5 h-5" /> {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty-select" className="flex items-center gap-2 text-base font-medium">
                <BarChartBig className="w-5 h-5" /> Difficulty
              </Label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as DifficultyLevel)}>
                <SelectTrigger id="difficulty-select" className="w-full text-base">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading || !isTopicValid} className="w-full text-base py-3">
              {isLoading ? <Loader2 className="animate-spin" /> : "Generate Problem"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }
);

ProblemGenerator.displayName = 'ProblemGenerator';

