
"use client";

import type * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem';
import type { ProblemType } from '@/types';

interface ProblemDisplayProps {
  problem: GeneratePracticeProblemOutput;
  problemType: ProblemType;
  onSubmitAnswer: (answer: string) => void;
  isLoading: boolean;
  currentTopic: string;
}

export function ProblemDisplay({ problem, problemType, onSubmitAnswer, isLoading, currentTopic }: ProblemDisplayProps) {
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');

  useEffect(() => {
    // Reset answer fields when a new problem is displayed
    setUserAnswer('');
    setSelectedOption('');
  }, [problem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problemType === 'theory' && userAnswer.trim()) {
      onSubmitAnswer(userAnswer);
    } else if (problemType === 'practical' && selectedOption) {
      onSubmitAnswer(selectedOption);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Practice Problem: <span className="text-primary">{currentTopic}</span></CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-base whitespace-pre-wrap">{problem.problemStatement}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {problemType === 'theory' ? (
            <div className="space-y-2">
              <Label htmlFor="theory-answer" className="text-base font-medium">Your Answer</Label>
              <Textarea
                id="theory-answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your detailed answer here..."
                rows={6}
                required
                className="text-base"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-base font-medium">Select an Option</Label>
              <RadioGroup
                value={selectedOption}
                onValueChange={setSelectedOption}
                className="space-y-2"
              >
                {problem.multipleChoiceOptions?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border rounded-md hover:border-primary transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary/10">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="cursor-pointer text-base flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
          <Button type="submit" disabled={isLoading || (problemType === 'theory' ? !userAnswer.trim() : !selectedOption)} className="w-full text-base py-3">
            {isLoading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Submit Answer</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
