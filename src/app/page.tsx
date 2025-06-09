"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaywallModal, type PaywallModalProps } from '@/components/PaywallModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@supabase/supabase-js';
import {
  generatePracticeProblem,
  type GeneratePracticeProblemOutput,
  type GeneratePracticeProblemInput,
} from '@/ai/flows/generate-practice-problem';
import {
  evaluateTheoryAnswer,
  type EvaluateTheoryAnswerOutput,
  type EvaluateTheoryAnswerInput,
} from '@/ai/flows/evaluate-theory-answer';
import {
  generateProblemInsights,
  type GenerateProblemInsightsInput,
  type GenerateProblemInsightsOutput,
} from '@/ai/flows/generate-problem-insights';
import { RefreshCw, FilePlus2, ArrowRight, Loader2, History } from 'lucide-react';

import type { InteractionHistoryItem, ProblemType, UserProfile, DifficultyLevel } from '@/types';
import { ProblemGenerator, ProblemGeneratorHandles } from '@/components/ProblemGenerator';
import { ProblemDisplay, ProblemDisplayRefs } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { ProblemInsights } from '@/components/ProblemInsights';

import Link from 'next/link';
import { HeroSection } from '@/components/home/HeroSection';
import { GenerateSection } from '@/components/home/GenerateSection';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import MainLayoutContainer from '@/components/MainLayoutContainer';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSupabase } from '@/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { useInteractionLimit } from '@/hooks/useInteractionLimit';
import { InteractionType, InteractionLimitResult } from '@/types/interaction';

// This is a client component that will be hydrated on the client
// Server-side data fetching should be moved to a Server Component
// and passed as props to this component

const FREE_INTERACTION_LIMIT = 10;
const ALL_CONCRETE_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];

