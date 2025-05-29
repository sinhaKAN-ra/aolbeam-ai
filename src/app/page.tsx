"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
import { RefreshCw, FilePlus2, ArrowRight, Loader2 } from 'lucide-react';

import type { InteractionHistoryItem, ProblemType, UserProfile, DifficultyLevel } from '@/types';
import { ProblemGenerator, type ProblemGeneratorHandles } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { ProblemInsights } from '@/components/ProblemInsights';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';
import { UseCaseBanner } from '@/components/UseCaseBanner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSupabase } from '@/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { useInteractionLimit } from '@/hooks/useInteractionLimit';

// This is a client component that will be hydrated on the client
// Server-side data fetching should be moved to a Server Component
// and passed as props to this component

const FREE_INTERACTION_LIMIT = 20;
const ALL_CONCRETE_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];

export default function AOLBEAMPage() {
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
  const [evaluationResult, setEvaluationResult] = useState<EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string } | null>(null);
  const [problemInsights, setProblemInsights] = useState<string | null>(null);

  // Loading states
  const [isLoadingProblem, setIsLoadingProblem] = useState<boolean>(false);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState<boolean>(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);

  // History and interactions
  const [history, setHistory] = useState<InteractionHistoryItem[]>([]);
  const [guestInteractionCount, setGuestInteractionCount] = useLocalStorage<number>('aolbeamGuestInteractionCount', 0);
  const { checkInteractionLimit, recordInteraction } = useInteractionLimit();
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [isClientMounted, setIsClientMounted] = useState(false);

  // Refs
  const problemGeneratorRef = useRef<HTMLDivElement>(null);
  const problemGeneratorComponentRef = useRef<ProblemGeneratorHandles>(null);
  
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
        console.log('Page: No user ID available');
        setUserProfile(null);
        setIsLoadingPageProfile(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetchedProfile.current) return;
      hasFetchedProfile.current = true;

      console.log(`Page: fetchAndSetUserProfile called for user: ${user.id}`);
      setIsLoadingPageProfile(true);
      setUserProfile(null);

      const fetchUserProfile = async (user: User) => {
        try {
          console.log(`Page: Attempting to query user_profiles for user ${user.id}...`);
          
          // Use the client-side Supabase client for client-side operations
          const { data: profileData, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (fetchError) {
            if (fetchError.code === 'PGRST116') { 
              console.log(`Page: Profile not found for ${user.id}, attempting to create one.`);
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
              
              console.log(`Page: Created new profile for ${user.id}`);
              setUserProfile(createdProfile as UserProfile);
              return;
            }
            
            // If it's another type of error, throw it
            throw fetchError;
          }

          if (profileData) {
            console.log(`Page: Found existing profile for ${user.id}`);
            
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
              console.log(`Page: Profile for ${user.id} missing fields, attempting update:`, updates);
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
                console.log(`Page: Successfully updated profile for ${user.id}:`, updatedProfileData);
                setUserProfile(updatedProfileData as UserProfile);
              }
            } else {
              console.log(`Page: Using existing profile for ${user.id}`);
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
          console.log(`Page: Finished loading profile for ${user.id}`);
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
    console.log(
      `Page: Profile state updated - isLoadingProfile: ${isLoadingPageProfile} pageCurrentUser: ${!!currentUser} pageUserProfile email: ${userProfile?.email || 'undefined'}`
    );
  }, [isLoadingPageProfile, currentUser, userProfile]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log("Page: Cleaning up AOLBEAMPage component");
      hasFetchedProfile.current = false;
    };
  }, []);

  const hasReachedFreeLimit = useCallback(async () => {
    if (currentUser) {
      const result = await checkInteractionLimit('evaluate');
      return !result.allowed;
    }
    return guestInteractionCount >= FREE_INTERACTION_LIMIT;
  }, [currentUser, checkInteractionLimit, guestInteractionCount]);

  const incrementInteraction = useCallback(async (type: 'evaluate' | 'insight' = 'evaluate') => {
    if (currentUser) {
      try {
        // Record the interaction using the new system
        await recordInteraction(type);
        
        // Also update the old counter for backward compatibility
        if (userProfile) {
          const newCount = (userProfile.interaction_count || 0) + 1;
          const { error } = await supabase
            .from('user_profiles')
            .update({ interaction_count: newCount })
            .eq('user_id', currentUser.id);

          setUserProfile(prev => prev ? { ...prev, interaction_count: newCount } : null);
          if (error) {
            console.error('Error updating interaction count:', error);
          }
        }
      } catch (error) {
        console.error('Error incrementing interaction:', error);
      }
    } else {
      setGuestInteractionCount(prev => prev + 1);
    }
  }, [currentUser, userProfile, supabase, setGuestInteractionCount, recordInteraction]);

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
          console.log("Page: Attempting to save new problem to Supabase:", dbRecord);
          const { data: dbData, error: dbError } = await supabase.from('user_interactions').insert(dbRecord).select('id').single();
          if (dbError) {
              console.error("Page: Error saving history to Supabase:", dbError);
              toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + dbError.message });
          } else if (dbData) {
            console.log("Page: Successfully saved new problem to Supabase, ID:", dbData.id);
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

  const updateLastHistoryItem = useCallback(async (updates: Partial<InteractionHistoryItem>) => {
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
        console.log("Page: Attempting to update Supabase history item ID:", itemToUpdateSupabaseId, "with payload:", dbUpdatePayload);
        try {
          const { error: dbError } = await supabase.from('user_interactions').update(dbUpdatePayload).eq('id', itemToUpdateSupabaseId).eq('user_id', currentUser.id);
          if (dbError) {
            console.error("Page: Error updating history in Supabase:", dbError);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + dbError.message });
          } else {
            console.log("Page: Successfully updated history item in Supabase, ID:", itemToUpdateSupabaseId);
          }
        } catch (e) {
            console.error("Page: Exception updating history in Supabase:", e);
            toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account." });
        }
      }
    } else if (supabase && currentUser && !itemToUpdateSupabaseId && history.length > 0 && history[0] && Object.keys(updates).length > 0) {
        console.warn("Page: Attempted to update history item in Supabase, but supabase_id was missing for the last item. Local history updated.", history[0]);
    }
  }, [setHistory, supabase, currentUser, toast, history, saveHistoryToLocalStorage]);

  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if ((currentUser && isLoadingPageProfile) || await hasReachedFreeLimit()) {
      if (await hasReachedFreeLimit()) {
        if (!currentUser) {
          toast({ 
            variant: "destructive", 
            title: "Free Limit Reached", 
            description: "Please sign up or log in to continue generating problems." 
          });
          router.push('/login?redirect=/');
        } else {
          toast({ 
            variant: "destructive", 
            title: "Free Limit Reached", 
            description: "Please upgrade to continue generating problems." 
          });
          setShowPaywall(true);
        }
      }
      return;
    }

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

    try {
      await incrementInteraction('evaluate');
      const result = await generatePracticeProblem({ topic, problemType: actualProblemTypeForAI, difficulty });
      const problemDifficulty = result.difficulty || difficulty; 
      const problemWithDifficulty = {...result, difficulty: problemDifficulty};
      setCurrentProblem(problemWithDifficulty);
      await addToHistory({ 
        topic,
        problemType: type, 
        actualProblemType: actualProblemTypeForAI, 
        difficulty: problemDifficulty, 
        problem: problemWithDifficulty, 
      });
      toast({ title: "Problem Generated!", description: `A new ${actualProblemTypeForAI} problem on "${topic}" (${problemDifficulty}) is ready.` });
    } catch (error) {
      console.error("Page: Error generating problem:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate problem. Please try again." });
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleEvaluateAnswer = async (answer: string, timeTakenSeconds?: number) => {
    if (!currentProblem || !currentTopic || (currentUser && isLoadingPageProfile)) return;

    setIsLoadingEvaluation(true);
    setEvaluationResult(null);

    try {
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string; correctAnswer: string };
      const updatesForHistory: Partial<InteractionHistoryItem> = { timeTakenSeconds };
      
      const isMcqStyleProblem = currentProblem.multipleChoiceOptions && currentProblem.multipleChoiceOptions.length > 0;

      if (!isMcqStyleProblem) { 
        let insightsForEval = problemInsights;
      if (!insightsForEval) {
        const result = await generateProblemInsights({ 
          problemStatement: currentProblem.problemStatement, 
          topic: currentTopic 
        });
        insightsForEval = JSON.stringify(result, null, 2);
      }
      
      const evalInput: EvaluateTheoryAnswerInput = {
        question: currentProblem.problemStatement,
        studentAnswer: answer,
        answerFormat: currentProblem.answerFormat, 
        topicDetails: insightsForEval,
      };
      evalOutput = await evaluateTheoryAnswer(evalInput);
      
      // Ensure correctAnswer exists and contains step-by-step solution
      if (!evalOutput.correctAnswer) {
        evalOutput.correctAnswer = currentProblem.correctAnswer;
      }
      
      updatesForHistory.userAnswer = answer;
    } else { 
      const isCorrect = answer === currentProblem.correctAnswer;
      
      // Create a comprehensive step-by-step explanation for MCQ problems
      const stepByStepSolution = `## Step-by-Step Solution

${currentProblem.answerFormat}

### Correct Answer: ${currentProblem.correctAnswer}

${currentProblem.correctAnswer ? `### Explanation:
${currentProblem.answerFormat}` : ''}`;
      
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
      toast({ title: "Answer Evaluated", description: evalOutput.isCorrect ? "Your answer is correct!" : "Your answer needs improvement." });
    } catch (error) {
      console.error("Page: Error evaluating answer:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to evaluate answer. Please try again." });
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleGenerateProblemInsights = async (problemStatement: string, topicToFetch: string) => { 
    try {
      console.log("handleGenerateProblemInsights called with:", { problemStatement, topicToFetch });
      
      // Check user and loading state
      const userCheck = currentUser && isLoadingPageProfile;
      const usageLimitReached = await hasReachedFreeLimit();
      console.log("User check:", { currentUser, isLoadingPageProfile, userCheck, usageLimitReached });
      
      if (userCheck || usageLimitReached) {
        console.log("Cannot fetch insights: User not loaded or usage limit reached");
        if (usageLimitReached) {
          toast({ variant: "destructive", title: "Usage Limit Reached", description: "You've reached your free usage limit. Please sign up to continue." });
          setShowPaywall(true);
        }
        return;
      }
      
      console.log("Fetching insights for:", { problemStatement, topicToFetch });
      setIsLoadingInsights(true); 
      
      await incrementInteraction('insight');
      const result = await generateProblemInsights({ 
        problemStatement, 
        topic: topicToFetch 
      });
      
      console.log("Generated insights:", result);
      
      // Store the complete insights object
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
      
      return result;
    } catch (error) {
      console.error("Page: Error in handleGenerateProblemInsights:", error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to fetch problem insights." 
      });
      setProblemInsights("Failed to load insights. Please try again.");
      throw error; // Re-throw to allow error handling in the calling component
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleProblemFeedback = async (rating: string, comment: string) => {
    if (!currentProblem || (currentUser && isLoadingPageProfile)) {
      toast({variant: "destructive", title: "Cannot Submit Feedback", description: "No active problem or profile still loading."});
      return;
    };
    console.log("Page: Submitting feedback to history - Rating:", rating, "Comment:", comment);
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
    toast({title: "Login to Subscribe", description: "Please use the Login/Sign Up option in the header."})
  };

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
        } else {
          setProblemInsights(null);
        }
      }
    }
  }, [currentUser, history, isLoadingProblem, currentProblem, isLoadingPageProfile, isClientMounted]);

  const [interactionsLeft, setInteractionsLeft] = useState<string>("Loading interactions...");

  useEffect(() => {
    async function updateInteractionsText() {
      if (isLoadingPageProfile && currentUser) {
        setInteractionsLeft("Loading interactions...");
        return;
      }
      
      if (currentUser) {
        try {
          const result = await checkInteractionLimit('evaluate');
          if (result.limit === -1 || result.remaining === -1) {
            setInteractionsLeft("You have unlimited interactions!");
          } else {
            setInteractionsLeft(`Free interactions remaining: ${result.remaining}`);
          }
        } catch (error) {
          console.error('Error checking interaction limit:', error);
          setInteractionsLeft("Interactions: N/A (Error loading limits)");
        }
      } else {
        setInteractionsLeft(`Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount)}`);
      }
    }
    
    updateInteractionsText();
  }, [currentUser, isLoadingPageProfile, checkInteractionLimit, guestInteractionCount]);

  const interactionsLeftText = () => interactionsLeft;

  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-16 md:py-24 text-center bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-primary-foreground brightness-125">
              <span className="text-black dark:text-primary">Access of Learning</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/90 leading-relaxed">
              Beam into the world of knowledge! Master complex subjects with AI-driven practice problems and targeted topic revision. 
              Build pattern recognition, <span className="font-semibold text-primary">prepare like a topper</span>, and achieve exam success.
            </p>
            <div className="mt-10 py-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Start Practicing?</h2>
              <Button
                size="lg"
                onClick={scrollToProblemGenerator}
                className="group relative inline-flex items-center justify-center text-lg font-semibold px-8 py-3 
                  rounded-2xl bg-gradient-to-r from-primary to-primary/80 
                  text-white shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out 
                  hover:from-primary/90 hover:to-primary/70 
                  focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              >
                <span className="mr-2 transition-transform duration-300 group-hover:-translate-x-1">
                  Generate Your First Problem
                </span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <UseCaseBanner />
      
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    problem={currentProblem}
                    problemType={currentProblemType} 
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (!!currentUser && isLoadingPageProfile))}
                    currentTopic={currentTopic}
                    evaluationSubmitted={!!evaluationResult} 
                  />
                  
                  {evaluationResult && (
                    <EvaluationResult evaluation={evaluationResult} />
                  )}
                </>
              )}
              {isClientMounted && <HistoryView history={history} />}
            </div>
            
            <div className="space-y-6">
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

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          const isTrulyMandatory = !!(currentUser && userProfile && !userProfile.is_subscribed && ((userProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT));
          if (!isTrulyMandatory) {
            setShowPaywall(false);
          } else {
            toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "default"});
          }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleLoginForPaywall} 
        isMandatory={showPaywall && !!(currentUser && userProfile && !userProfile.is_subscribed && ((userProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT))}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
          {interactionsLeftText()}
        </p>
      </div>
    </div>
  );
}

