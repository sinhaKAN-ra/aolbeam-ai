
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
        <CardContent>
          {/* Placeholder or additional info if needed when no topic is selected */}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Lightbulb className="text-primary" /> Insights for: <span className="font-normal truncate" title={topic}>{topic}</span>
        </CardTitle>
        <CardDescription className="text-sm mt-1">
         {explanatoryMessage}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!insights && (
          <Button 
            onClick={() => onFetchInsights(problem.problemStatement, topic)} 
            disabled={isLoading || !problem} 
            className="w-full text-base py-3"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <><Info className="mr-2 h-4 w-4" /> Fetch Problem Insights</>}
          </Button>
        )}
        {insights && (
          <>
            <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/30">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MathRenderer content={insights} />
              </div>
            </ScrollArea>
            <Button 
              onClick={() => onFetchInsights(problem.problemStatement, topic)} 
              disabled={isLoading || !problem} 
              className="w-full mt-4 text-base py-3" 
              variant="outline"
            >
             {isLoading ? <Loader2 className="animate-spin" /> : "Fetch Again"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