export default function AOLBEAMPage() {

  const isAIServiceOverloadError = (errorMessage: string): boolean => {
    const lowerMessage = errorMessage.toLowerCase();
    return (
      lowerMessage.includes('503') ||
      lowerMessage.includes('service unavailable') ||
      lowerMessage.includes('model is overloaded') ||
      lowerMessage.includes('[googlegenerativeaierror]') // Specific to Google errors
    );
  };

  const { toast } = useToast();
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingPageProfile, setIsLoadingPageProfile] = useState<boolean>(true);
  const hasFetchedProfile = useRef(false);

  // Problem generation state
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [currentProblemType, setCurrentProblemType] = useState<ProblemType>('theory');
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('medium');
  const [currentProblem, setCurrentProblem] = useState<GeneratePracticeProblemOutput | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateTheoryAnswerOutput | null>(null);
  const [problemInsights, setProblemInsights] = useState<string | null>(null);

  // Loading states
  const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);

  const problemDisplayRef = useRef<ProblemDisplayRefs>(null);
  const evaluationResultRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    // Cleanup function to remove highlight when component unmounts or state changes
    return () => {
      if (evaluationResultRef.current) {
        evaluationResultRef.current.classList.remove('highlight-border');
      }
    };
  }, [currentProblem, evaluationResult]);

  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [guestInteractionCount, setGuestInteractionCount] = useLocalStorage<number>('aolbeamGuestInteractionCount', 0);
  const { checkInteractionLimit, recordInteraction, requireInteraction } = useInteractionLimit(
    currentUser,
    guestInteractionCount,
    setGuestInteractionCount,
    FREE_INTERACTION_LIMIT,
    isAuthLoading
  );
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<PaywallModalProps['displayContext']>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  // Refs
  const problemGeneratorRef = useRef<HTMLDivElement>(null);
  const problemGeneratorComponentRef = useRef<ProblemGeneratorHandles>(null);
  const paywallModalRef = useRef<PaywallModalProps | null>(null);


  // Initialize client-side state and fetch initial data
  useEffect(() => {
    setIsClientMounted(true);
    
    // Load history from localStorage if available
    const savedHistory = localStorage.getItem('aolbeamHistory_guest');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error parsing history from localStorage", e);
        setHistory([]);
      }
    }
    
    // Initial profile fetch handled by the useEffect below that watches isAuthLoading
    // No need to call fetchAndSetUserProfile here based on initial currentUser state
    
    return () => {
      // Cleanup if needed
    };
  }, []); // Empty dependency array to run only once on mount
  
  // Save history to localStorage when it changes
  const saveHistoryToLocalStorage = useCallback((newHistory: InteractionHistoryItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aolbeamHistory_guest', JSON.stringify(newHistory));
    }
  }, []);
  
  // Scroll to problem generator helper
  const scrollToProblemGenerator = useCallback(() => {
    problemGeneratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // After scrolling, wait a bit for the scroll to finish, then focus the input
    setTimeout(() => {
      problemGeneratorComponentRef.current?.focusTopicInput();
    }, 500); // Adjust timeout as needed
  }, []);
  

  
  const fetchAndSetUserProfile = useCallback(
    async (user: User | null) => {
      if (!user?.id) {
        // console.log('Page: No user ID available');
        setUserProfile(null);
        setIsLoadingPageProfile(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetchedProfile.current) return;
      hasFetchedProfile.current = true;

      // console.log(`Page: fetchAndSetUserProfile called for user: ${user.id}`);
      setIsLoadingPageProfile(true);
      setUserProfile(null);

      const fetchUserProfile = async (user: User) => {
        try {
          // console.log(`Page: Attempting to query user_profiles for user ${user.id}...`);
          
          // Use the client-side Supabase client for client-side operations
          const { data: profileData, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (fetchError) {
            if (fetchError.code === 'PGRST116') { 
              // console.log(`Page: Profile not found for ${user.id}, attempting to create one.`);
              const newProfilePayload: Partial<UserProfile> = {
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                interaction_count: 0,
                is_subscribed: false,
              };
              
              const { data: createdProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert([newProfilePayload])
                .select()
                .single();

              if (createError) {
                console.error(`Page: Error creating profile:`, createError);
                toast({ 
                  variant: "destructive", 
                  title: "Profile Error", 
                  description: "Failed to create user profile." 
                });
                return;
              }
              
              // console.log(`Page: Created new profile for ${user.id}`);
              setUserProfile(createdProfile as UserProfile);
              return;
            }
            
            // If it's another type of error, throw it
            throw fetchError;
          }

          if (profileData) {
            // console.log(`Page: Found existing profile for ${user.id}`);
            
            // Check if we need to update any profile fields
            const updates: Partial<UserProfile> = {};
            let needsUpdate = false;
            
            if (!profileData.email && user.email) {
              updates.email = user.email;
              needsUpdate = true;
            }
            
            if (!profileData.full_name && (user.user_metadata?.full_name || user.email)) {
              updates.full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
              needsUpdate = true;
            }

            if (needsUpdate) {
              // console.log(`Page: Profile for ${user.id} missing fields, attempting update:`, updates);
              const { data: updatedProfileData, error: updateError } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

              if (updateError) {
                console.error(`Page: Error updating profile for ${user.id}:`, updateError);
                // Continue with the existing profile data even if update fails
                setUserProfile(profileData as UserProfile);
              } else if (updatedProfileData) {
                // console.log(`Page: Successfully updated profile for ${user.id}:`, updatedProfileData);
                setUserProfile(updatedProfileData as UserProfile);
              }
            } else {
              // console.log(`Page: Using existing profile for ${user.id}`);
              setUserProfile(profileData as UserProfile);
            }
          } else {
            console.warn(`Page: No profile data received for ${user.id} and no error was thrown.`);
            setUserProfile(null);
          }
        } catch (error) {
          console.error(`Page: Error in fetchUserProfile for ${user.id}:`, error);
          toast({
            variant: "destructive",
            title: "Profile Error",
            description: error instanceof Error ? error.message : "An error occurred while loading your profile.",
          });
        } finally {
          // console.log(`Page: Finished loading profile for ${user.id}`);
          setIsLoadingPageProfile(false);
        }
      };

      fetchUserProfile(user);
    },
    [supabase, toast]
  );

  // Effect to handle auth state changes and fetch profile
  useEffect(() => {
    if (!isAuthLoading) {
      if (currentUser) {
        // Reset the fetch flag when user changes
        hasFetchedProfile.current = false;
        fetchAndSetUserProfile(currentUser);
      } else {
        // If auth loading is done and there's no current user, profile loading is also done
        setUserProfile(null);
        setIsLoadingPageProfile(false);
        hasFetchedProfile.current = false;
      }
    } else {
      // Still loading auth, so profile loading is also ongoing
      setIsLoadingPageProfile(true);
    }
  }, [currentUser, isAuthLoading, fetchAndSetUserProfile]);

  useEffect(() => {
    // console.log(
      // `Page: Profile state updated - isLoadingProfile: ${isLoadingPageProfile} pageCurrentUser: ${!!currentUser} pageUserProfile email: ${userProfile?.email || 'undefined'}`
    // );
  }, [isLoadingPageProfile, currentUser, userProfile]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // console.log("Page: Cleaning up AOLBEAMPage component");
      hasFetchedProfile.current = false;
    };
  }, []);

  const addToHistory = useCallback(async (itemToAdd: Omit<InteractionHistoryItem, 'id' | 'timestamp' | 'supabase_id' | 'timeTakenSeconds' | 'feedbackRating' | 'feedbackComment'> & { actualProblemType: Exclude<ProblemType, 'random'> }) => {
    const newHistoryItem: InteractionHistoryItem = {
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

    setHistory(prevHistory => {
      const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50);
      saveHistoryToLocalStorage(updatedHistory);
      return updatedHistory;
    });

    if (currentUser && itemToAdd.problem && itemToAdd.problem.problemStatement) {
        const dbRecord: any = { 
            user_id: currentUser.id,
            topic: itemToAdd.topic,
            problem_type: itemToAdd.actualProblemType, 
            difficulty: itemToAdd.difficulty, 
            problem_statement: itemToAdd.problem.problemStatement,
            answer_format: itemToAdd.problem.answerFormat,
            multiple_choice_options: itemToAdd.problem.multipleChoiceOptions,
            correct_answer: itemToAdd.problem.correctAnswer,
            is_topic_revised: false,
            topic_details_content: null 
        };
        try {
          // console.log("Page: Attempting to save new problem to Supabase:", dbRecord);
          const { data: dbData, error: dbError } = await supabase.from('user_interactions').insert(dbRecord).select('id').single();
          if (dbError) {
              console.error("Page: Error saving history to Supabase:", dbError);
              toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + dbError.message });
          } else if (dbData) {
            // console.log("Page: Successfully saved new problem to Supabase, ID:", dbData.id);
            setHistory(prev => {
                const updatedHistory = prev.map(hItem => 
                    hItem.id === newHistoryItem.id ? { ...hItem, supabase_id: dbData.id } : hItem
                );
                saveHistoryToLocalStorage(updatedHistory);
                return updatedHistory;
            });
          }
        } catch (e) {
            console.error("Page: Exception saving history to Supabase:", e);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account." });
        }
    }
  }, [setHistory, supabase, currentUser, toast, saveHistoryToLocalStorage]); 

  const updateLastHistoryItem = useCallback(async (updates: any) => {
    let itemToUpdateSupabaseId: string | undefined;
    let updatedItemForSupabase: InteractionHistoryItem | undefined;
    
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const updatedItem: InteractionHistoryItem = {
        ...prevHistory[0],
        ...updates,
        problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
      };
      itemToUpdateSupabaseId = updatedItem.supabase_id;
      updatedItemForSupabase = updatedItem; 
      const newHistory = [updatedItem, ...prevHistory.slice(1)];
      saveHistoryToLocalStorage(newHistory);
      return newHistory;
    });
    
    if (supabase && currentUser && itemToUpdateSupabaseId && updatedItemForSupabase) { 
      const dbUpdatePayload: any = {};
      if (updates.userAnswer !== undefined) dbUpdatePayload.user_answer = updates.userAnswer;
      if (updates.selectedOption !== undefined) dbUpdatePayload.selected_option = updates.selectedOption;
      if (updates.evaluation !== undefined) {
        dbUpdatePayload.evaluation_is_correct = updates.evaluation.isCorrect;
        dbUpdatePayload.evaluation_feedback = updates.evaluation.feedback;
        if ('correctAnswer' in updates.evaluation && updates.evaluation.correctAnswer !== undefined) {
            dbUpdatePayload.evaluation_correct_answer_detail = updates.evaluation.correctAnswer;
        }
        if ('explanation' in updates.evaluation && updates.evaluation.explanation !== undefined) {
            dbUpdatePayload.evaluation_explanation_detail = updates.evaluation.explanation;
        }
      }
      if (updates.isTopicRevised !== undefined) dbUpdatePayload.is_topic_revised = updates.isTopicRevised; 
      if (updates.topicDetails !== undefined) dbUpdatePayload.topic_details_content = updates.topicDetails; 
      if (updates.feedbackRating !== undefined) dbUpdatePayload.feedback_rating = updates.feedbackRating;
      if (updates.feedbackComment !== undefined) dbUpdatePayload.feedback_comment = updates.feedbackComment;
      if (updates.timeTakenSeconds !== undefined) dbUpdatePayload.time_taken_seconds = updates.timeTakenSeconds;
      
      if (Object.keys(dbUpdatePayload).length > 0) {
        // console.log("Page: Attempting to update Supabase history item ID:", itemToUpdateSupabaseId, "with payload:", dbUpdatePayload);
        try {
          const { error: dbError } = await supabase.from('user_interactions').update(dbUpdatePayload).eq('id', itemToUpdateSupabaseId).eq('user_id', currentUser.id);
          if (dbError) {
            console.error("Page: Error updating history in Supabase:", dbError);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + dbError.message });
          } else {
            // console.log("Page: Successfully updated history item in Supabase, ID:", itemToUpdateSupabaseId);
          }
        } catch (e) {
            console.error("Page: Exception updating history in Supabase:", e);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account." });
        }
      }
    } else if (supabase && currentUser && !itemToUpdateSupabaseId && history.length > 0 && history[0] && Object.keys(updates).length > 0) {
      // This condition seems to be the end of the updateLastHistoryItem's else-if chain.
      // The following content was part of the corruption and will be replaced by the correct functions.
      console.warn("Page: Attempted to update history item in Supabase, but supabase_id was missing for the last item. Local history updated.", history[0]);
    }
  }, [setHistory, supabase, currentUser, toast, history, saveHistoryToLocalStorage]);

