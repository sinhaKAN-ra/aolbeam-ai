
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { RefreshCcw, FilePlus2, UserCircle, LogOut, Brain, Loader2 as PageLoader, Menu, ArrowRight, Home, Newspaper, Mail, Shield } from 'lucide-react'; // Shield for Admin
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


const FREE_INTERACTION_LIMIT = 5;

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
           toast({ variant: "default", title: "Setting up your account...", description: "Please wait a moment." });
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
                 if (!refetchData.is_subscribed && refetchData.interaction_count >= FREE_INTERACTION_LIMIT) {
                   // Paywall will be triggered by checkUsageLimit if limit is reached
                 }
              }
            }, 2000); 
         } else {
          toast({ variant: "destructive", title: "Profile Error", description: "Could not load your profile. If this persists, please contact support." });
          setUserProfile(null);
         }
      } else if (data) {
        setUserProfile(data as UserProfile);
         if (!data.is_subscribed && data.interaction_count >= FREE_INTERACTION_LIMIT) {
            // Paywall will be triggered by checkUsageLimit if limit is reached
         }
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
        if (event === "SIGNED_IN" && userProfile && !userProfile.is_subscribed && userProfile.interaction_count === 0) {
            // Fresh sign in, profile exists but not subscribed and 0 interactions -> means new user from trigger.
            // Or if profile had >0 interactions but they just subscribed, it would be reset.
            // The key is !userProfile.is_subscribed to show paywall.
            // And interaction_count should be checked by checkUsageLimit.
            // If we want to force paywall for *brand new* users post-login, this is a place.
            // For now, let's ensure the checkUsageLimit handles it after profile load.
        }
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
  }, [supabase, fetchAndSetUserProfile, setHistory, userProfile]); // Added userProfile to dependency array for SIGNED_IN logic


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
            setUserProfile(prev => prev ? { ...prev, interaction_count: newCount -1 } : null); // Revert on error
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
        isTopicRevised: false, 
        topicDetails: null, 
        userAnswer: item.userAnswer,
        selectedOption: item.selectedOption,
        evaluation: item.evaluation,
        difficulty: item.difficulty, // Add difficulty
    };

    if (supabase && currentUser) {
        const dbRecord = {
            user_id: currentUser.id,
            topic: item.topic,
            problem_type: item.problemType,
            difficulty: item.difficulty, // Add difficulty
            problem_statement: item.problem.problemStatement,
            answer_format: item.problem.answerFormat,
            multiple_choice_options: item.problem.multipleChoiceOptions,
            correct_answer: item.problem.correctAnswer,
            user_answer: null, // Will be updated later
            selected_option: null, // Will be updated later
            evaluation_is_correct: null, // Will be updated later
            evaluation_feedback: null, // Will be updated later
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
      let itemToUpdateId: string | undefined;
      // Fetch the most recent interaction ID for this user
      const { data: latestInteraction, error: fetchError } = await supabase
          .from('user_interactions')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is okay if it's the first interaction
          console.error("Error fetching last history item ID from Supabase for update:", fetchError);
          // Potentially show a toast here or handle, but don't stop local updates
      }
      itemToUpdateId = latestInteraction?.id;

      if (itemToUpdateId) {
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
        // Note: difficulty and problem type are set at creation, not typically updated.
        
        if (Object.keys(dbUpdatePayload).length > 0) {
          try {
            const { error } = await supabase
              .from('user_interactions')
              .update(dbUpdatePayload)
              .eq('id', itemToUpdateId)
              .eq('user_id', currentUser.id); // Crucial: ensure user can only update their own
            if (error) {
              throw error;
            }
          } catch (error: any) {
            console.error("Error updating history in Supabase:", error);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + error.message });
          }
        }
      } else if (!currentUser) { 
          // This block handles guest user updates (localStorage)
          setHistory(prevHistory => {
            if (prevHistory.length === 0) return prevHistory;
            const updatedItem: InteractionHistoryItem = {
              ...prevHistory[0],
              ...updates,
              // Ensure nested objects are merged correctly if they exist in updates
              problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
            };
            return [updatedItem, ...prevHistory.slice(1)];
          });
      } else {
        // This case means a logged-in user, but we couldn't find a supabase_id for the last local item.
        // This might happen if addToHistory failed to get a supabase_id.
        // For now, we'll log a warning. A more robust solution might try to re-insert or handle this.
        console.warn("Could not determine which history item to update in Supabase for logged-in user.");
      }
    } else if (!currentUser) { // Explicitly handle guest users again for clarity
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
  }, [setHistory, supabase, currentUser, toast]); // Removed local `history` from deps as we fetch Supabase ID


  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if (isLoadingProfile || checkUsageLimit()) return;

    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    setCurrentProblemType(type);
    setCurrentDifficulty(difficulty);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);

    try {
      await incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: type, difficulty });
      setCurrentProblem(result);
      await addToHistory({ 
        topic,
        problemType: type,
        difficulty: difficulty, // Add difficulty
        problem: result,
      });
      toast({ title: "Problem Generated!", description: `A new ${type} problem on "${topic}" (${difficulty}) is ready.` });
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

      if (currentProblemType === 'theory') {
        // Fetch details only if not already fetched for this problem context
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific topic details available for this evaluation.";

        evalOutput = await evaluateTheoryAnswer({
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          answerFormat: currentProblem.answerFormat, // Guidelines for AI evaluation
          topicDetails: fetchedDetailsForEval,
        });
        updatesForHistory.userAnswer = answer;
      } else { // Practical (MCQ)
        const isCorrect = answer === currentProblem.correctAnswer;
        evalOutput = {
          isCorrect,
          feedback: isCorrect
            ? `Correct! ${currentProblem.answerFormat}` // answerFormat here is the explanation
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
      setTopicDetails("Failed to load details. Please try again."); // Provide fallback UI feedback
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
    // Toast for feedback submission is handled within ProblemDisplay
  };

  const handleNewProblemSameTopic = () => {
    if (currentTopic) {
      handleGenerateProblem(currentTopic, currentProblemType, currentDifficulty);
    } else {
      toast({ title: "No Topic", description: "Please generate a problem first to use this option.", variant: "default" });
    }
  };

  const handleStartNew = () => {
    setCurrentTopic('');
    // setCurrentProblemType('theory'); // Or keep last used?
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
                interaction_count: 0, // Reset interaction count upon subscription
                subscription_started_at: new Date().toISOString()
            })
            .eq('id', currentUser.id)
            .select() // Fetch the updated profile
            .single();

        if (error) throw error;

        if (data) {
            setUserProfile(data as UserProfile); // Update local profile state
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
      setShowPaywall(false); // Reset paywall state on logout
      // Load guest history if available
      const guestHistoryRaw = localStorage.getItem('aolbeamHistory_guest');
      if (guestHistoryRaw) {
        try {
          const parsedGuestHistory = JSON.parse(guestHistoryRaw);
          setHistory(parsedGuestHistory);
          // Optionally restore last guest session state
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
            handleStartNew(); // Clear fields if guest history is empty
          }
        } catch (e) { 
          console.error("Error parsing guest history on logout:", e); 
          handleStartNew(); // Clear fields on error
        }
      } else {
        handleStartNew(); // Clear fields if no guest history
      }
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };


  // Restore last guest session if no user is logged in and history exists
  useEffect(() => {
    if (!isLoadingProfile && !currentUser && history.length > 0 && !currentProblem && !isLoadingProblem) {
      const lastItem = history[0];
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
            // Only allow closing if it's not mandatory (i.e., user hit limit as guest, or logged in but not yet hit limit)
            const isActuallyMandatory = !!(currentUser && userProfile && !userProfile.is_subscribed && userProfile.interaction_count >= FREE_INTERACTION_LIMIT);
            if (!isActuallyMandatory) {
                setShowPaywall(false);
            } else {
                 toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "destructive"});
            }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleSignInWithGoogle}
        isMandatory={showPaywall && !!currentUser && !!userProfile && !userProfile.is_subscribed && (userProfile.interaction_count >= FREE_INTERACTION_LIMIT) }
      />

      {/* Simplified Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Brain className="h-7 w-7" /> AOLBEAM
            </Link>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Profile</Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
              <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Blog</Link>
              <Link href="/contact-us" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
              <Link href="/admin/blog" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Admin</Link>
            </nav>
            {/* Right side: Theme Toggle, User Menu / Login */}
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
              {/* Mobile Navigation Toggle */}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </div>
          </div>
          {/* Mobile Navigation Menu */}
          {mobileNavOpen && (
            <div className="md:hidden border-t py-2">
              <nav className="flex flex-col space-y-2">
                <Link href="/profile" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Profile</Link>
                <Link href="/pricing" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Pricing</Link>
                <Link href="/blog" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Blog</Link>
                <Link href="/contact-us" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Contact Us</Link>
                <Link href="/admin/blog" className="py-2 px-3 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent" onClick={()=>setMobileNavOpen(false)}>Admin</Link>
              </nav>
            </div>
          )}
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary-foreground brightness-125">
              AOLBEAM: <span className="text-primary">Access of Learning</span>
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
        {/* Loading state for profile for logged-in users */}
        {isLoadingProfile && currentUser && (
            <div className="flex justify-center items-center h-64">
                <PageLoader className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading your profile...</p>
            </div>
        )}
        {/* Show content if profile is loaded OR if user is a guest */}
        {(!isLoadingProfile || !currentUser) && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
              {/* Main Interaction Area */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                <ProblemGenerator
                  onGenerate={handleGenerateProblem}
                  isLoading={isLoadingProblem || (currentUser && isLoadingProfile)}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                  defaultDifficulty={currentDifficulty}
                />
                {currentProblem && (
                <>
                <div className="flex gap-2 mt-0"> {/* Adjusted margin */}
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

              {/* Sidebar-like Area (Revision & History) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <TopicRevision
                  topic={currentProblem ? currentTopic : null} // Only pass topic if there's a problem
                  details={topicDetails}
                  onFetchDetails={handleFetchTopicDetails}
                  isLoading={isLoadingDetails || (currentUser && isLoadingProfile)}
                />
                <HistoryView
                    history={currentUser && userProfile ? [] : history} // For guests, show local history. For logged-in, history is on profile page.
                />
              </div>
            </div>
        )}
      </main>
      <Footer /> {/* Replaced inline footer with component */}
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
