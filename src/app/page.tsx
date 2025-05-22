
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
import { RefreshCcw, FilePlus2, UserCircle, LogOut, Brain, Loader2 as PageLoader, Menu, ArrowRight, ShieldCheck, Settings, Home, Newspaper, Mail, User as ProfileIcon, BarChart3, Zap, Info } from 'lucide-react';
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

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
const ALL_CONCRETE_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];

const ADMIN_EMAIL = "sinhakaran01235@gmail.com";

export default function AOLBEAMPage() {
  const { toast } = useToast();
  // Initialize Supabase client once and make it stable
  const [supabase] = useState<SupabaseClient>(() => {
    console.log('Initializing Supabase client...');
    return createClientComponentClient();
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); // Start true as we'll check session

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

  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    setIsLoadingProfile(true);
    setUserProfile(null); 

    if (!supabase) {
      console.error("Supabase client not available for profile fetch.");
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please try again.'
      });
      setIsLoadingProfile(false);
      return;
    }
    
    try {
      console.log(`Attempting to fetch profile from user_profiles table for user: ${user.id}`);
      let { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile fetch response - Data:', profileData, 'Error:', fetchError);

      if (profileData) {
        console.log('Existing profile loaded:', profileData);
        setUserProfile(profileData as UserProfile);
      } else if (fetchError && fetchError.code === 'PGRST116') { 
        console.log('No profile found (PGRST116), attempting to create as fallback (trigger should ideally handle this)...');
        
        const newProfilePayload: Omit<UserProfile, 'created_at' | 'updated_at'> = { 
          id: user.id,
          email: user.email!, 
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          interaction_count: 0,
          is_subscribed: false,
          // subscription_plan_id, subscription_started_at, subscription_ends_at will be null/undefined by default
        };

        const { data: insertedProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(newProfilePayload)
          .select()
          .single();
        
        if (insertedProfile) {
            console.log('New profile created successfully via direct insert:', insertedProfile);
            setUserProfile(insertedProfile as UserProfile);
        } else if (insertError && insertError.code === '23505') { 
            console.log('Profile insert failed due to unique violation (profile likely created by trigger). Re-fetching...');
            const { data: refetchedData, error: refetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (refetchedData) {
                console.log('Profile successfully re-fetched:', refetchedData);
                setUserProfile(refetchedData as UserProfile);
            } else {
                console.error('Error re-fetching profile after unique violation:', refetchError);
                toast({
                    variant: 'destructive',
                    title: 'Profile Sync Error',
                    description: `Could not sync your profile: ${refetchError?.message || 'Unknown error'}`
                });
            }
        } else { 
            console.error('Error creating user profile during fallback insert:', insertError);
            toast({
                variant: 'destructive',
                title: 'Profile Creation Failed',
                description: `Could not create your profile: ${insertError?.message || 'Unknown error'}`
            });
        }
      } else if (fetchError) { 
        console.error('Database error fetching profile:', fetchError);
        toast({ 
          variant: 'destructive', 
          title: 'Profile Error', 
          description: `Could not load your profile: ${fetchError.message}`
        });
      }
    } catch (error) { 
      console.error('Unexpected error during profile setup:', error);
      toast({
        variant: 'destructive',
        title: 'Profile Setup Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred.'
      });
    } finally {
      console.log('Finished profile processing. Setting isLoadingProfile to false.');
      setIsLoadingProfile(false);
    }
  }, [toast, supabase]); // Depends on stable supabase client and toast


  useEffect(() => {
    // This effect sets up the auth state listener and initial user check.
    // It depends on `supabase` (stable) and `fetchAndSetUserProfile` (stable callback).

    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, { user: session?.user?.email });
      const user = session?.user ?? null;
      setCurrentUser(user);
      
      if (user) {
        console.log('User authenticated, fetching profile...');
        await fetchAndSetUserProfile(user);
      } else {
        console.log('No user, resetting profile state');
        setUserProfile(null);
        setIsLoadingProfile(false); // Ensure loading is false if user signs out
      }
    };

    const checkUser = async () => {
      setIsLoadingProfile(true); // Set loading true before checking session
      try {
        console.log('Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // isLoadingProfile will be set to false in finally block of fetchAndSetUserProfile or here if no user
        }
        
        const user = session?.user ?? null;
        setCurrentUser(user); // Set current user based on session
        console.log('Initial session check - user:', user?.email);
        
        if (user) {
          await fetchAndSetUserProfile(user);
        } else {
          console.log('No active session found on initial check.');
          setIsLoadingProfile(false); // No user, so profile loading is done
        }
      } catch (error) {
        console.error('Error in checkUser:', error);
        setIsLoadingProfile(false); // Error, so profile loading is done
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    checkUser(); // Initial check for user session

    return () => {
      console.log('Cleaning up auth subscription');
      subscription?.unsubscribe();
      console.log('Cleaning up AOLBEAMPage component'); // For observing unmounts
    };
  }, [supabase, fetchAndSetUserProfile]); // Dependencies are stable

  const checkUsageLimit = useCallback((): boolean => {
    if (currentUser && userProfile) {
      if (userProfile.is_subscribed) return false; 
      if ((userProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT) {
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

  useEffect(() => {
    console.log('Profile state updated - isLoadingProfile:', isLoadingProfile, 'currentUser:', !!currentUser, 'userProfile email:', userProfile?.email);
  }, [isLoadingProfile, currentUser, userProfile]);


  const incrementInteraction = useCallback(async () => {
    if (currentUser && userProfile && !userProfile.is_subscribed) {
        const newCount = (userProfile.interaction_count || 0) + 1;
        
        // Optimistically update UI
        setUserProfile(prev => prev ? { ...prev, interaction_count: newCount } : null); 
        
        try {
            if (!supabase) throw new Error("Supabase client not ready for incrementInteraction");
            const { error } = await supabase
                .from('user_profiles')
                .update({ interaction_count: newCount })
                .eq('id', currentUser.id);
            if (error) {
                console.error("Error updating interaction count in Supabase:", error);
                toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count. Reverting UI." });
                // Revert optimistic update
                setUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null);
            }
        } catch (error: any) {
            console.error("Exception updating interaction count in Supabase:", error);
            toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count due to an exception. Reverting UI." });
            setUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null); 
        }
    } else if (!currentUser) { 
        setGuestInteractionCount(prev => prev + 1);
    }
  }, [currentUser, userProfile, supabase, setGuestInteractionCount, toast]);


  const addToHistory = useCallback(async (itemToAdd: Omit<InteractionHistoryItem, 'id' | 'timestamp' | 'supabase_id' | 'timeTakenSeconds' | 'feedbackRating' | 'feedbackComment'> & { actualProblemType: Exclude<ProblemType, 'random'> }) => {
    let newHistoryItem: InteractionHistoryItem = {
        ...itemToAdd,
        id: Date.now().toString(), 
        timestamp: new Date().toISOString(),
        isTopicRevised: false, 
        topicDetails: null, 
        userAnswer: itemToAdd.userAnswer,
        selectedOption: itemToAdd.selectedOption,
        evaluation: itemToAdd.evaluation,
        difficulty: itemToAdd.difficulty,
        problemType: itemToAdd.problemType, 
    };

    setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 50)); 

    if (supabase && currentUser && userProfile) { 
        const dbRecord: any = { 
            user_id: currentUser.id,
            topic: itemToAdd.topic,
            problem_type: itemToAdd.actualProblemType, 
            difficulty: itemToAdd.difficulty,
            problem_statement: itemToAdd.problem.problemStatement,
            answer_format: itemToAdd.problem.answerFormat,
            multiple_choice_options: itemToAdd.problem.multipleChoiceOptions,
            correct_answer: itemToAdd.problem.correctAnswer,
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
                .select('id') // Only select id
                .single();

            if (error) {
                throw error;
            }
            if (data) {
                // Update the local history item with the supabase_id
                setHistory(prevHistory => prevHistory.map(hItem => 
                    hItem.id === newHistoryItem.id ? { ...hItem, supabase_id: data.id } : hItem
                ));
            }
        } catch (error: any) {
            console.error("Error saving history to Supabase:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + error.message });
        }
    }
  }, [setHistory, supabase, currentUser, userProfile, toast]); 

  const updateLastHistoryItem = useCallback(async (updates: Partial<InteractionHistoryItem>) => {
    let itemToUpdateSupabaseId: string | undefined;
    
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const updatedItem: InteractionHistoryItem = {
        ...prevHistory[0],
        ...updates,
        problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
      };
      itemToUpdateSupabaseId = updatedItem.supabase_id; // Get supabase_id from the potentially updated item
      return [updatedItem, ...prevHistory.slice(1)];
    });

    if (supabase && currentUser && userProfile && itemToUpdateSupabaseId) { 
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
    } else if (supabase && currentUser && !itemToUpdateSupabaseId) {
        console.warn("Attempted to update history in Supabase, but supabase_id was missing for the last item.");
    }
  }, [setHistory, supabase, currentUser, userProfile, toast]); 


  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if ((currentUser && isLoadingProfile) || checkUsageLimit()) return;

    setIsLoadingProblem(true);
    setCurrentTopic(topic);
    setCurrentDifficulty(difficulty);
    setCurrentProblem(null);
    setEvaluationResult(null);
    setTopicDetails(null);

    let actualProblemTypeForAI: Exclude<ProblemType, 'random'>;
    if (type === 'random') {
        actualProblemTypeForAI = ALL_CONCRETE_PROBLEM_TYPES[Math.floor(Math.random() * ALL_CONCRETE_PROBLEM_TYPES.length)];
    } else {
        actualProblemTypeForAI = type as Exclude<ProblemType, 'random'>;
    }
    setCurrentProblemType(actualProblemTypeForAI); 

    try {
      await incrementInteraction();
      const result = await generatePracticeProblem({ topic, problemType: actualProblemTypeForAI, difficulty });
      setCurrentProblem(result);
      await addToHistory({ 
        topic,
        problemType: type, 
        actualProblemType: actualProblemTypeForAI, 
        difficulty: result.difficulty || difficulty, // Use difficulty from AI result if available
        problem: result,
      });
      toast({ title: "Problem Generated!", description: `A new ${actualProblemTypeForAI} problem on "${topic}" (${result.difficulty || difficulty}) is ready.` });
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
      const typeToRegenerate = currentProblem ? currentProblemType : (ALL_CONCRETE_PROBLEM_TYPES.includes(currentProblemType as Exclude<ProblemType, 'random'>) ? currentProblemType : 'random');
      handleGenerateProblem(currentTopic, typeToRegenerate, currentDifficulty);
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

  const handleSubscribe = async (planId: string) => {
    if (!supabase || !currentUser || !userProfile) { 
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
      if (history.length > 0) {
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


  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const interactionsLeftText = () => {
    if (isLoadingProfile && currentUser) return "Loading interactions...";
    if (currentUser && userProfile) {
        return userProfile.is_subscribed ? "You have unlimited interactions!" : `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - (userProfile.interaction_count || 0))}`;
    }
    if (!currentUser) {
        return `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount)}`;
    }
    return "Interactions: N/A (Error loading profile)"; 
  };


  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
            const isMandatoryPaywall = !!(currentUser && userProfile && !userProfile.is_subscribed && ((userProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT ));
            if (!isMandatoryPaywall) {
                setShowPaywall(false);
            } else {
                 toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "default"});
            }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleSignInWithGoogle}
        isMandatory={showPaywall && !!(currentUser && userProfile && !userProfile.is_subscribed && ((userProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT)) }
      />

      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Brain className="h-7 w-7" /> AOLBEAM
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
                {/* Desktop Nav Links Removed */}
            </nav>
            
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
                        <ProfileIcon className="mr-2 h-4 w-4" /> Profile
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
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSignInWithGoogle} 
                        disabled={!supabase || isLoadingProfile}
                        className="min-w-[120px]"
                      >
                        {isLoadingProfile ? (
                          <>
                            <PageLoader className="mr-2 h-4 w-4 animate-spin" />
                            Please wait...
                          </>
                        ) : (
                          <>
                            <UserCircle className="mr-2 h-4 w-4" />
                            Login / Sign Up
                          </>
                        )}
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
                 {currentUser?.email === ADMIN_EMAIL && (
                    <Button variant="ghost" asChild className="justify-start" onClick={()=>setMobileNavOpen(false)}>
                        <Link href="/admin/blog" className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full">
                        <ShieldCheck className="mr-3 h-5 w-5" /> Admin
                        </Link>
                    </Button>
                 )}
                  <DropdownMenuSeparator />
                  {!currentUser && (
                    <Button 
                        variant="default" 
                        onClick={() => { handleSignInWithGoogle(); setMobileNavOpen(false);}} 
                        disabled={!supabase || isLoadingProfile}
                        className="w-full text-base py-3 mt-2"
                      >
                        {isLoadingProfile ? (
                          <>
                            <PageLoader className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <UserCircle className="mr-2 h-5 w-5" />
                            Login / Sign Up
                          </>
                        )}
                      </Button>
                  )}
                  {currentUser && (
                     <Button 
                        variant="outline" 
                        onClick={() => { handleSignOut(); setMobileNavOpen(false);}}
                        className="w-full text-base py-3 mt-2"
                      >
                        <LogOut className="mr-2 h-5 w-5" /> Sign Out
                      </Button>
                  )}
              </nav>
            </div>
          )}
        </div>
      </header>
      
      <section className="py-16 md:py-24 text-center bg-background"> {/* Removed hero gradient */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary-foreground brightness-125">
             <span className="text-primary">Access of Learning</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/90 leading-relaxed">
            <span className="text-primary">Beam</span> into the world of knowledge! Master complex subjects with AI-driven practice problems and targeted topic revision. 
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="space-y-6 max-w-md mx-auto">
              <div className="relative">
                <PageLoader className="h-16 w-16 text-primary mx-auto animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 animate-ping"></div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to AOLBEAM</h2>
                <p className="text-muted-foreground">We're setting up your learning environment</p>
                <div className="pt-4">
                  <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary/70 animate-pulse"></span>
                    <span>Loading your profile...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!isLoadingProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <ProblemGenerator
                  onGenerate={handleGenerateProblem}
                  isLoading={isLoadingProblem || (!!currentUser && isLoadingProfile)}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                  defaultDifficulty={currentDifficulty}
                />
                {currentProblem && (
                <>
                <div className="flex gap-2 mt-0"> 
                    <Button onClick={handleNewProblemSameTopic} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (!!currentUser && isLoadingProfile))}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Another (Same Topic)
                    </Button>
                    <Button onClick={handleStartNew} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (!!currentUser && isLoadingProfile))}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                    </Button>
                </div>
                <ProblemDisplay
                    problem={currentProblem}
                    problemType={currentProblemType}
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (!!currentUser && isLoadingProfile))}
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
                  isLoading={!!(isLoadingDetails || (!!currentUser && isLoadingProfile))}
                />
                <HistoryView
                    history={history} 
                />
              </div>
            </div>
        )}
      </main>
      <Footer /> 
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
            {interactionsLeftText()}
        </p>
      </div>
    </div>
  );
}
