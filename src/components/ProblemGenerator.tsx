
"use client";

import type * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookText, MessageSquareText, ListChecks, Sparkles, Loader2 } from 'lucide-react';
import type { ProblemType } from '@/types';

interface ProblemGeneratorProps {
  onGenerate: (topic: string, type: ProblemType) => void;
  isLoading: boolean;
  defaultTopic?: string;
  defaultProblemType?: ProblemType;
}

export function ProblemGenerator({ onGenerate, isLoading, defaultTopic = "", defaultProblemType = "theory" }: ProblemGeneratorProps) {
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [problemType, setProblemType] = useState<ProblemType>(defaultProblemType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerate(topic, problemType);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="text-primary" /> Generate a New Problem
        </CardTitle>
        <CardDescription>Enter a topic and select the type of problem you want to practice.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2 text-base font-medium">
              <BookText className="w-5 h-5" /> Topic
            </Label>
            <Input
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
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:border-primary transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 flex-1">
                <RadioGroupItem value="theory" id="theory" />
                <Label htmlFor="theory" className="flex items-center gap-2 cursor-pointer text-base">
                  <MessageSquareText className="w-5 h-5" /> Theory Question
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover:border-primary transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 flex-1">
                <RadioGroupItem value="practical" id="practical" />
                <Label htmlFor="practical" className="flex items-center gap-2 cursor-pointer text-base">
                  <ListChecks className="w-5 h-5" /> Practical (MCQ)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <Button type="submit" disabled={isLoading || !topic.trim()} className="w-full text-base py-3">
            {isLoading ? <Loader2 className="animate-spin" /> : "Generate Problem"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
