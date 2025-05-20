
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
import type { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';


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
  const supabase = createBrowserClient();

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
  // For now, isUserSubscribed is still local storage. True subscription check would use Supabase user data.
  const [isUserSubscribed, setIsUserSubscribed] = useLocalStorage<boolean>('aolbeamIsUserSubscribed', false); 
  const [showPaywall, setShowPaywall] = useState<boolean>(false);


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setCurrentUser(session?.user ?? null);
      // If user logs in and was previously considered unsubscribed by localStorage,
      // but now has a valid session, you might want to reset local subscription state
      // or check their actual subscription status from your backend.
      // For now, we'll keep it simple: logging in doesn't automatically mean subscribed.
      // if (session?.user && !isUserSubscribed) {
      //    // Check actual subscription status here if you have it in Supabase user_metadata or another table
      // }
    });

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth, isUserSubscribed, setIsUserSubscribed]);


  const checkUsageLimit = useCallback(() => {
    // If there's a logged-in user, we might bypass the free limit based on their subscription status.
    // For now, if `isUserSubscribed` (from localStorage, or later from Supabase) is true, bypass.
    if (currentUser && isUserSubscribed) return false;
    if (!isUserSubscribed && interactionCount >= FREE_INTERACTION_LIMIT) {
      setShowPaywall(true);
      return true; // Limit reached
    }
    return false; // Limit not reached
  }, [interactionCount, isUserSubscribed, currentUser]);

  const incrementInteraction = useCallback(() => {
    if (!(currentUser && isUserSubscribed)) {
        setInteractionCount(prev => prev + 1);
    }
  }, [isUserSubscribed, setInteractionCount, currentUser]);


  const addToHistory = useCallback((item: Omit<InteractionHistoryItem, 'id' | 'timestamp'>) => {
    // TODO: If currentUser, save to Supabase instead of/as well as localStorage
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
  }, [setHistory, /*currentUser*/]); // Add currentUser when Supabase save is implemented

  const updateLastHistoryItem = useCallback((updates: Partial<InteractionHistoryItem>) => {
    // TODO: If currentUser, update in Supabase
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
  }, [setHistory, /*currentUser*/]); // Add currentUser when Supabase update is implemented


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
    if (!currentUser) {
        toast({ title: "Please Login", description: "You need to login or register to subscribe." });
        handleSignInWithGoogle();
        return;
    }
    console.log("Subscribed to plan:", planId, "by user:", currentUser.email); 
    // TODO: Actual subscription logic with Supabase/Stripe
    setIsUserSubscribed(true); // Simulate subscription
    setShowPaywall(false);
    setInteractionCount(0); 
    toast({ title: "Subscription Activated!", description: "You now have unlimited access." });
  };

  const handleSignInWithGoogle = async () => {
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Logout Error", description: error.message });
    } else {
      setCurrentUser(null);
      setIsUserSubscribed(false); // Reset local subscription status on logout
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };


  useEffect(() => {
    // Only load from localStorage if no user is logged in, or handle merging later.
    // For now, this simple load remains, but will be superseded by Supabase history for logged-in users.
    if (history.length > 0 && !currentUser) { // Check for currentUser to avoid overwriting potentially fetched history
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
  }, [currentUser]); // Rerun if currentUser changes, to potentially clear/load data

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
                <Button variant="outline" onClick={handleSignInWithGoogle} className="w-full sm:w-auto">
                  <UserCircle className="mr-2 h-5 w-5" /> Login / Sign Up with Google
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
            <HistoryView history={history} /> {/* This will show localStorage history for now */}
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
