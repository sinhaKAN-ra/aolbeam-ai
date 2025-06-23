"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProblemGenerator, ProblemGeneratorHandles } from '@/components/ProblemGenerator';
import type { TestProblem, ProblemType, DifficultyLevel, AIGeneratedProblemType } from '@/types';
import { ALL_CONCRETE_PROBLEM_TYPES } from '@/components/ProblemGenerator';
import {
  generatePracticeProblem,
  type GeneratePracticeProblemOutput,
} from '@/ai/flows/generate-practice-problem';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import MathRenderer from '../MathRenderer';
import { useToast } from '@/hooks/use-toast';

interface TestProblemGeneratorFormProps {
  testSeriesId: string;
  onProblemAdded: (problem: TestProblem) => void;
  onCancel: () => void;
  onGenerateNewProblem: () => void;
}

// Problem types are now consistent between frontend and backend

export const TestProblemGeneratorForm: React.FC<TestProblemGeneratorFormProps> = ({
  testSeriesId,
  onProblemAdded,
  onCancel,
  onGenerateNewProblem,
}) => {
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
    setCurrentDifficulty(difficulty);
    
    try {
      // Map problemType if it's 'random' to a concrete type for the AI flow
      const aiProblemType = problemType === 'random' 
        ? ALL_CONCRETE_PROBLEM_TYPES[Math.floor(Math.random() * ALL_CONCRETE_PROBLEM_TYPES.length)]
        : problemType === 'mcq' ? 'practical_mcq' : problemType as AIGeneratedProblemType;
      
      const problem = await generatePracticeProblem({
        topic,
        problemType: aiProblemType,
        difficulty,
      });
      
      // Debug log to see the complete AI response
      console.log('PROBLEM GENERATOR DEBUG - AI Response:', {
        requestedType: problemType,
        actualType: aiProblemType,
        result: problem,
        hasOptions: problem?.multipleChoiceOptions?.length > 0,
      });
      
      // Update the current problem type to the actual generated type for consistent saving
      // This ensures we always save with a valid concrete type, not 'random' or 'mcq'
      setCurrentProblemType(problem.problemType as ProblemType);
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
      const problemData = {
        problem_statement: generatedProblem.problemStatement.trim(),
        // Map 'mcq' to 'practical_mcq' to match database enum
        problem_type: (currentProblemType === 'mcq' ? 'practical_mcq' : currentProblemType) as AIGeneratedProblemType,
        difficulty: currentDifficulty,
        topic: currentTopic,
        correctAnswer: generatedProblem.correctAnswer || null,
        explanation: generatedProblem.answerFormat.trim(),
        answerFormat: generatedProblem.answerFormat.trim(),
        multipleChoiceOptions: generatedProblem.multipleChoiceOptions || [],
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
    onGenerateNewProblem();
  };

  return (
    <div className="space-y-6">
      <div className=" p-2">

        <div>
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
                  <span className="font-medium">Problem Statement:</span>
                  <div className="mt-1 prose prose-sm max-w-none dark:prose-invert"><MathRenderer content={generatedProblem.problemStatement} /></div>
                </div>
                
                {generatedProblem.multipleChoiceOptions && generatedProblem.multipleChoiceOptions.length > 0 && (
                  <div className="mb-4">
                    <span className="font-medium">Options:</span>
                    <ul className="mt-1 list-disc pl-5">
                      {generatedProblem.multipleChoiceOptions.map((option, index) => (
                        <li key={index} className="mb-2 last:mb-0 prose prose-sm max-w-none dark:prose-invert"><MathRenderer content={option} /></li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {generatedProblem.correctAnswer && (
                  <div className="mb-4">
                    <span className="font-medium">Correct Answer:</span> 
                    <div className="mt-1 prose prose-sm max-w-none dark:prose-invert"><MathRenderer content={generatedProblem.correctAnswer} /></div>
                  </div>
                )}
                
                {generatedProblem.answerFormat && (
                  <div className="mb-4">
                    <span className="font-medium">Answer Format:</span> 
                    <div className="mt-1 prose prose-sm max-w-none dark:prose-invert"><MathRenderer content={generatedProblem.answerFormat} /></div>
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
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
