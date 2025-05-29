
"use client";

import type * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Info, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';
import MathRenderer from './MathRenderer';
import { Button } from '@/components/ui/button';

interface EvaluationResultProps {
  evaluation: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string; correctAnswer?: string } | null;
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

export function EvaluationResult({ evaluation }: EvaluationResultProps) {
  const [showSolution, setShowSolution] = useState(false);
  
  if (!evaluation) return null;

  const { isCorrect, feedback, correctAnswer } = evaluation;

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
        <div className="prose prose-sm max-w-none text-base bg-muted/50 p-3 rounded-md dark:prose-invert mb-4">
          <h4 className="font-semibold flex items-center gap-1"><Info size={18}/>Feedback:</h4>
          <MathRenderer content={feedback} />
        </div>
        
        {correctAnswer && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full flex justify-between items-center mb-2"
              onClick={() => setShowSolution(!showSolution)}
            >
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-500" />
                <span>Step-by-Step Solution</span>
              </div>
              {showSolution ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
            
            {showSolution && (
              <div className="prose prose-sm max-w-none text-base bg-muted/50 p-3 rounded-md dark:prose-invert mt-2 border-l-4 border-amber-500 overflow-x-auto">
                <MathRenderer content={formatStepByStepSolution(correctAnswer)} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
