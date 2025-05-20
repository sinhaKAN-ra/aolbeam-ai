

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
import { RefreshCcw, FilePlus2, UserCircle, BookOpen, Mail, ShieldCheck, FileText, LogOut, Instagram, Twitter, Linkedin, Rss } from 'lucide-react';
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

// SVG Icon for Discord (used in footer)
const DiscordIconFooter = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Discord</title>
    <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.249a18.04 18.04 0 00-7.443 0 11.5 11.5 0 00-.608-1.25.074.074 0 00-.079-.037A19.718 19.718 0 003.683 4.37a.074.074 0 00-.035.076c.003.134.036.29.076.411.403 1.192.758 2.274 1.049 3.265a15.016 15.016 0 00-2.06 2.127.074.074 0 00.007.099c.16.217.341.41.524.578a.07.07 0 00.081.021c3.487-1.507 6.235-1.744 8.441-1.744s4.955.236 8.442 1.744a.07.07 0 00.081-.021c.183-.168.364-.361.523-.578a.074.074 0 00.007-.1 15.03 15.03 0 00-2.06-2.127c.29-.99.645-2.073 1.049-3.265.04-.121.072-.277.076-.411a.074.074 0 00-.035-.076zM8.02 12.32c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.336.634 1.336 1.414.001.78-.599 1.414-1.336 1.414zm7.975 0c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.338.634 1.338 1.414s-.601 1.414-1.338 1.414z"/>
  </svg>
);

