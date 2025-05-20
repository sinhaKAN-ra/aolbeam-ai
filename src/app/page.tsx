
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
import { RefreshCcw, FilePlus2, UserCircle } from 'lucide-react';

import type { InteractionHistoryItem, ProblemType } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';

const FREE_INTERACTION_LIMIT = 5;

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
  const [interactionCount, setInteractionCount] = useLocalStorage<number>('examPrepInteractionCount', 0);
  const [isUserSubscribed, setIsUserSubscribed] = useLocalStorage<boolean>('examPrepIsUserSubscribed', false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);


  const checkUsageLimit = useCallback(() => {
    if (!isUserSubscribed && interactionCount >= FREE_INTERACTION_LIMIT) {
      setShowPaywall(true);
      return true; // Limit reached
    }
    return false; // Limit not reached
  }, [interactionCount, isUserSubscribed]);

  const incrementInteraction = useCallback(() => {
    if (!isUserSubscribed) {
        setInteractionCount(prev => prev + 1);
    }
  }, [isUserSubscribed, setInteractionCount]);


  const addToHistory = useCallback((item: Omit<InteractionHistoryItem, 'id' | 'timestamp'>) => {
    const newHistoryItem: InteractionHistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        isTopicRevised: item.isTopicRevised || false, // Explicitly initialize
        topicDetails: item.topicDetails || null,    // Explicitly initialize
        // Ensure other optional fields are handled if not provided in 'item'
        userAnswer: item.userAnswer,
        selectedOption: item.selectedOption,
        evaluation: item.evaluation,
    };
    setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 50));
  }, [setHistory]);

  const updateLastHistoryItem = useCallback((updates: Partial<InteractionHistoryItem>) => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const newHistory = [...prevHistory];
      // Ensure problem object within history is also spread if updated
      if (updates.problem) {
        newHistory[0] = { 
          ...newHistory[0], 
          ...updates, 
          problem: { ...newHistory[0].problem, ...updates.problem } 
        };
      } else {
        newHistory[0] = { ...newHistory[0], ...updates };
      }
      return newHistory;
    });
  }, [setHistory]);


  const handleGenerateProblem = async (topic: string, type: ProblemType) => {
    if (checkUsageLimit()) return;

    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    setCurrentProblemType(type);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null); // Clear previous topic details from UI

    try {
      incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: type });
      setCurrentProblem(result);
      addToHistory({ // This will use the enhanced addToHistory with explicit defaults
        topic,
        problemType: type,
        problem: result,
        // isTopicRevised and topicDetails will be defaulted by addToHistory
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
    // Evaluating an answer does not count towards interaction limit for now (this might change based on product decision)
    // However, fetching topic details *during* evaluation (if not already loaded) *will* count.

    setIsLoadingEvaluation(true);
    setEvaluationResult(null);

    try {
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
      if (currentProblemType === 'theory') {
        // Fetch details if not already available in state (e.g., user didn't click "Revise Topic")
        // This fetch *will* increment interaction count if it occurs.
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific topic details available for this evaluation.";
        
        evalOutput = await evaluateTheoryAnswer({
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          answerFormat: currentProblem.answerFormat, // Pass the expected answer format
          topicDetails: fetchedDetailsForEval,
        });
        updateLastHistoryItem({ userAnswer: answer, evaluation: evalOutput });
      } else { // Practical MCQ
        const isCorrect = answer === currentProblem.correctAnswer;
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}` // answerFormat is the explanation
            : `Incorrect. ${currentProblem.answerFormat} The correct option was: ${currentProblem.correctAnswer}`,
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
    if (checkUsageLimit()) return;
    
    setIsLoadingDetails(true);
    try {
      incrementInteraction();
      const result = await fetchTopicDetails({ topic: topicToFetch });
      setTopicDetails(result.details); // Update UI state for TopicRevision component
      // Update the current history item with these details
      updateLastHistoryItem({ isTopicRevised: true, topicDetails: result.details });
      toast({ title: "Topic Details Fetched", description: `Details for "${topicToFetch}" are now available.` });
    } catch (error)
    {
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
    toast({ title: "Ready for New Topic", description: "Enter a new topic and problem type." });
  };
  
  const handleSubscribe = (planId: string) => {
    console.log("Subscribed to plan:", planId); 
    setIsUserSubscribed(true);
    setShowPaywall(false);
    setInteractionCount(0); 
    toast({ title: "Subscription Activated!", description: "You now have unlimited access." });
  };

  const handleLoginRegister = () => {
    console.log("Login/Register clicked");
    toast({ title: "Coming Soon", description: "User authentication will be available soon." });
  };

  useEffect(() => {
    // Restore state from the most recent history item on initial load
    if (history.length > 0) {
      const lastItem = history[0];
      setCurrentTopic(lastItem.topic);
      setCurrentProblemType(lastItem.problemType);
      setCurrentProblem(lastItem.problem); // This will include the new 'correctAnswer'
      if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
      // Only set topicDetails from history if it was explicitly revised for that item
      if (lastItem.isTopicRevised && lastItem.topicDetails) {
        setTopicDetails(lastItem.topicDetails);
      } else {
        setTopicDetails(null); // Ensure it's cleared if not revised for the last item
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount, history itself is a dependency of useLocalStorage

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleLoginRegister}
      />
      <header className="mb-6 md:mb-8 py-4 bg-card/50 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary">Exam Prep AI</h1>
              <p className="text-md sm:text-lg text-muted-foreground mt-1">Your Personal AI Tutor</p>
            </div>
            <div>
              <Button variant="outline" onClick={handleLoginRegister} className="w-full sm:w-auto">
                <UserCircle className="mr-2 h-5 w-5" /> Login / Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">
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

          <div className="lg:w-1/5 flex flex-col gap-6">
            <TopicRevision
              topic={currentProblem ? currentTopic : null} // Only show topic if a problem is active
              details={topicDetails} // This state is managed and cleared appropriately
              onFetchDetails={handleFetchTopicDetails}
              isLoading={isLoadingDetails}
            />
          </div>

          <div className="lg:w-2/5 flex flex-col">
            <HistoryView history={history} />
          </div>
        </div>
      </main>
      <footer className="text-center mt-12 py-6 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Exam Prep AI. Powered by GenAI.</p>
            {!isUserSubscribed && <p className="text-xs text-muted-foreground mt-1">Free interactions remaining: {Math.max(0, FREE_INTERACTION_LIMIT - interactionCount)}</p>}
        </div>
      </footer>
    </div>
  );
}
