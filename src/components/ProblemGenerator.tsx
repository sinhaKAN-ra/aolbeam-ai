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

export const ALL_CONCRETE_PROBLEM_TYPES: AIGeneratedProblemType[] = ['theory', 'practical', 'practical_mcq', 'conceptual', 'numerical', 'diagram_based'];

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

// Include 'random' as an extended problem type option for UI only
type UISpecificProblemType = ProblemType | 'random';

const problemTypeOptions: { value: UISpecificProblemType; label: string; icon: React.ElementType }[] = [
  { value: 'theory', label: 'Theory', icon: MessageSquareText },
  { value: 'practical_mcq', label: 'Practical (MCQ)', icon: ListChecks },
  { value: 'practical', label: 'Practical', icon: ListChecks },
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
    const [problemType, setProblemType] = useState<UISpecificProblemType>(defaultProblemType);
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
        if (problemType === 'random' as UISpecificProblemType) {
          actualProblemType = ALL_CONCRETE_PROBLEM_TYPES[Math.floor(Math.random() * ALL_CONCRETE_PROBLEM_TYPES.length)];
        } else {
          actualProblemType = problemType as AIGeneratedProblemType;
        }
        onGenerate(trimmedTopic, actualProblemType, difficulty);
      }
    };

    const isTopicValid = Boolean(topic.trim());

    return (
      <Card className="overflow-hidden shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 mb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="text-primary" /> What are we working on?
          </CardTitle>
          <CardDescription>Pick a topic and shape your challenge. Your AI will take it from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-2">
              <Label htmlFor="topic" className="flex items-center gap-2 text-base font-medium">
                <BookText className="w-5 h-5" /> Topic
              </Label>
              <Input
                ref={topicInputRef}
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Try “Newton’s laws”, “Integration”, or “Organic chemistry”"
                required
                className="h-12 text-base"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-medium">Problem Type</Label>
              <RadioGroup
                value={problemType}
                onValueChange={(value: string) => setProblemType(value as UISpecificProblemType)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {problemTypeOptions.map(option => (
                  <div key={option.value} className="min-w-0">
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only peer"/>
                    <Label 
                      htmlFor={option.value} 
                      className="flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-xs min-h-14 peer-focus-visible:ring-2 peer-focus-visible:ring-ring
                                 hover:border-primary transition-colors 
                                 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10
                                 peer-data-[state=checked]:text-primary"
                    >
                      <option.icon className="w-4 h-4" /> {option.label}
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

            <Button type="submit" disabled={isLoading || !isTopicValid} className="w-full h-12 text-sm">
              {isLoading ? <><Loader2 className="animate-spin" /> Creating your challenge…</> : <><Sparkles className="h-4 w-4" /> Generate my practice problem</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }
);

ProblemGenerator.displayName = 'ProblemGenerator';