// SVG Icon for Telegram (used in footer)
const TelegramIconFooter = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Telegram</title>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.032.192.032.283.001.085-.006.169-.021.25a1.003 1.003 0 0 1-.193.404l-2.109 7.721c-.193.707-.465.938-.779.951-.371.015-.613-.14-.86-.301-.282-.182-1.079-.69-1.461-.961-.575-.405-1.001-.612-1.001-.926.002-.237.309-.515.919-1.104.002-.002.004-.003.005-.005L15.9 9.765c.1-.09.2-.18.2-.27s-.102-.16-.2-.16c-.09 0-.17.05-.24.12l-4.011 3.697-1.04 3.246c-.125.38-.28.72-.49.96-.21.24-.49.41-.83.41-.48 0-.93-.24-1.12-.68-.2-.44-.4-.88-.6-1.32-.18-.41-.36-.82-.54-1.23l-.02-.04c-.03-.09-.06-.18-.09-.27a.53.53 0 0 1-.03-.28.5.5 0 0 1 .09-.28l.01-.01 7.84-5.002c.02-.01.04-.02.06-.03z"/>
  </svg>
);


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
      // If user logs out, we might want to clear or reset local state tied to a specific user.
      // If user logs in, we might want to fetch their history from Supabase (future step).
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


 const addToHistory = useCallback(async (item: Omit<InteractionHistoryItem, 'id' | 'timestamp' | 'supabase_id'>) => {
    let newHistoryItem: InteractionHistoryItem = {
        ...item,
        id: Date.now().toString(), // Local/React key
        timestamp: new Date().toISOString(),
        isTopicRevised: item.isTopicRevised || false,
        topicDetails: item.topicDetails || null,
        userAnswer: item.userAnswer,
        selectedOption: item.selectedOption,
        evaluation: item.evaluation,
    };

    if (supabase && currentUser) {
        const dbRecord = {
            user_id: currentUser.id,
            topic: item.topic,
            problem_type: item.problemType,
            problem_statement: item.problem.problemStatement,
            answer_format: item.problem.answerFormat,
            multiple_choice_options: item.problem.multipleChoiceOptions,
            correct_answer: item.problem.correctAnswer,
            // user_answer, selected_option, evaluation fields will be updated by updateLastHistoryItem
        };
        try {
            const { data, error } = await supabase
                .from('user_interactions')
                .insert(dbRecord)
                .select()
                .single();

            if (error) {
                throw error;
            }
            if (data) {
                newHistoryItem.supabase_id = data.id; // Store Supabase ID
                toast({ title: "Progress Saved", description: "Your new problem has been saved to your account." });
            }
        } catch (error: any) {
            console.error("Error saving history to Supabase:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + error.message });
        }
    }

    setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 50));
  }, [setHistory, supabase, currentUser, toast]);

  const updateLastHistoryItem = useCallback(async (updates: Partial<InteractionHistoryItem>) => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const updatedItem: InteractionHistoryItem = {
        ...prevHistory[0],
        ...updates,
        problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
      };
      
      const newHistory = [updatedItem, ...prevHistory.slice(1)];

      if (supabase && currentUser && updatedItem.supabase_id) {
        const dbUpdatePayload: any = {};
        if (updates.userAnswer !== undefined) dbUpdatePayload.user_answer = updates.userAnswer;
        if (updates.selectedOption !== undefined) dbUpdatePayload.selected_option = updates.selectedOption;
        if (updates.evaluation !== undefined) {
          dbUpdatePayload.evaluation_is_correct = updates.evaluation.isCorrect;
          dbUpdatePayload.evaluation_feedback = updates.evaluation.feedback;
        }
        if (updates.isTopicRevised !== undefined) dbUpdatePayload.is_topic_revised = updates.isTopicRevised;
        if (updates.topicDetails !== undefined) dbUpdatePayload.topic_details_content = updates.topicDetails;
         // If problem details were part of updates (e.g. if a problem itself could be edited, though not current use case)
        if (updates.problem) {
            if(updates.problem.problemStatement) dbUpdatePayload.problem_statement = updates.problem.problemStatement;
            if(updates.problem.answerFormat) dbUpdatePayload.answer_format = updates.problem.answerFormat;
            if(updates.problem.multipleChoiceOptions) dbUpdatePayload.multiple_choice_options = updates.problem.multipleChoiceOptions;
            if(updates.problem.correctAnswer) dbUpdatePayload.correct_answer = updates.problem.correctAnswer;
        }


        if (Object.keys(dbUpdatePayload).length > 0) {
          (async () => {
            try {
              const { error } = await supabase
                .from('user_interactions')
                .update(dbUpdatePayload)
                .eq('id', updatedItem.supabase_id!)
                .eq('user_id', currentUser.id); // Ensure user owns record
              if (error) {
                throw error;
              }
              toast({ title: "Progress Updated", description: "Your latest interaction has been saved." });
            } catch (error: any) {
              console.error("Error updating history in Supabase:", error);
              toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + error.message });
            }
          })();
        }
      }
      return newHistory;
    });
  }, [setHistory, supabase, currentUser, toast]);


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
      await addToHistory({ // Await addToHistory as it's now async
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
        await updateLastHistoryItem({ userAnswer: answer, evaluation: evalOutput });
      } else { // Practical
        const isCorrect = answer === currentProblem.correctAnswer;
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}` 
            : `Incorrect. ${currentProblem.answerFormat} The correct option was: ${currentProblem.correctAnswer}`,
        };
        await updateLastHistoryItem({ selectedOption: answer, evaluation: evalOutput });
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
      await updateLastHistoryItem({ isTopicRevised: true, topicDetails: result.details });
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
    setInteractionCount(0); // Reset free interaction count after subscription
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
    // This effect restores state from localStorage if user is logged out
    // It does NOT fetch from Supabase; that's for the profile page or specific user actions
    if (history.length > 0 && !currentUser && !currentProblem && !isLoadingProblem) {
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
  }, [currentUser, supabase, history]); // Removed currentProblem and isLoadingProblem from deps to avoid loops

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
            <div className="flex justify-center gap-4 sm:gap-6 mb-4 text-sm flex-wrap">
              <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <FileText size={16} /> Terms
              </Link>
              <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <ShieldCheck size={16} /> Privacy
              </Link>
              <Link href="/contact-us" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Mail size={16} /> Contact
              </Link>
              <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <Rss size={16} /> Blog
              </Link>
            </div>
            <div className="flex justify-center gap-x-6 gap-y-2 mt-6 mb-4 flex-wrap">
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="text-muted-foreground hover:text-primary">
                <DiscordIconFooter className="h-6 w-6" />
              </Link>
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-muted-foreground hover:text-primary">
                <TelegramIconFooter className="h-6 w-6" />
              </Link>
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-6 w-6" />
              </Link>
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-6 w-6" />
              </Link>
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-6 w-6" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved. Powered by GenAI.</p>
            {!(currentUser && isUserSubscribed) && <p className="text-xs text-muted-foreground mt-1">Free interactions remaining: {Math.max(0, FREE_INTERACTION_LIMIT - interactionCount)}</p>}
        </div>
      </footer>
    </div>
  );
}

