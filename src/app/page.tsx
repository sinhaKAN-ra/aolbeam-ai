
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { RefreshCcw, FilePlus2, UserCircle, BookOpen, Mail, ShieldCheck, FileText, LogOut, Instagram, X, Linkedin as LinkedinIcon, Rss, Brain, Loader2 as PageLoader, Home, Newspaper, Settings, Menu, ArrowRight } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { InteractionHistoryItem, ProblemType, UserProfile } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';
import { ThemeToggle } from '@/components/ThemeToggle'; 


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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentProblem, setCurrentProblem] = useState<GeneratePracticeProblemOutput | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string } | null>(null);
  const [topicDetails, setTopicDetails] = useState<string | null>(null);

  const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [history, setHistory] = useLocalStorage<InteractionHistoryItem[]>('aolbeamHistory_guest', []); 
  const [guestInteractionCount, setGuestInteractionCount] = useLocalStorage<number>('aolbeamGuestInteractionCount', 0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  const problemGeneratorRef = useRef<HTMLDivElement>(null);

  const scrollToProblemGenerator = () => {
    problemGeneratorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const client = createClientComponentClient();
        setSupabaseClient(client);
    }
  }, []);


  useEffect(() => {
    if (!supabase) return;

    const fetchAndSetUserProfile = async (user: User) => {
      setIsLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
           if (error.code === 'PGRST116') { // Resource not found, likely new user, trigger should handle it
             // Attempt to refetch after a short delay in case trigger is slow
             setTimeout(async () => {
                const { data: refetchData, error: refetchError } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('id', user.id)
                  .single();
                if (refetchError) {
                  console.error('Error refetching user profile:', refetchError);
                  toast({ variant: "destructive", title: "Profile Error", description: "Could not load your profile. If this persists, please contact support." });
                  setUserProfile(null);
                } else if (refetchData) {
                  setUserProfile(refetchData as UserProfile);
                }
             }, 2000);
           } else {
            toast({ variant: "destructive", title: "Profile Error", description: "Could not load your profile. If this persists, please contact support." });
            setUserProfile(null);
           }
        } else if (data) {
          setUserProfile(data as UserProfile);
        }
      } catch (e) {
        console.error('Exception fetching user profile:', e);
        toast({ variant: "destructive", title: "Profile Error", description: "An unexpected error occurred while loading your profile." });
        setUserProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        await fetchAndSetUserProfile(user);
      } else {
        setUserProfile(null); 
        setIsLoadingProfile(false);
      }
    });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        await fetchAndSetUserProfile(user);
      } else {
         setIsLoadingProfile(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, toast]);


  const checkUsageLimit = useCallback((): boolean => {
    if (currentUser && userProfile) {
      if (userProfile.is_subscribed) return false; 
      if (userProfile.interaction_count >= FREE_INTERACTION_LIMIT) {
        setShowPaywall(true);
        return true;
      }
    } else if (!currentUser) { 
      if (guestInteractionCount >= FREE_INTERACTION_LIMIT) {
        setShowPaywall(true);
        return true;
      }
    }
    return false;
  }, [currentUser, userProfile, guestInteractionCount]);

  const incrementInteraction = useCallback(async () => {
    if (currentUser && userProfile && !userProfile.is_subscribed && supabase) {
        const newCount = userProfile.interaction_count + 1;
        setUserProfile(prev => prev ? { ...prev, interaction_count: newCount } : null); 
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ interaction_count: newCount })
                .eq('id', currentUser.id);
            if (error) throw error;
        } catch (error: any) {
            console.error("Error updating interaction count in Supabase:", error);
            toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count." });
            setUserProfile(prev => prev ? { ...prev, interaction_count: newCount -1 } : null);
        }
    } else if (!currentUser) {
        setGuestInteractionCount(prev => prev + 1);
    }
  }, [currentUser, userProfile, supabase, setGuestInteractionCount, toast]);


 const addToHistory = useCallback(async (item: Omit<InteractionHistoryItem, 'id' | 'timestamp' | 'supabase_id' | 'timeTakenSeconds' | 'feedbackRating' | 'feedbackComment'>) => {
    let newHistoryItem: InteractionHistoryItem = {
        ...item,
        id: Date.now().toString(), 
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
            user_answer: null, 
            selected_option: null, 
            evaluation_is_correct: null, 
            evaluation_feedback: null, 
            is_topic_revised: false, 
            topic_details_content: null, 
            feedback_rating: null, 
            feedback_comment: null, 
            time_taken_seconds: null, 
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
                newHistoryItem.supabase_id = data.id; 
                // Toast for new problem saved (already handled in UI by showing the problem)
            }
        } catch (error: any) {
            console.error("Error saving history to Supabase:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + error.message });
        }
    } else {
       setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 50));
    }
  }, [setHistory, supabase, currentUser, toast]);

  const updateLastHistoryItem = useCallback(async (updates: Partial<InteractionHistoryItem>) => {
    if (supabase && currentUser && history.length > 0 && history[0].supabase_id) {
      const lastSupabaseItem = history[0]; // This should be the item from Supabase history if fetched
      
      const dbUpdatePayload: any = {};
      if (updates.userAnswer !== undefined) dbUpdatePayload.user_answer = updates.userAnswer;
      if (updates.selectedOption !== undefined) dbUpdatePayload.selected_option = updates.selectedOption;
      if (updates.evaluation !== undefined) {
        dbUpdatePayload.evaluation_is_correct = updates.evaluation.isCorrect;
        dbUpdatePayload.evaluation_feedback = updates.evaluation.feedback;
      }
      if (updates.isTopicRevised !== undefined) dbUpdatePayload.is_topic_revised = updates.isTopicRevised;
      if (updates.topicDetails !== undefined) dbUpdatePayload.topic_details_content = updates.topicDetails;
      if (updates.feedbackRating !== undefined) dbUpdatePayload.feedback_rating = updates.feedbackRating;
      if (updates.feedbackComment !== undefined) dbUpdatePayload.feedback_comment = updates.feedbackComment;
      if (updates.timeTakenSeconds !== undefined) dbUpdatePayload.time_taken_seconds = updates.timeTakenSeconds;

      if (updates.problem) {
          if(updates.problem.problemStatement) dbUpdatePayload.problem_statement = updates.problem.problemStatement;
          if(updates.problem.answerFormat) dbUpdatePayload.answer_format = updates.problem.answerFormat;
          if(updates.problem.multipleChoiceOptions) dbUpdatePayload.multiple_choice_options = updates.problem.multipleChoiceOptions;
          if(updates.problem.correctAnswer) dbUpdatePayload.correct_answer = updates.problem.correctAnswer;
      }

      if (Object.keys(dbUpdatePayload).length > 0) {
        try {
          const { error } = await supabase
            .from('user_interactions')
            .update(dbUpdatePayload)
            .eq('id', lastSupabaseItem.supabase_id!)
            .eq('user_id', currentUser.id); 
          if (error) {
            throw error;
          }
          // Toast for update (already handled by evaluation/revision toasts)
        } catch (error: any) {
          console.error("Error updating history in Supabase:", error);
          toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + error.message });
        }
      }
    }
    // Always update local state for guest users or if Supabase update fails for logged-in users (for UI responsiveness)
     setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const updatedItem: InteractionHistoryItem = {
        ...prevHistory[0],
        ...updates,
        problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
      };
      return [updatedItem, ...prevHistory.slice(1)];
    });
  }, [setHistory, supabase, currentUser, toast, history]);


  const handleGenerateProblem = async (topic: string, type: ProblemType) => {
    if (isLoadingProfile || checkUsageLimit()) return;

    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    setCurrentProblemType(type);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);

    try {
      await incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: type });
      setCurrentProblem(result);
      await addToHistory({ 
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

  const handleEvaluateAnswer = async (answer: string, timeTakenSeconds?: number) => {
    if (!currentProblem || !currentTopic || isLoadingProfile) return;

    setIsLoadingEvaluation(true);
    setEvaluationResult(null);

    try {
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
      const updatesForHistory: Partial<InteractionHistoryItem> = { timeTakenSeconds };

      if (currentProblemType === 'theory') {
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific topic details available for this evaluation.";

        evalOutput = await evaluateTheoryAnswer({
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          answerFormat: currentProblem.answerFormat, 
          topicDetails: fetchedDetailsForEval,
        });
        updatesForHistory.userAnswer = answer;
      } else { 
        const isCorrect = answer === currentProblem.correctAnswer;
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}` 
            : `Incorrect. ${currentProblem.answerFormat} The correct option was: ${currentProblem.correctAnswer}`,
        };
        updatesForHistory.selectedOption = answer;
      }
      updatesForHistory.evaluation = evalOutput;
      await updateLastHistoryItem(updatesForHistory);
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
    if (isLoadingProfile || checkUsageLimit()) return; 

    setIsLoadingDetails(true);
    try {
      await incrementInteraction(); 
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

  const handleProblemFeedback = async (rating: string, comment: string) => {
    if (!currentProblem || !currentTopic || isLoadingProfile) return;
    await updateLastHistoryItem({
      feedbackRating: rating,
      feedbackComment: comment,
    });
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
    // If guest user, maybe clear the first history item, or just let it be overwritten.
    // For logged-in, it will just generate a new problem and save it.
    toast({ title: "Ready for New Topic", description: "Enter a new topic and problem type." });
  };

  const handleSubscribe = async (planId: string) => {
    if (!supabase || !currentUser) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready or user not logged in."});
      return;
    }
    
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .update({ 
                is_subscribed: true, 
                subscription_plan_id: planId, 
                interaction_count: 0, // Reset interaction count
                subscription_started_at: new Date().toISOString() 
            })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            setUserProfile(data as UserProfile); 
            setShowPaywall(false);
            toast({ title: "Subscription Activated!", description: "You now have unlimited access and your progress will be saved to your account." });
        }
    } catch (error: any) {
        console.error("Error subscribing user:", error);
        toast({ variant: "destructive", title: "Subscription Failed", description: "Could not activate your subscription. " + error.message });
    }
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
      setUserProfile(null); 
      setShowPaywall(false); 
      // Reload guest history from localStorage if any
      const guestHistory = localStorage.getItem('aolbeamHistory_guest');
      if (guestHistory) {
        try {
          const parsedGuestHistory = JSON.parse(guestHistory);
          setHistory(parsedGuestHistory);
           if (parsedGuestHistory.length > 0) {
            const lastItem = parsedGuestHistory[0];
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
        } catch (e) { console.error("Error parsing guest history on logout:", e); }
      } else {
        handleStartNew(); // Clear problem state
      }
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };


  useEffect(() => {
    // This effect is for guest users to load their last problem from localStorage
    if (!currentUser && history.length > 0 && !currentProblem && !isLoadingProblem) {
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
  }, [currentUser, history, isLoadingProblem, currentProblem]); 

  const interactionsLeft = currentUser && userProfile && !userProfile.is_subscribed 
    ? Math.max(0, FREE_INTERACTION_LIMIT - userProfile.interaction_count)
    : (!currentUser ? Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount) : 'Unlimited');

  // Navigation state for mobile
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
            if (!(showPaywall && currentUser && userProfile && !userProfile.is_subscribed)) {
                setShowPaywall(false);
            } else {
                 toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "destructive"});
            }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleSignInWithGoogle}
        isMandatory={showPaywall && !!currentUser && !!userProfile && !userProfile.is_subscribed}
      />
      
      <header className="sticky top-0 z-30 w-full border-b bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Brain /> AOLBEAM
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-primary">Profile</Link>
              <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-primary">Blog</Link>
              <Link href="/contact-us" className="text-sm font-medium text-muted-foreground hover:text-primary">Contact Us</Link>
              <Link href="/admin/blog" className="text-sm font-medium text-muted-foreground hover:text-primary">Admin</Link>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isLoadingProfile && currentUser && <Button variant="outline" size="sm" disabled><PageLoader className="mr-2 h-4 w-4 animate-spin" />Loading...</Button>}
              {!isLoadingProfile && currentUser && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <UserCircle className="h-6 w-6" />
                       <span className="sr-only">User Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                     <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        {currentUser.email}
                      </DropdownMenuItem>
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
                 !isLoadingProfile && !currentUser && (
                    <Button variant="outline" size="sm" onClick={handleSignInWithGoogle} disabled={!supabase}>
                     <UserCircle className="mr-2 h-4 w-4" /> Login / Sign Up
                    </Button>
                 )
              )}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                <Menu />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
          </div>
          {/* Mobile Navigation Menu */}
          {mobileNavOpen && (
            <div className="md:hidden border-t py-2">
              <nav className="flex flex-col space-y-2">
                <Link href="/profile" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Profile</Link>
                <Link href="/blog" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Blog</Link>
                <Link href="/contact-us" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Contact Us</Link>
                <Link href="/admin/blog" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Admin</Link>
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30 text-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Unlock Your Exam Potential with <span className="text-primary">AOLBEAM</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground">
              AI-powered practice problems designed to help you master concepts and ace your competitive exams. Beam into the world of knowledge!
            </p>
            <div className="mt-10">
              <Button size="lg" onClick={scrollToProblemGenerator} className="text-lg px-8 py-6">
                Generate Your First Problem <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="mt-12 max-w-4xl mx-auto">
            <Image 
              src="https://placehold.co/1200x600.png"
              alt="Abstract representation of learning and AI"
              width={1200}
              height={600}
              className="rounded-lg shadow-xl"
              data-ai-hint="technology learning"
              priority
            />
          </div>
        </div>
      </section>

      <main ref={problemGeneratorRef} className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex-grow">
        {isLoadingProfile && currentUser && (
            <div className="flex justify-center items-center h-64">
                <PageLoader className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading your profile...</p>
            </div>
        )}
        {(!isLoadingProfile || !currentUser) && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
              <div className="lg:col-span-3 flex flex-col gap-6"> {/* Main interaction column */}
                <ProblemGenerator
                  onGenerate={handleGenerateProblem}
                  isLoading={isLoadingProblem || (currentUser && isLoadingProfile)}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                />
                {currentProblem && (
                <>
                <div className="flex gap-2 mt-0">
                    <Button onClick={handleNewProblemSameTopic} variant="outline" className="flex-1" disabled={isLoadingProblem || (currentUser && isLoadingProfile)}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Another (Same Topic)
                    </Button>
                    <Button onClick={handleStartNew} variant="outline" className="flex-1" disabled={isLoadingProblem || (currentUser && isLoadingProfile)}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                    </Button>
                </div>
                <ProblemDisplay
                    problem={currentProblem}
                    problemType={currentProblemType}
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback}
                    isLoading={isLoadingEvaluation || (currentUser && isLoadingProfile)}
                    currentTopic={currentTopic}
                />
                </>
                )}
                {evaluationResult && <EvaluationResult evaluation={evaluationResult} />}
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6"> {/* Secondary column for revision and history */}
                <TopicRevision
                  topic={currentProblem ? currentTopic : null}
                  details={topicDetails}
                  onFetchDetails={handleFetchTopicDetails}
                  isLoading={isLoadingDetails || (currentUser && isLoadingProfile)}
                />
                <HistoryView 
                    history={currentUser && userProfile ? [] : history} // Pass empty if logged in, history will come from profile page for them
                    // Or ideally, fetch and pass logged-in user's history here too if desired on main page
                />
              </div>
            </div>
        )}
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
               <Link href="/admin/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <UserCircle size={16} /> Admin
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
                <X className="h-6 w-6" />
              </Link>
              <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary">
                <LinkedinIcon className="h-6 w-6" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved. Powered by GenAI.</p>
             <p className="text-xs text-muted-foreground mt-1">
                {isLoadingProfile && currentUser ? "Loading interactions count..." : 
                    (currentUser && userProfile?.is_subscribed) ? "You have unlimited interactions!" :
                    `Free interactions remaining: ${interactionsLeft}`
                }
            </p>
        </div>
      </footer>
    </div>
  );
}
