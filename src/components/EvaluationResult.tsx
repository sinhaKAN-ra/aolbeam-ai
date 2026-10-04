
"use client";

import type * as React from 'react';
import { forwardRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Info, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';
import ChatMarkdown from '@/components/chat-feature/ChatMarkdown';
import { Button } from '@/components/ui/button';

interface EvaluationResultProps {
  evaluation: EvaluateTheoryAnswerOutput | null;
}

// Function to format the step-by-step solution and remove duplicated content
const formatStepByStepSolution = (content: string): string => {
  if (!content) return '';
  
  // Check if the content has duplicated sections (common in AI-generated content)
  const lines = content.split('\n');
  
  // Look for patterns like 'Step-by-Step Solution' followed by duplicate content
  const stepByStepIndex = lines.findIndex(line => 
    line.toLowerCase().includes('step-by-step solution') || 
    line.toLowerCase().includes('step by step solution')
  );
  
  // If we find a section header, check if content is duplicated
  if (stepByStepIndex >= 0) {
    // Get the content after the header
    const afterHeader = lines.slice(stepByStepIndex + 1).join('\n');
    
    // Check if the content after the header contains duplicated information
    // like 'Correct Answer:' followed by the same answer again
    const correctAnswerIndex = afterHeader.toLowerCase().indexOf('correct answer:');
    if (correctAnswerIndex >= 0) {
      // Get the explanation part after 'Correct Answer:'
      const explanationIndex = afterHeader.toLowerCase().indexOf('explanation:', correctAnswerIndex);
      if (explanationIndex >= 0) {
        // Check if the explanation repeats the question or answer format
        const explanation = afterHeader.substring(explanationIndex);
        if (explanation.toLowerCase().includes('choose the correct') || 
            explanation.toLowerCase().includes('explain the reasoning')) {
          // Remove the duplicated explanation
          return lines.slice(0, stepByStepIndex + 1 + explanationIndex).join('\n');
        }
      }
    }
  }
  
  return content;
};

export const EvaluationResult = forwardRef<HTMLDivElement, EvaluationResultProps>(({ evaluation }, ref) => {
  const [showSolution, setShowSolution] = useState(true); // open by default — it's the point

  if (!evaluation) return null;

  const { isCorrect, feedback, correctAnswer } = evaluation;

  return (
    <Card
      ref={ref}
      className={`overflow-hidden shadow-lg ${isCorrect ? 'border-green-500/60' : 'border-amber-500/60'}`}
    >
      <CardHeader
        className={isCorrect ? 'bg-green-500/10' : 'bg-amber-500/10'}
      >
        <CardTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
          {isCorrect ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-500" />
          )}
          {isCorrect ? 'Correct!' : 'Needs Improvement'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {/* Feedback */}
        <div className="mb-5">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Feedback
          </h4>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-foreground">
            <ChatMarkdown content={feedback} />
          </div>
        </div>

        {/* Model solution */}
        {correctAnswer && (
          <div>
            <Button
              variant="ghost"
              className="mb-2 flex w-full items-center justify-between px-0 hover:bg-transparent"
              onClick={() => setShowSolution(!showSolution)}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Model answer &amp; steps
              </span>
              {showSolution ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </Button>

            {showSolution && (
              <div className="rounded-lg border-l-2 border-amber-500/70 bg-muted/40 p-4 text-foreground">
                {evaluation.solutionSteps && evaluation.solutionSteps.length > 0 ? (
                  <ol className="space-y-4">
                    {evaluation.solutionSteps.map((step, index) => (
                      <li key={index}>
                        <div className="mb-1 flex items-start gap-2">
                          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                            {step.stepNumber}
                          </span>
                          <h5 className="font-semibold text-foreground">{step.stepDescription}</h5>
                        </div>
                        <div className="pl-7">
                          <ChatMarkdown content={step.stepExplanation} />
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ChatMarkdown content={formatStepByStepSolution(correctAnswer)} />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