const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
  if (currentUser && isLoadingPageProfile) return; // Still loading user profile

  const interactionResult = await requireInteraction('problem_generation');

  // If the action is NOT allowed from the start (e.g., already over limit, or auth still loading)
  if (!interactionResult.allowed) {
    if (interactionResult.isLoading) {
      toast({
        title: "Loading",
        description: "Please wait while we verify your authentication status.",
      });
    } else if (interactionResult.showLoginModal) {
      setPaywallContext('guestLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign up or log in to continue."
      });
    } else if (interactionResult.showUpgradeModal) {
      setPaywallContext('loggedInLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Upgrade Required",
        description: "Please upgrade to continue generating problems."
      });
    }
    return; // Do not proceed with the AI action
  }

  // If the action IS allowed, proceed with problem generation
  setIsLoadingProblem(true);
  setCurrentTopic(topic);
  setCurrentDifficulty(difficulty);
  setCurrentProblem(null);
  setEvaluationResult(null);
  setProblemInsights(null);

  let actualProblemTypeForAI: Exclude<ProblemType, 'random'>;
  if (type === 'random') {
      actualProblemTypeForAI = ALL_CONCRETE_PROBLEM_TYPES[Math.floor(Math.random() * ALL_CONCRETE_PROBLEM_TYPES.length)];
  } else {
      actualProblemTypeForAI = type as Exclude<ProblemType, 'random'>;
  }
  setCurrentProblemType(actualProblemTypeForAI);

  let problemGeneratedSuccessfully = false;
  try {
    const result = await generatePracticeProblem({ topic, problemType: actualProblemTypeForAI, difficulty });
    const problemDifficulty = result.difficulty || difficulty;
    const problemWithDifficulty = {...result, difficulty: problemDifficulty};
    setCurrentProblem(problemWithDifficulty);
    console.log('Page: Attempting to highlight and scroll with direct refs');
    if (problemDisplayRef.current?.timerRef.current) {
      // Add highlight border class
      problemDisplayRef.current.timerRef.current.classList.add('highlight-border');
      // Scroll to timer
      problemDisplayRef.current.timerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Set a timer to scroll to the answer input after 2 seconds
      setTimeout(() => {
        if (problemDisplayRef.current?.answerInputRef.current) {
          problemDisplayRef.current.answerInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 2000); // 2 second delay before scrolling to answer section
    }
    await addToHistory({
      topic,
      problemType: type,
      actualProblemType: actualProblemTypeForAI,
      difficulty: problemDifficulty,
      problem: problemWithDifficulty,
    });
    toast({ title: "Problem Generated!", description: `A new ${actualProblemTypeForAI} problem on "${topic}" (${problemDifficulty}) is ready.` });
    problemGeneratedSuccessfully = true;
  } catch (error: any) {
    console.error("Page: Error generating problem:", error);
    if (error.message && isAIServiceOverloadError(error.message)) {
      toast({
        variant: "destructive",
        title: "AI Service Busy",
        description: "The AI model is currently experiencing high demand. Please try again in a few moments.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error Generating Problem",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
    problemGeneratedSuccessfully = false;
  } finally {
    setIsLoadingProblem(false);
    // No refreshInteractionStatus here, it's handled by requireInteraction and the logic below for paywall
  }

  // After the AI action has been attempted, if it was successful,
  // check the interactionResult again to see if *this action* resulted in hitting the limit.
  if (problemGeneratedSuccessfully) {
    if (interactionResult.showLoginModal) { // Guest user hit limit with this action
      setPaywallContext('guestLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Free Limit Reached",
        description: "Please sign up or log in to continue generating problems."
      });
    } else if (interactionResult.showUpgradeModal) { // Logged-in user hit limit with this action
      setPaywallContext('loggedInLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Interaction Limit Reached",
        description: "Your current plan's interaction limit has been reached. Please upgrade to continue."
      });
    }
  }
  await refreshInteractionStatus();
};

const handleEvaluateAnswer = async (answer: string, timeTakenSeconds?: number) => {
  if (!currentProblem || !currentTopic || (currentUser && isLoadingPageProfile)) return;

  const interactionResult = await requireInteraction('evaluate');

  if (!interactionResult.allowed) {
    if (interactionResult.isLoading) {
      toast({
        title: "Loading",
        description: "Please wait while we verify your authentication status.",
      });
    } else if (interactionResult.showLoginModal) {
      setPaywallContext('guestLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please sign up or log in to continue evaluating answers."
      });
    } else if (interactionResult.showUpgradeModal) {
      setPaywallContext('loggedInLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Upgrade Required",
        description: "Please upgrade to continue evaluating answers."
      });
    }
    return;
  }

  setIsLoadingEvaluation(true);
  setEvaluationResult(null);

  let evaluationSuccessful = false;
  try {
    let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string; correctAnswer: string };
    const updatesForHistory: Partial<InteractionHistoryItem> = { timeTakenSeconds };

    const isMcqStyleProblem = currentProblem.multipleChoiceOptions && currentProblem.multipleChoiceOptions.length > 0;

    if (!isMcqStyleProblem) {
      let insightsForEval: string;

      if (problemInsights) {
        insightsForEval = problemInsights;
      } else if (currentProblem?.problemStatement && currentTopic) {
        try {
          // console.log("Page: No existing insights for evaluation, attempting to generate on-the-fly using AI utility.");
          const insightGenResult: GenerateProblemInsightsOutput = await generateProblemInsights({
            problemStatement: currentProblem.problemStatement,
            topic: currentTopic
          });
          insightsForEval = JSON.stringify(insightGenResult, null, 2);
          // Optionally, consider if these on-the-fly insights should update the 'problemInsights' state:
          // setProblemInsights(insightsForEval);
        } catch (insightsError) {
          console.warn("Page: Failed to auto-generate insights for evaluation, proceeding with default.", insightsError);
          insightsForEval = "No detailed insights available for this problem at the moment.";
        }
      } else {
        insightsForEval = "No detailed insights available due to missing problem details or topic.";
      }

      const evalInput: EvaluateTheoryAnswerInput = {
        question: currentProblem.problemStatement,
        studentAnswer: answer,
        answerFormat: currentProblem.answerFormat,
        topicDetails: insightsForEval, // insightsForEval is now guaranteed to be a string
      };
      evalOutput = await evaluateTheoryAnswer(evalInput);

      if (!evalOutput.correctAnswer) {
        evalOutput.correctAnswer = currentProblem.correctAnswer;
      }
      updatesForHistory.userAnswer = answer;
    } else {
      const isCorrect = answer === currentProblem.correctAnswer;
      const stepByStepSolution = `## Step-by-Step Solution\n\n${currentProblem.answerFormat}\n\n### Correct Answer: ${currentProblem.correctAnswer}\n\n${currentProblem.correctAnswer ? `### Explanation:\n${currentProblem.answerFormat}` : ''}`;
      evalOutput = {
        isCorrect,
        feedback: isCorrect
          ? `Correct! ${currentProblem.answerFormat}`
          : `Incorrect. The correct option was: ${currentProblem.correctAnswer}`,
        correctAnswer: stepByStepSolution
      };
      updatesForHistory.selectedOption = answer;
    }
    updatesForHistory.evaluation = evalOutput;
    await updateLastHistoryItem(updatesForHistory);
    setEvaluationResult(evalOutput);
    if (evaluationResultRef.current) {
      evaluationResultRef.current.classList.add('highlight-border');
      evaluationResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast({ title: "Answer Evaluated", description: evalOutput.isCorrect ? "Your answer is correct!" : "Your answer needs improvement." });
    evaluationSuccessful = true;
  } catch (error: any) {
    console.error("Page: Error evaluating answer:", error);
    if (error.message && isAIServiceOverloadError(error.message)) {
      toast({
        variant: "destructive",
        title: "AI Service Busy",
        description: "The AI model is currently experiencing high demand and could not evaluate. Please try again in a few moments.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error Evaluating Answer",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    }
    evaluationSuccessful = false;
  } finally {
    setIsLoadingEvaluation(false);
    // No refreshInteractionStatus here, it's handled by requireInteraction and the logic below for paywall
  }

  if (evaluationSuccessful) {
    if (interactionResult.showLoginModal) {
      setPaywallContext('guestLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Free Limit Reached",
        description: "Please sign up or log in to continue."
      });
    } else if (interactionResult.showUpgradeModal) {
      setPaywallContext('loggedInLimitReached');
      setShowPaywall(true);
      toast({
        variant: "destructive",
        title: "Interaction Limit Reached",
        description: "Your current plan's interaction limit has been reached. Please upgrade to continue."
      }); // Closes the toast call for interactionResult.showUpgradeModal
    } // Closes 'else if (interactionResult.showUpgradeModal)'
  } // Closes 'if (evaluationSuccessful)' or a similar block that contains these interaction limit checks
  await refreshInteractionStatus();
}; // Closes 'handleEvaluateAnswer'
  const handleGenerateProblemInsights = async (problemStatement: string, topicToFetch: string) => {
    // console.log("handleGenerateProblemInsights called with:", { problemStatement, topicToFetch });

    if (currentUser && isLoadingPageProfile) return; // Still loading user profile

    const interactionResult = await requireInteraction('insight');

    if (!interactionResult.allowed) {
      if (interactionResult.showLoginModal) {
        setPaywallContext('guestLimitReached');
        setShowPaywall(true);
        toast({
          variant: "destructive",
          title: "Login Required",
          description: "Please sign up or log in to continue generating insights."
        });
      } else if (interactionResult.showUpgradeModal) {
        setPaywallContext('loggedInLimitReached');
        setShowPaywall(true);
        toast({
          variant: "destructive",
          title: "Upgrade Required",
          description: "Please upgrade to continue generating insights."
        });
      }
      return; // Exit early if not allowed
    }

    setIsLoadingInsights(true); // Set loading state before starting the async operation

    try {
      // console.log("Fetching insights for:", { problemStatement, topicToFetch });
      const result = await generateProblemInsights({
        problemStatement,
        topic: topicToFetch
      });

      // console.log("Generated insights:", result);

      const insightsString = JSON.stringify(result, null, 2);
      setProblemInsights(insightsString);

      if (currentUser) {
        await updateLastHistoryItem({
          isTopicRevised: true,
          topicDetails: insightsString
        });
      }

      toast({
        title: "Problem Insights Fetched",
        description: `Insights for the current problem are now available.`
      });
      // If 'result' needs to be returned by handleGenerateProblemInsights, do it here.
      // return result;

    } catch (error: any) {
      console.error("Page: Error in handleGenerateProblemInsights:", error);
      if (error.message && isAIServiceOverloadError(error.message)) {
        toast({
          variant: "destructive",
          title: "AI Service Busy",
          description: "The AI model is currently experiencing high demand and could not generate insights. Please try again in a few moments.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error Generating Insights",
          description: error.message || "Failed to fetch problem insights. Please try again."
        });
      }
      setProblemInsights(prev => prev || "Failed to load insights due to an error. Please try again.");
    } finally {
      setIsLoadingInsights(false);
      await refreshInteractionStatus();
    }
  };

  const handleProblemFeedback = async (rating: string, comment: string) => {
    if (!currentProblem || (currentUser && isLoadingPageProfile)) {
      toast({variant: "destructive", title: "Cannot Submit Feedback", description: "No active problem or profile still loading."});
      return;
    };
    // console.log("Page: Submitting feedback to history - Rating:", rating, "Comment:", comment);
    await updateLastHistoryItem({
      feedbackRating: rating,
      feedbackComment: comment,
    });
  };

  const handleNewProblemSameTopic = () => {
    if (currentTopic) {
      handleGenerateProblem(currentTopic, history[0]?.problemType || currentProblemType, currentDifficulty);
    } else {
      toast({ title: "No Topic", description: "Please generate a problem first to use this option.", variant: "default" });
    }
  };

  const handleStartNew = () => {
    setCurrentTopic('');
    setCurrentProblem(null);
    setEvaluationResult(null);
    setProblemInsights(null); 
    toast({ title: "Ready for New Topic", description: "Enter a new topic and problem type." });
  };

  const handleSubscribe = async (planId: string) => {
    if (!currentUser || !userProfile) { 
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
        console.error("Page: Error subscribing user:", error);
        toast({ variant: "destructive", title: "Subscription Failed", description: "Could not activate your subscription. " + error.message });
    }
  };

  const handleLoginForPaywall = async () => {
    setShowPaywall(false); 
    // console.log('Attempting to redirect to /login?redirect=%2F'); // Debug log
    router.push('/login?redirect=%2F');
    toast({title: "Redirecting", description: "Please wait while we take you to the login page."}) // Updated toast
  };

  const refreshInteractionStatus = useCallback(async () => {
    if (isClientMounted && !isLoadingPageProfile) {
      // console.log("Page: Refreshing interaction status explicitly...");
      const status = await checkInteractionLimit('problem_generation'); // Using a general type for status display
      setInteractionStatus(status);
    }
  }, [isClientMounted, isLoadingPageProfile, checkInteractionLimit]);

  useEffect(() => {
    if (isClientMounted && !isLoadingPageProfile && !currentUser && !currentProblem && !isLoadingProblem && history.length > 0) {
      const lastItem = history[0];
      if (lastItem) {
        setCurrentTopic(lastItem.topic);
        const validProblemTypes: ProblemType[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based', 'random'];
        setCurrentProblemType(validProblemTypes.includes(lastItem.problemType) ? lastItem.problemType : 'theory');
        setCurrentDifficulty(lastItem.difficulty || 'medium');
        setCurrentProblem(lastItem.problem);
        if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
        if (lastItem.isTopicRevised && lastItem.topicDetails) {
          setProblemInsights(lastItem.topicDetails);
        }
      }
    }
  }, [currentUser, history, isLoadingProblem, currentProblem, isLoadingPageProfile, isClientMounted]);

  const [interactionStatus, setInteractionStatus] = useState<InteractionLimitResult | null>(null);

  useEffect(() => {
    const fetchInteractionStatus = async () => {
      if (isClientMounted && !isLoadingPageProfile) {
        const status = await checkInteractionLimit('problem_generation'); // Use a generic interaction type for display
        setInteractionStatus(status);
      }
    };
    fetchInteractionStatus();
  }, [isClientMounted, isLoadingPageProfile, checkInteractionLimit, currentUser, guestInteractionCount, userProfile]);

  const interactionsLeftText = useCallback(() => {
    if (!isClientMounted || !interactionStatus) {
      return "Loading interactions...";
    }

    const { allowed, remaining, limit, isLoggedIn, requiresLogin, requiresUpgrade } = interactionStatus;

    if (isLoggedIn) {
      if (userProfile?.is_subscribed) {
        return "You have unlimited interactions! 🎉";
      } else {
        // Logged-in, not subscribed
        if (remaining > 0) {
          return `Free interactions remaining: ${remaining} / ${limit}`;
        } else if (requiresUpgrade) {
          return "Free interactions exhausted. Please upgrade to continue.";
        } else {
          return "Interactions: N/A"; // Should not happen if logic is correct
        }
      }
    } else {
      // Guest user
      const guestRemaining = Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount);
      if (guestRemaining > 0) {
        return `Free interactions remaining (guest): ${guestRemaining} / ${FREE_INTERACTION_LIMIT}`;
      } else if (requiresLogin) {
        return "Free interactions exhausted. Please log in to continue.";
      } else {
        return "Interactions: N/A"; // Should not happen if logic is correct
      }
    }
  }, [isClientMounted, interactionStatus, guestInteractionCount, userProfile]);

  return (
    <>
      <HeroSection scrollToProblemGenerator={scrollToProblemGenerator} />
      <GenerateSection />
      
      <div id="generate" className="flex-1 bg-background">
        <div className="py-8 overflow-hidden">
          <div className="grid px-28 gap-6">
            <div className="lg:col-span-2 space-y-6 w-full">
              <div ref={problemGeneratorRef}>
                <ProblemGenerator
                  ref={problemGeneratorComponentRef}
                  onGenerate={handleGenerateProblem}
                  isLoading={isLoadingProblem || (!!currentUser && isLoadingPageProfile)}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                  defaultDifficulty={currentDifficulty}
                />
              </div>
              
              {currentProblem && (
                <>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleNewProblemSameTopic} 
                      variant="outline" 
                      className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis" 
                      disabled={!!(isLoadingProblem || (!!currentUser && isLoadingPageProfile))}
                    >
                      <RefreshCw className="mr-2 h-4 w-4 flex-shrink-0" /> <span>Another (Same Topic)</span>
                    </Button>
                    <Button 
                      onClick={handleStartNew} 
                      variant="outline" 
                      className="flex-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis" 
                      disabled={!!(isLoadingProblem || (!!currentUser && isLoadingPageProfile))}
                    >
                      <FilePlus2 className="mr-2 h-4 w-4 flex-shrink-0" /> <span>Start New Topic</span>
                    </Button>
                  </div>
                  
                  <ProblemDisplay
                    ref={problemDisplayRef}
                    problem={currentProblem}
                    problemType={currentProblemType} 
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (!!currentUser && isLoadingPageProfile))}
                    currentTopic={currentTopic}
                    evaluationSubmitted={!!evaluationResult} 
                  />
                  
                  {evaluationResult && (
                    <>
                      <EvaluationResult ref={evaluationResultRef} evaluation={evaluationResult} />
                      {currentProblem && evaluationResult.isCorrect !== undefined && ( // Only show insights prompt if there's a current problem and evaluation is complete
                        <div className="mt-4 p-4 bg-blue-100 border border-blue-200 text-blue-800 rounded-md">
                          <p>Want to understand how to solve similar problems? Click "View Insights" below!</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {isClientMounted && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Interaction History</span>
                      <History className="h-6 w-6 text-muted-foreground" /> 
                    </CardTitle>
                    <CardDescription>
                      {history.length > 0 
                        ? `You have ${history.length} item(s) in your history. Review your past practice problems and evaluations.`
                        : "Review your past practice problems and evaluations."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/history" passHref>
                      <Button className="w-full" variant="outline">
                        View Full History
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
              <div className="pt-4">
              <ProblemInsights
                problem={currentProblem} 
                topic={currentTopic}    
                insights={problemInsights}
                onFetchInsights={handleGenerateProblemInsights}
                isLoading={!!(isLoadingInsights || (!!currentUser && isLoadingPageProfile))}
              />
            </div>
            </div>
            
            
          </div>
        </div>
      </div>

      <PaywallModal 
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallContext(null); // Reset context on close
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleLoginForPaywall} 
        displayContext={paywallContext}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
          {interactionsLeftText()}
        </p>
      </div>
    </>
  );
}

