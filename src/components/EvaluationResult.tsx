
"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';
import MathRenderer from './MathRenderer';

interface EvaluationResultProps {
  evaluation: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string } | null;
}

export function EvaluationResult({ evaluation }: EvaluationResultProps) {
  if (!evaluation) return null;

  const { isCorrect, feedback } = evaluation;

  return (
    <Card className={`shadow-lg ${isCorrect ? 'border-green-500' : 'border-red-500'} bg-opacity-10`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          {isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
          Evaluation Result
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-lg font-medium mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
          {isCorrect ? "Correct!" : "Needs Improvement"}
        </p>
        <div className="prose prose-sm max-w-none text-base bg-muted/50 p-3 rounded-md dark:prose-invert">
          <h4 className="font-semibold flex items-center gap-1"><Info size={18}/>Feedback:</h4>
          <MathRenderer content={feedback} />
        </div>
      </CardContent>
    </Card>
  );
}
