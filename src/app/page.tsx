
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { RefreshCcw, FilePlus2, UserCircle, BookOpen, Mail, ShieldCheck, FileText, LogOut } from 'lucide-react';
// Updated Supabase import for client components
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';


import type { InteractionHistoryItem, ProblemType } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';

const FREE_INTERACTION_LIMIT = 5;

export default function AOLBEAMPage() {
  const { toast } = useToast();
  const [supabase, setSupabaseClient] = useState<SupabaseClient | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentProblem, setCurrentProblem] = useState<GeneratePracticeProblemOutput | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string } | null>(null);
  const [topicDetails, setTopicDetails] = useState<string | null>(null);

  const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [history, setHistory] = useLocalStorage<InteractionHistoryItem[]>('aolbeamHistory', []);
  const [interactionCount, setInteractionCount] = useLocalStorage<number>('aolbeamInteractionCount', 0);
  const [isUserSubscribed, setIsUserSubscribed] = useLocalStorage<boolean>('aolbeamIsUserSubscribed', false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  useEffect(() => {
    // Initialize Supabase client on the client-side after mount
    // createClientComponentClient reads ENV VARS automatically
    if (typeof window !== 'undefined') {
        const client = createClientComponentClient();
        setSupabaseClient(client);
    }
  }, []);


  useEffect(() => {
    if (!supabase) return; // Only run if supabase client is initialized

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      setCurrentUser(session?.user ?? null);
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, isUserSubscribed, setIsUserSubscribed]);


  const checkUsageLimit = useCallback(() => {
    if (currentUser && isUserSubscribed) return false;
    if (!isUserSubscribed && interactionCount >= FREE_INTERACTION_LIMIT) {
      setShowPaywall(true);
      return true;
    }
    return false;
  }, [interactionCount, isUserSubscribed, currentUser]);

  const incrementInteraction = useCallback(() => {
    if (!(currentUser && isUserSubscribed)) {
        setInteractionCount(prev => prev + 1);
    }
  }, [isUserSubscribed, setInteractionCount, currentUser]);


  const addToHistory = useCallback((item: Omit<InteractionHistoryItem, 'id' | 'timestamp'>) => {
    const newHistoryItem: InteractionHistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        isTopicRevised: item.isTopicRevised || false,
        topicDetails: item.topicDetails || null,
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
      if (updates.problem) {
        newHistory[0] = {
          ...newHistory[0],
          ...updates,
          problem: { ...newHistory[0].problem!, ...updates.problem }
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
    setTopicDetails(null);

    try {
      incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: type });
      setCurrentProblem(result);
      addToHistory({
        topic,
        problemType: type,
        problem: result,
        isTopicRevised: false, 
        topicDetails: null,   
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
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific topic details available for this evaluation.";

        evalOutput = await evaluateTheoryAnswer({
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          answerFormat: currentProblem.answerFormat,
          topicDetails: fetchedDetailsForEval,
        });
        updateLastHistoryItem({ userAnswer: answer, evaluation: evalOutput });
      } else {
        const isCorrect = answer === currentProblem.correctAnswer;
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}`
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
      setTopicDetails(result.details);
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
    if (!supabase) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready."});
      return;
    }
    if (!currentUser) {
        toast({ title: "Please Login", description: "You need to login or register to subscribe." });
        handleSignInWithGoogle();
        return;
    }
    console.log("Subscribed to plan:", planId, "by user:", currentUser.email);
    setIsUserSubscribed(true);
    setShowPaywall(false);
    setInteractionCount(0);
    toast({ title: "Subscription Activated!", description: "You now have unlimited access." });
  };

  const handleSignInWithGoogle = async () => {
    if (!supabase) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Authentication service not ready. Please try again shortly." });
        return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Login Error", description: error.message });
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
        toast({ variant: "destructive", title: "Authentication Error", description: "Authentication service not ready." });
        return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Logout Error", description: error.message });
    } else {
      setCurrentUser(null);
      setIsUserSubscribed(false); // Reset subscription status on logout for demo purposes
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };


  useEffect(() => {
    if (history.length > 0 && !currentUser) {
      const lastItem = history[0];
      setCurrentTopic(lastItem.topic);
      setCurrentProblemType(lastItem.problemType);
      setCurrentProblem(lastItem.problem);
      if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
      if (lastItem.isTopicRevised && lastItem.topicDetails) {
        setTopicDetails(lastItem.topicDetails);
      } else {
        setTopicDetails(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, supabase]); 

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleSignInWithGoogle}
      />
      <header className="mb-6 md:mb-8 py-4 bg-card/50 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-primary">AOLBEAM</h1>
              <p className="text-md sm:text-lg text-muted-foreground mt-1">Access of Learning, beam into the world of knowledge.</p>
            </div>
            <div>
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <UserCircle className="mr-2 h-5 w-5" />
                      {currentUser.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <UserCircle className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" onClick={handleSignInWithGoogle} className="w-full sm:w-auto" disabled={!supabase}>
                  <UserCircle className="mr-2 h-5 w-5" /> { !supabase ? "Initializing..." : "Login / Sign Up with Google" }
                </Button>
              )}
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
              topic={currentProblem ? currentTopic : null}
              details={topicDetails}
              onFetchDetails={handleFetchTopicDetails}
              isLoading={isLoadingDetails}
            />
          </div>

          <div className="lg:w-2/5 flex flex-col">
            <HistoryView history={history} />
          </div>
        </div>
      </main>
      <footer className="mt-12 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-4 flex justify-center items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary"/>
                <p className="text-lg font-semibold text-primary">AOLBEAM</p>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mb-4 text-sm">
              <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <FileText size={16} /> Terms of Service
              </Link>
              <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <ShieldCheck size={16} /> Privacy Policy
              </Link>
              <Link href="/contact-us" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Mail size={16} /> Contact Us
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved. Powered by GenAI.</p>
            {!(currentUser && isUserSubscribed) && <p className="text-xs text-muted-foreground mt-1">Free interactions remaining: {Math.max(0, FREE_INTERACTION_LIMIT - interactionCount)}</p>}
        </div>
      </footer>
    </div>
  );
}

    