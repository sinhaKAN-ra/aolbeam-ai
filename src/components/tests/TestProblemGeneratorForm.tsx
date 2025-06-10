"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProblemGenerator, ProblemGeneratorHandles } from '@/components/ProblemGenerator';
import type { TestProblem, ProblemType, DifficultyLevel } from '@/types';
import {
  generatePracticeProblem,
  type GeneratePracticeProblemOutput,
} from '@/ai/flows/generate-practice-problem';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestProblemGeneratorFormProps {
  testSeriesId: string;
  onProblemAdded: (problem: TestProblem) => void;
  onCancel: () => void;
}

// Map between frontend problem types and backend problem types
const problemTypeMap: Record<ProblemType, string> = {
  'theory': 'theory',
  'practical': 'practical',
  'conceptual': 'conceptual',
  'numerical': 'numerical',
  'diagram_based': 'diagram_based',
  'mcq': 'practical', // Map mcq to practical as that's the closest equivalent
  'multiple_choice': 'practical', // Map multiple_choice to practical as that's the closest equivalent
  'essay': 'theory', // Map essay to theory as that's the closest equivalent
  'code': 'practical', // Map code to practical
  'random': 'theory', // Default random to theory
};

export default function TestProblemGeneratorForm({
  testSeriesId,
  onProblemAdded,
  onCancel
}: TestProblemGeneratorFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<GeneratePracticeProblemOutput | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('medium');

  const problemGeneratorRef = useRef<ProblemGeneratorHandles>(null);
  const { toast } = useToast();

  const handleGenerateProblem = async (topic: string, problemType: ProblemType, difficulty: DifficultyLevel) => {
    setIsGenerating(true);
    setCurrentTopic(topic);
    setCurrentProblemType(problemType);
    setCurrentDifficulty(difficulty);
    
    try {
      // Map frontend problem type to backend-compatible type
      let backendType: ProblemType = problemType;
      
      // Handle 'random' type
      if (problemType === 'random') {
        const allowedTypes = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];
        backendType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)] as ProblemType;
      } 
      // Handle 'mcq' and other non-standard types
      else if (!['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'].includes(problemType)) {
        backendType = 'practical'; // Default to practical for mcq type
      }
      
      // Generate the problem with a valid backend type
      const problem = await generatePracticeProblem({
        topic,
        // Make sure we only pass allowed backend problem types
        problemType: backendType as "theory" | "practical" | "conceptual" | "numerical" | "diagram_based",
        difficulty,
      });
      
      setGeneratedProblem(problem);
    } catch (error) {
      console.error('Error generating problem:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate problem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProblem = async () => {
    if (!generatedProblem) return;
    
    setIsSaving(true);
    try {
      // Only use one of the allowed backend problem types
      const allowedProblemTypes = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];
      
      // Map frontend problem type to an allowed backend type
      let backendProblemType: ProblemType;
      if (allowedProblemTypes.includes(currentProblemType)) {
        backendProblemType = currentProblemType as ProblemType;
      } else if (currentProblemType === 'mcq' || currentProblemType === 'multiple_choice') {
        backendProblemType = 'practical';
      } else if (currentProblemType === 'essay') {
        backendProblemType = 'theory';
      } else if (currentProblemType === 'code') {
        backendProblemType = 'practical';
      } else {
        backendProblemType = 'theory'; // Default for 'random' or unknown types
      }
      
      const problemData: Partial<TestProblem> = {
        problem_statement: generatedProblem.problemStatement,
        problem_type: backendProblemType,
        difficulty: currentDifficulty,
        topic: currentTopic,
        correct_answer: generatedProblem.correctAnswer || null,
        explanation: generatedProblem.answerFormat || null,
        multiple_choice_options: generatedProblem.multipleChoiceOptions || null,
      };
      
      // Send the problem to the API
      const response = await fetch(`/api/test-series/${testSeriesId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add problem to test series');
      }
      
      const { data } = await response.json();
      onProblemAdded(data);
      
      toast({
        title: "Success",
        description: "Problem added to test series successfully",
      });
    } catch (error) {
      console.error('Error saving problem:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save problem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAnother = () => {
    setGeneratedProblem(null);
    problemGeneratorRef.current?.focusTopicInput();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Generate Test Problem</CardTitle>
        </CardHeader>
        <CardContent>
          {!generatedProblem ? (
            <ProblemGenerator
              ref={problemGeneratorRef}
              onGenerate={handleGenerateProblem}
              isLoading={isGenerating}
              defaultTopic={currentTopic}
              defaultProblemType={currentProblemType}
              defaultDifficulty={currentDifficulty}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg mb-2">Generated Problem</h3>
                <div className="mb-4">
                  <span className="font-medium">Topic:</span> {currentTopic}
                </div>
                <div className="mb-4">
                  <span className="font-medium">Problem:</span> 
                  <div className="mt-1">{generatedProblem.problemStatement}</div>
                </div>
                
                {generatedProblem.multipleChoiceOptions && generatedProblem.multipleChoiceOptions.length > 0 && (
                  <div className="mb-4">
                    <span className="font-medium">Options:</span>
                    <ul className="mt-1 list-disc pl-5">
                      {generatedProblem.multipleChoiceOptions.map((option, index) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {generatedProblem.correctAnswer && (
                  <div className="mb-4">
                    <span className="font-medium">Correct Answer:</span> 
                    <div className="mt-1">{generatedProblem.correctAnswer}</div>
                  </div>
                )}
                
                {generatedProblem.answerFormat && (
                  <div className="mb-4">
                    <span className="font-medium">Explanation:</span> 
                    <div className="mt-1">{generatedProblem.answerFormat}</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleGenerateAnother}
                  disabled={isGenerating || isSaving}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Another
                </Button>
                <Button
                  onClick={handleSaveProblem}
                  disabled={isGenerating || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Problem
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
