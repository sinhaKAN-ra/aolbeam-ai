
"use client";

import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Loader2, Lightbulb } from 'lucide-react';
import MathRenderer from './MathRenderer';
import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem';

interface ProblemInsightsProps {
  problem: GeneratePracticeProblemOutput | null;
  topic: string | null;
  insights: string | null;
  onFetchInsights: (problemStatement: string, topic: string) => void;
  isLoading: boolean;
}

export function ProblemInsights({ problem, topic, insights, onFetchInsights, isLoading }: ProblemInsightsProps) {
  const explanatoryMessage = "Understand the core patterns and principles for the current problem. This helps you recognize how to approach similar challenges effectively, a key skill for top performers.";

  const handleFetchInsights = async () => {
    console.log('Fetch insights clicked');
    console.log('Problem:', problem);
    console.log('Topic:', topic);
    
    if (!problem || !topic) {
      console.error('Cannot fetch insights: problem or topic is missing');
      return;
    }
    
    try {
      console.log('Calling onFetchInsights with:', problem.problemStatement, topic);
      await onFetchInsights(problem.problemStatement, topic);
    } catch (error) {
      console.error('Error in handleFetchInsights:', error);
    }
  };

  if (!problem || !topic) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Lightbulb className="text-primary" /> Problem-Solving Insights
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            Generate a problem first to get specific solving insights and pattern recognition tips.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <Button 
            variant="outline" 
            className="w-full"
            disabled
          >
            Generate a problem to see insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  console.log('Rendering ProblemInsights with:', { 
    hasProblem: !!problem, 
    topic, 
    hasInsights: !!insights,
    isLoading 
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Lightbulb className="text-primary" /> <span className="font-normal">Understand pattern</span> for - <span className="font-normal truncate" title={topic}>{topic}</span>
        </CardTitle>
        <CardDescription className="text-base mt-2">
          {explanatoryMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6">
        {!insights ? (
          <Button 
            onClick={handleFetchInsights} 
            disabled={isLoading} 
            className="w-full text-base py-3 cursor-pointer relative z-20"
            data-testid="fetch-insights-button"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <Info className="mr-2 h-4 w-4" />
            )}
            Fetch Problem Insights
          </Button>
        ) : (
          <>
            <ScrollArea className="h-auto max-h-[600px] w-full rounded-md border p-6 bg-muted/30">
              <div className="prose prose-sm max-w-none dark:prose-invert break-words">
                <MathRenderer content={insights} />
              </div>
            </ScrollArea>
            <Button 
              onClick={handleFetchInsights} 
              disabled={isLoading} 
              className="w-full mt-5 text-base py-4 cursor-pointer" 
              variant="outline"
              data-testid="fetch-again-button"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Fetch Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
