
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  generatePracticeProblem,
  type GeneratePracticeProblemOutput,
  type GeneratePracticeProblemInput,
} from '@/ai/flows/generate-practice-problem';
import {
  evaluateTheoryAnswer,
  type EvaluateTheoryAnswerOutput,
} from '@/ai/flows/evaluate-theory-answer';
import {
  fetchTopicDetails,
  type FetchTopicDetailsOutput,
} from '@/ai/flows/fetch-topic-details';
import { RefreshCcw, FilePlus2, UserCircle, LogOut, Brain, Loader2 as PageLoader, Menu, ArrowRight, ShieldCheck, Settings } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { InteractionHistoryItem, ProblemType, UserProfile, DifficultyLevel } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import Footer from '@/components/Footer';
import { useLocalStorage } from '@/hooks/useLocalStorage';


const FREE_INTERACTION_LIMIT = 5;
const ACTUAL_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];
const ADMIN_EMAIL = "sinhakaran01235@gmail.com";

export default function AOLBEAMPage() {
  const { toast } = useToast();
  const [supabase, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('medium');
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
    problemGeneratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const client = createClientComponentClient();
        setSupabaseClient(client);
    }
  }, []);


  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    if (!supabase) return;
    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
         if (error.code === 'PGRST116') { 
           toast({ variant: "default", title: "Setting up your account...", description: "This might take a moment for new users." });
            // The trigger 'handle_new_user' should have created the profile.
            // We attempt a fetch again after a short delay, assuming the trigger might have a slight delay.
            await new Promise(resolve => setTimeout(resolve, 1500));
            const { data: newProfileData, error: retryError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (retryError) {
                console.error('Error fetching profile on retry:', retryError);
                toast({ variant: "destructive", title: "Profile Setup Failed", description: "Could not initialize your profile. Please try logging out and in again." });
                setUserProfile(null);
            } else if (newProfileData) {
                setUserProfile(newProfileData as UserProfile);
            } else {
                 // This case should ideally not be reached if the trigger works.
                toast({ variant: "destructive", title: "Profile Incomplete", description: "Your profile is still being set up. Please wait or re-login." });
                setUserProfile(null);
            }
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
  }, [supabase, toast]);


  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (user) {
        await fetchAndSetUserProfile(user);
        // No automatic paywall trigger here for new users.
        // Paywall is triggered by checkUsageLimit() based on interaction_count.
      } else {
        setUserProfile(null);
        setIsLoadingProfile(false);
        const guestHistoryRaw = localStorage.getItem('aolbeamHistory_guest');
        if (guestHistoryRaw) {
          try {
            const parsedGuestHistory = JSON.parse(guestHistoryRaw);
            setHistory(parsedGuestHistory);
          } catch(e) { console.error("Error parsing guest history on logout:", e); }
        }
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
  }, [supabase, fetchAndSetUserProfile, setHistory]);


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


 const addToHistory = useCallback(async (item: Omit<InteractionHistoryItem, 'id' | 'timestamp' | 'supabase_id' | 'timeTakenSeconds' | 'feedbackRating' | 'feedbackComment'> & { actualProblemType: Exclude<ProblemType, 'random'> }) => {
    let newHistoryItem: InteractionHistoryItem = {
        ...item,
        id: Date.now().toString(), 
        timestamp: new Date().toISOString(),
        isTopicRevised: false, 
        topicDetails: null, 
        userAnswer: item.userAnswer,
        selectedOption: item.selectedOption,
        evaluation: item.evaluation,
        difficulty: item.difficulty,
        problemType: item.problemType, // User's selection, could be 'random'
    };

    if (supabase && currentUser) {
        const dbRecord: any = { 
            user_id: currentUser.id,
            topic: item.topic,
            problem_type: item.actualProblemType, // Store the actual generated type
            difficulty: item.difficulty,
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
    if (supabase && currentUser) {
      let itemToUpdateSupabaseId: string | undefined;
      
      const { data: latestInteraction, error: fetchError } = await supabase
          .from('user_interactions')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { 
          console.error("Error fetching last history item ID from Supabase for update:", fetchError);
      }
      itemToUpdateSupabaseId = latestInteraction?.id;

      if (itemToUpdateSupabaseId) {
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
        
        if (Object.keys(dbUpdatePayload).length > 0) {
          try {
            const { error } = await supabase
              .from('user_interactions')
              .update(dbUpdatePayload)
              .eq('id', itemToUpdateSupabaseId)
              .eq('user_id', currentUser.id); 
            if (error) {
              throw error;
            }
          } catch (error: any) {
            console.error("Error updating history in Supabase:", error);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + error.message });
          }
        }
      } else if (!currentUser) { 
          setHistory(prevHistory => {
            if (prevHistory.length === 0) return prevHistory;
            const updatedItem: InteractionHistoryItem = {
              ...prevHistory[0],
              ...updates,
              problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
            };
            return [updatedItem, ...prevHistory.slice(1)];
          });
      } else {
        console.warn("Could not determine which history item to update in Supabase for logged-in user.");
      }
    } else if (!currentUser) { 
        setHistory(prevHistory => {
          if (prevHistory.length === 0) return prevHistory;
          const updatedItem: InteractionHistoryItem = {
            ...prevHistory[0],
            ...updates,
            problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
          };
          return [updatedItem, ...prevHistory.slice(1)];
        });
    }
  }, [setHistory, supabase, currentUser, toast]); 


  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if (isLoadingProfile || checkUsageLimit()) return;

    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    // setCurrentProblemType(type); // Will be set after randomization if 'random'
    setCurrentDifficulty(difficulty);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);

    let actualProblemTypeForAI: Exclude<ProblemType, 'random'> = type as Exclude<ProblemType, 'random'>;
    if (type === 'random') {
        actualProblemTypeForAI = ACTUAL_PROBLEM_TYPES[Math.floor(Math.random() * ACTUAL_PROBLEM_TYPES.length)];
    }
    setCurrentProblemType(actualProblemTypeForAI); // Set to actual resolved type for UI consistency

    try {
      await incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: actualProblemTypeForAI, difficulty });
      setCurrentProblem(result);
      await addToHistory({ 
        topic,
        problemType: type, // Store the user's selection ('random' or specific)
        actualProblemType: actualProblemTypeForAI, // Store the actual type generated for DB
        difficulty: difficulty,
        problem: result,
      });
      toast({ title: "Problem Generated!", description: `A new ${actualProblemTypeForAI} problem on "${topic}" (${difficulty}) is ready.` });
    } catch (error) {
      console.error("Error generating problem:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate problem. Please try again." });
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleEvaluateAnswer = async (answer: string, timeTakenSeconds?: number) => {
    if (!currentProblem || !currentTopic || (currentUser && isLoadingProfile)) return;

    setIsLoadingEvaluation(true);
    setEvaluationResult(null);

    try {
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
      const updatesForHistory: Partial<InteractionHistoryItem> = { timeTakenSeconds };

      const isMcqStyleProblem = currentProblem.multipleChoiceOptions && currentProblem.multipleChoiceOptions.length > 0;

      if (!isMcqStyleProblem) { 
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
    if ((currentUser && isLoadingProfile) || checkUsageLimit()) return;

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
    if (!currentProblem || (currentUser && isLoadingProfile)) {
      toast({variant: "destructive", title: "Cannot Submit Feedback", description: "No active problem or profile still loading."});
      return;
    };

    await updateLastHistoryItem({ 
      feedbackRating: rating,
      feedbackComment: comment,
    });
  };

  const handleNewProblemSameTopic = () => {
    if (currentTopic) {
      // If currentProblemType was 'random', we should ideally pick another random type or let user pick again.
      // For simplicity, let's re-use the last resolved type if it's specific, or default to 'random' if not.
      const typeToRegenerate = ACTUAL_PROBLEM_TYPES.includes(currentProblemType as any) ? currentProblemType : 'random';
      handleGenerateProblem(currentTopic, typeToRegenerate, currentDifficulty);
    } else {
      toast({ title: "No Topic", description: "Please generate a problem first to use this option.", variant: "default" });
    }
  };

  const handleStartNew = () => {
    setCurrentTopic('');
    // setCurrentProblemType('theory'); // Default to theory or random for a completely new start
    // setCurrentDifficulty('medium');
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);
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
                interaction_count: 0, 
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
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
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
      const guestHistoryRaw = localStorage.getItem('aolbeamHistory_guest');
      if (guestHistoryRaw) {
        try {
          const parsedGuestHistory = JSON.parse(guestHistoryRaw);
          setHistory(parsedGuestHistory);
          if (parsedGuestHistory.length > 0) {
            const lastItem = parsedGuestHistory[0];
            setCurrentTopic(lastItem.topic);
            setCurrentProblemType(lastItem.problemType);
            setCurrentDifficulty(lastItem.difficulty || 'medium');
            setCurrentProblem(lastItem.problem);
            if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
            if (lastItem.isTopicRevised && lastItem.topicDetails) {
              setTopicDetails(lastItem.topicDetails);
            } else {
              setTopicDetails(null);
            }
          } else {
            handleStartNew(); 
          }
        } catch (e) { 
          console.error("Error parsing guest history on logout:", e); 
          handleStartNew(); 
        }
      } else {
        handleStartNew(); 
      }
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };


  useEffect(() => {
    if (!isLoadingProfile && !currentUser && history.length > 0 && !currentProblem && !isLoadingProblem) {
      const lastItem = history[0];
      setCurrentTopic(lastItem.topic);
      setCurrentProblemType(lastItem.problemType); // This could be 'random'
      setCurrentDifficulty(lastItem.difficulty || 'medium');
      setCurrentProblem(lastItem.problem);
      if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
      if (lastItem.isTopicRevised && lastItem.topicDetails) {
        setTopicDetails(lastItem.topicDetails);
      } else {
        setTopicDetails(null);
      }
    }
  }, [currentUser, history, isLoadingProblem, currentProblem, isLoadingProfile]);

  const interactionsLeft = currentUser && userProfile && !userProfile.is_subscribed
    ? Math.max(0, FREE_INTERACTION_LIMIT - userProfile.interaction_count)
    : (!currentUser ? Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount) : 'Unlimited');

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
            const isActuallyMandatory = !!(currentUser && userProfile && !userProfile.is_subscribed && (userProfile.interaction_count >= FREE_INTERACTION_LIMIT || !userProfile.is_subscribed));
            if (!isActuallyMandatory) {
                setShowPaywall(false);
            } else {
                 toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "default"});
            }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleSignInWithGoogle}
        isMandatory={showPaywall && !!(currentUser && userProfile && !userProfile.is_subscribed && (userProfile.interaction_count >= FREE_INTERACTION_LIMIT || !userProfile.is_subscribed)) }
      />

      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Brain className="h-7 w-7" /> AOLBEAM
            </Link>
            
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isLoadingProfile && currentUser && <Button variant="outline" size="icon" disabled><PageLoader className="h-4 w-4 animate-spin" /></Button>}
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
                      <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <Settings className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    {currentUser.email === ADMIN_EMAIL && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/blog">
                          <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
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
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
          </div>
          {mobileNavOpen && (
            <div className="md:hidden border-t py-2">
              <nav className="flex flex-col space-y-1">
                 <Button variant="ghost" asChild className="justify-start">
                    <Link href="/profile" className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full" onClick={()=>setMobileNavOpen(false)}>
                       <Settings className="mr-3 h-5 w-5" /> Profile
                    </Link>
                  </Button>
                 {currentUser?.email === ADMIN_EMAIL && (
                    <Button variant="ghost" asChild className="justify-start">
                        <Link href="/admin/blog" className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full" onClick={()=>setMobileNavOpen(false)}>
                        <ShieldCheck className="mr-3 h-5 w-5" /> Admin
                        </Link>
                    </Button>
                 )}
                {/* Add other primary nav links here if needed for mobile */}
              </nav>
            </div>
          )}
        </div>
      </header>
      
      <section className="py-16 md:py-24 text-center bg-gradient-to-br from-primary/80 via-primary/50 to-amber-300/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary-foreground brightness-125">
              AOLBEAM: Access of Learning
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/90 leading-relaxed">
             Beam into the world of knowledge! Master complex subjects with AI-driven practice problems and targeted topic revision. 
              Build pattern recognition, <span className="font-semibold text-primary">prepare like a topper</span>, and achieve exam success.
            </p>
            <div className="mt-10">
              <Button size="lg" onClick={scrollToProblemGenerator} className="text-lg px-8 py-3 shadow-lg hover:shadow-primary/30 transition-shadow">
                Generate Your First Problem <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
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
              <div className="lg:col-span-3 flex flex-col gap-6">
                <ProblemGenerator
                  onGenerate={handleGenerateProblem}
                  isLoading={!!(isLoadingProblem || (currentUser && isLoadingProfile))}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                  defaultDifficulty={currentDifficulty}
                />
                {currentProblem && (
                <>
                <div className="flex gap-2 mt-0"> 
                    <Button onClick={handleNewProblemSameTopic} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (currentUser && isLoadingProfile))}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Another (Same Topic)
                    </Button>
                    <Button onClick={handleStartNew} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (currentUser && isLoadingProfile))}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                    </Button>
                </div>
                <ProblemDisplay
                    problem={currentProblem}
                    problemType={currentProblemType}
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (currentUser && isLoadingProfile))}
                    currentTopic={currentTopic}
                />
                </>
                )}
                {evaluationResult && <EvaluationResult evaluation={evaluationResult} />}
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                <TopicRevision
                  topic={currentProblem ? currentTopic : null} 
                  details={topicDetails}
                  onFetchDetails={handleFetchTopicDetails}
                  isLoading={!!(isLoadingDetails || (currentUser && isLoadingProfile))}
                />
                <HistoryView
                    history={currentUser && userProfile ? [] : history} 
                />
              </div>
            </div>
        )}
      </main>
      <Footer /> 
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
            {isLoadingProfile && currentUser ? "Loading interactions count..." :
                (currentUser && userProfile?.is_subscribed) ? "You have unlimited interactions!" :
                `Free interactions remaining: ${typeof interactionsLeft === 'number' ? interactionsLeft : 'N/A'}`
            }
        </p>
      </div>
    </div>
  );
}

    