
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  generatePracticeProblem,
  type GeneratePracticeProblemOutput,
} from '@/ai/flows/generate-practice-problem';
import {
  evaluateTheoryAnswer,
  type EvaluateTheoryAnswerOutput,
} from '@/ai/flows/evaluate-theory-answer';
import {
  fetchTopicDetails,
  type FetchTopicDetailsOutput,
} from '@/ai/flows/fetch-topic-details';
import { RefreshCcw, FilePlus2 } from 'lucide-react';

import type { InteractionHistoryItem, ProblemType } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { Separator } from '@/components/ui/separator';

export default function ExamPrepPage() {
  const { toast } = useToast();

  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentProblem, setCurrentProblem] = useState<GeneratePracticeProblemOutput | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string } | null>(null);
  const [topicDetails, setTopicDetails] = useState<string | null>(null);

  const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [history, setHistory] = useLocalStorage<InteractionHistoryItem[]>('examPrepHistory', []);

  const addToHistory = useCallback((item: Omit<InteractionHistoryItem, 'id' | 'timestamp'>) => {
    setHistory(prevHistory => [{ ...item, id: Date.now().toString(), timestamp: new Date().toISOString() }, ...prevHistory].slice(0, 50)); // Keep last 50 items
  }, [setHistory]);

  const updateLastHistoryItem = useCallback((updates: Partial<InteractionHistoryItem>) => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const newHistory = [...prevHistory];
      newHistory[0] = { ...newHistory[0], ...updates };
      return newHistory;
    });
  }, [setHistory]);


  const handleGenerateProblem = async (topic: string, type: ProblemType) => {
    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    setCurrentProblemType(type);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null); // Reset topic details for new problem

    try {
      const result = await generatePracticeProblem({ topic, problemType: type });
      setCurrentProblem(result);
      addToHistory({
        topic,
        problemType: type,
        problem: result,
      });
      toast({ title: "Problem Generated!", description: `A new ${type} problem for "${topic}" is ready.` });
    } catch (error) {
      console.error("Error generating problem:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate problem. Please try again." });
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleEvaluateAnswer = async (answer: string) => {
    if (!currentProblem || !currentTopic) return;
    setIsLoadingEvaluation(true);
    setEvaluationResult(null);

    try {
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
      if (currentProblemType === 'theory') {
        // For theory, topicDetails to evaluateTheoryAnswer could be the problem statement or fetched topic details
        // For simplicity, let's use the problem statement as part of context.
        // A more advanced version might fetch topic details specifically for evaluation.
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific details available for this topic.";
        
        evalOutput = await evaluateTheoryAnswer({
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          topicDetails: fetchedDetailsForEval,
        });
        updateLastHistoryItem({ userAnswer: answer, evaluation: evalOutput });
      } else { // Practical (MCQ)
        // The 'answerFormat' from AI for practical problems should indicate the correct answer.
        // For example: "The correct option is 'Option A' because..." or just "Option A".
        // We need to parse this or rely on a consistent format.
        // Let's assume currentProblem.answerFormat *is* the correct option text.
        const isCorrect = currentProblem.answerFormat.includes(answer) || answer === currentProblem.answerFormat; // Simplified check
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}`
            : `Incorrect. The correct answer is: ${currentProblem.answerFormat}`,
        };
        updateLastHistoryItem({ selectedOption: answer, evaluation: evalOutput });
      }
      setEvaluationResult(evalOutput);
      toast({ title: "Answer Evaluated", description: evalOutput.isCorrect ? "Your answer is correct!" : "Your answer needs improvement." });
    } catch (error) {
      console.error("Error evaluating answer:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to evaluate answer. Please try again." });
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleFetchTopicDetails = async (topicToFetch: string) => {
    setIsLoadingDetails(true);
    try {
      const result = await fetchTopicDetails({ topic: topicToFetch });
      setTopicDetails(result.details);
      updateLastHistoryItem({ isTopicRevised: true, topicDetails: result.details });
      toast({ title: "Topic Details Fetched", description: `Details for "${topicToFetch}" are now available.` });
    } catch (error) {
      console.error("Error fetching topic details:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch topic details." });
      setTopicDetails("Failed to load details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleNewProblemSameTopic = () => {
    if (currentTopic) {
      handleGenerateProblem(currentTopic, currentProblemType);
    } else {
      toast({ title: "No Topic", description: "Please generate a problem first to use this option.", variant: "default" });
    }
  };

  const handleStartNew = () => {
    setCurrentTopic('');
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);
    // The ProblemGenerator component maintains its own topic input, so it will be ready for new input.
    toast({ title: "Ready for New Topic", description: "Enter a new topic and problem type." });
  };
  
  // Load initial state from history if available
  useEffect(() => {
    if (history.length > 0) {
      const lastItem = history[0];
      setCurrentTopic(lastItem.topic);
      setCurrentProblemType(lastItem.problemType);
      setCurrentProblem(lastItem.problem);
      if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
      if (lastItem.isTopicRevised && lastItem.topicDetails) setTopicDetails(lastItem.topicDetails);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary">Exam Prep AI</h1>
        <p className="text-lg text-muted-foreground">Your Personal AI Tutor for Competitive Exams</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">
        {/* Left Column: Problem Interaction */}
        <div className="lg:w-2/5 flex flex-col gap-6">
          <ProblemGenerator
            onGenerate={handleGenerateProblem}
            isLoading={isLoadingProblem}
            defaultTopic={currentTopic}
            defaultProblemType={currentProblemType}
          />
          {currentProblem && (
            <>
            <div className="flex gap-2 mt-0">
                <Button onClick={handleNewProblemSameTopic} variant="outline" className="flex-1">
                    <RefreshCcw className="mr-2 h-4 w-4" /> Another (Same Topic)
                </Button>
                <Button onClick={handleStartNew} variant="outline" className="flex-1">
                    <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                </Button>
            </div>
            <ProblemDisplay
              problem={currentProblem}
              problemType={currentProblemType}
              onSubmitAnswer={handleEvaluateAnswer}
              isLoading={isLoadingEvaluation}
              currentTopic={currentTopic}
            />
            </>
          )}
          {evaluationResult && <EvaluationResult evaluation={evaluationResult} />}
        </div>

        {/* Middle Column: Topic Revision */}
        <div className="lg:w-1/5 flex flex-col gap-6">
          <TopicRevision
            topic={currentProblem ? currentTopic : null}
            details={topicDetails}
            onFetchDetails={handleFetchTopicDetails}
            isLoading={isLoadingDetails}
          />
        </div>

        {/* Right Column: History */}
        <div className="lg:w-2/5 flex flex-col">
          <HistoryView history={history} />
        </div>
      </div>
      <footer className="text-center mt-12 py-6 border-t">
        <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Exam Prep AI. Powered by GenAI.</p>
      </footer>
    </div>
  );
}
