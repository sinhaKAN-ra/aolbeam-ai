
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
  fetchTopicDetails,
  type FetchTopicDetailsInput,
  type FetchTopicDetailsOutput,
} from '@/ai/flows/fetch-topic-details';
import { RefreshCw, FilePlus2, ArrowRight, Loader2 } from 'lucide-react';

import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { InteractionHistoryItem, ProblemType, UserProfile, DifficultyLevel } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';
import { UseCaseBanner } from '@/components/UseCaseBanner';
import { useLocalStorage } from '@/hooks/useLocalStorage';


const FREE_INTERACTION_LIMIT = 5;
const ALL_CONCRETE_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];


export default function AOLBEAMPage() {
  const { toast } = useToast();
  const [supabase] = useState<SupabaseClient>(() => {
    console.log('Page: Initializing Supabase client (once)...');
    return createClientComponentClient();
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingPageProfile, setIsLoadingPageProfile] = useState<boolean>(true);

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
  
  const fetchAndSetUserProfileHeader = useCallback(async (user: User) => {
    // This function is similar to fetchAndSetUserProfile in Header.tsx
    // It's duplicated here for page-specific logic if needed, or could be a shared hook
    console.log(`Page: fetchAndSetUserProfile (Placeholder for page-specific logic if any) for user: ${user.id}`);
    setIsLoadingPageProfile(true);
    setUserProfile(null);

    try {
      let { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        console.log(`Page: Profile not found for ${user.id}, attempting to create one.`);
        const newProfilePayload = {
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
          console.error(`Page: Error creating new profile for ${user.id}:`, createError);
          if (createError.code === '23505') {
            console.log(`Page: Profile creation failed due to unique constraint (likely trigger ran), re-fetching for ${user.id}.`);
            const { data: refetchedProfile, error: refetchError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (refetchError) {
              console.error(`Page: Error re-fetching profile for ${user.id}:`, refetchError);
            } else {
              profileData = refetchedProfile;
            }
          } else {
            // Fallback to original error if not a unique constraint violation
             toast({ variant: "destructive", title: "Profile Error", description: createError.message });
          }
        } else {
          console.log(`Page: Successfully created new profile for ${user.id}:`, createdProfile);
          profileData = createdProfile;
        }
      } else if (fetchError) {
        console.error(`Page: Error fetching profile for ${user.id}:`, fetchError);
        toast({ variant: "destructive", title: "Profile Error", description: fetchError.message });
      } else if (profileData) {
         console.log(`Page: Successfully fetched existing profile for ${user.id}:`, profileData);
         const updates: Partial<UserProfile> = {};
         let needsDBUpdate = false;
         if (!profileData.email && user.email) {
            updates.email = user.email;
            needsDBUpdate = true;
         }
         if (!profileData.full_name && (user.user_metadata?.full_name || user.email)) {
            updates.full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            needsDBUpdate = true;
         }
         if (needsDBUpdate) {
            console.log(`Page: Profile for ${user.id} missing fields, attempting update:`, updates);
            const { data: updatedProfileData, error: updateError } = await supabase
              .from('user_profiles')
              .update(updates)
              .eq('id', user.id)
              .select()
              .single();
            if (updateError) {
              console.error(`Page: Error updating profile for ${user.id} with missing fields:`, updateError);
            } else {
              profileData = updatedProfileData;
            }
         }
      }
      setUserProfile(profileData as UserProfile | null);
    } catch (error) {
      console.error(`Page: Unexpected error in fetchAndSetUserProfile for ${user.id}:`, error);
      toast({ variant: "destructive", title: "Profile Error", description: "Could not load your profile." });
    } finally {
      console.log(`Page: fetchAndSetUserProfile for ${user.id} finished. isLoadingPageProfile will be set to false.`);
      setIsLoadingPageProfile(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    console.log('Page: Main useEffect for auth running. Supabase client available:', !!supabase);
    
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log(`Page: Auth state changed: ${event}`, { user: session?.user?.email });
      const user = session?.user ?? null;
      setCurrentUser(user);
      
      if (user) {
        console.log(`Page: User authenticated from onAuthStateChange, calling fetchAndSetUserProfileHeader.`);
        await fetchAndSetUserProfileHeader(user); // Use the page-specific or shared fetcher
      } else {
        setUserProfile(null); 
        setIsLoadingPageProfile(false); 
      }
    };

    const checkUser = async () => {
      console.log('Page: checkUser called. Checking for existing session...');
      setIsLoadingPageProfile(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        const user = session?.user ?? null;
        console.log('Page: Current user from getSession:', user?.email);
        setCurrentUser(user);

        if (user) {
          console.log('Page: Existing session found in checkUser, calling fetchAndSetUserProfileHeader.');
          await fetchAndSetUserProfileHeader(user); // Use the page-specific or shared fetcher
        } else {
          console.log('Page: No existing session found in checkUser.');
          setUserProfile(null);
          setIsLoadingPageProfile(false); 
        }
      } catch (error) {
        console.error('Page: Error in checkUser:', error);
        setUserProfile(null);
        setIsLoadingPageProfile(false); 
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      console.log('Page: Cleaning up auth subscription.');
      subscription?.unsubscribe();
    };
  }, [supabase, fetchAndSetUserProfileHeader]);

  useEffect(() => {
    console.log(
      `Page: Profile state updated - isLoadingProfile: ${isLoadingPageProfile} pageCurrentUser: ${!!currentUser} pageUserProfile email: ${userProfile?.email}`
    );
  }, [isLoadingPageProfile, currentUser, userProfile]);

  useEffect(() => {
    return () => {
      console.log("Page: Cleaning up AOLBEAMPage component");
    };
  }, []);

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


  const incrementInteraction = useCallback(async () => {
    if (currentUser && userProfile && !userProfile.is_subscribed) {
        const newCount = (userProfile.interaction_count || 0) + 1;
        setUserProfile(prev => prev ? { ...prev, interaction_count: newCount } : null); 
        
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ interaction_count: newCount })
                .eq('id', currentUser.id);
            if (error) {
                console.error("Page: Error updating interaction count in Supabase:", error);
                toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count. Reverting UI." });
                setUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null);
            }
        } catch (error: any) {
            console.error("Page: Exception updating interaction count in Supabase:", error);
            toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count. Reverting UI." });
            setUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null); 
        }
    } else if (!currentUser) { 
        setGuestInteractionCount(prev => prev + 1);
    }
  }, [currentUser, userProfile, supabase, setGuestInteractionCount, toast]);


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

    setHistory(prevHistory => [newHistoryItem, ...prevHistory].slice(0, 50));

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
        };
        try {
          const { data: dbData, error: dbError } = await supabase.from('user_interactions').insert(dbRecord).select('id').single();
          if (dbError) {
              console.error("Page: Error saving history to Supabase:", dbError);
              toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + dbError.message });
          } else if (dbData) {
            setHistory(prev => prev.map(hItem => 
                hItem.id === newHistoryItem.id ? { ...hItem, supabase_id: dbData.id } : hItem
            ));
          }
        } catch (e) {
            console.error("Page: Exception saving history to Supabase:", e);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account." });
        }
    }
  }, [setHistory, supabase, currentUser, toast]); 

  const updateLastHistoryItem = useCallback(async (updates: Partial<InteractionHistoryItem>) => {
    let itemToUpdateSupabaseId: string | undefined;
    
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const updatedItem: InteractionHistoryItem = {
        ...prevHistory[0],
        ...updates,
        problem: updates.problem ? { ...prevHistory[0].problem!, ...updates.problem } : prevHistory[0].problem,
      };
      itemToUpdateSupabaseId = updatedItem.supabase_id;
      const newHistory = [updatedItem, ...prevHistory.slice(1)];

      if (supabase && currentUser && itemToUpdateSupabaseId) { 
        const dbUpdatePayload: any = {};
        if (updates.userAnswer !== undefined) dbUpdatePayload.user_answer = updates.userAnswer;
        if (updates.selectedOption !== undefined) dbUpdatePayload.selected_option = updates.selectedOption;
        if (updates.evaluation !== undefined) {
          dbUpdatePayload.evaluation_is_correct = updates.evaluation.isCorrect;
          dbUpdatePayload.evaluation_feedback = updates.evaluation.feedback;
          if ('correctAnswer' in updates.evaluation && updates.evaluation.correctAnswer) dbUpdatePayload.evaluation_correct_answer_detail = updates.evaluation.correctAnswer;
          if ('explanation' in updates.evaluation && updates.evaluation.explanation) dbUpdatePayload.evaluation_explanation_detail = updates.evaluation.explanation;
        }
        if (updates.isTopicRevised !== undefined) dbUpdatePayload.is_topic_revised = updates.isTopicRevised;
        if (updates.topicDetails !== undefined) dbUpdatePayload.topic_details_content = updates.topicDetails;
        if (updates.feedbackRating !== undefined) dbUpdatePayload.feedback_rating = updates.feedbackRating;
        if (updates.feedbackComment !== undefined) dbUpdatePayload.feedback_comment = updates.feedbackComment;
        if (updates.timeTakenSeconds !== undefined) dbUpdatePayload.time_taken_seconds = updates.timeTakenSeconds;
        
        if (Object.keys(dbUpdatePayload).length > 0) {
          console.log("Page: Attempting to update Supabase history item ID:", itemToUpdateSupabaseId, "with payload:", dbUpdatePayload);
          supabase.from('user_interactions').update(dbUpdatePayload).eq('id', itemToUpdateSupabaseId).eq('user_id', currentUser.id)
          .then(({ error: dbError }) => {
            if (dbError) {
              console.error("Page: Error updating history in Supabase:", dbError);
              toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + dbError.message });
            } else {
              console.log("Page: Successfully updated history item in Supabase, ID:", itemToUpdateSupabaseId);
            }
          }).catch(e => {
              console.error("Page: Exception updating history in Supabase:", e);
              toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account." });
          });
        }
      } else if (supabase && currentUser && !itemToUpdateSupabaseId && prevHistory[0] && Object.keys(updates).length > 0) {
          console.warn("Page: Attempted to update history item in Supabase, but supabase_id was missing for the last item. Local history updated.", prevHistory[0]);
      }
      return newHistory;
    });
  }, [setHistory, supabase, currentUser, toast]);


  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if ((currentUser && isLoadingPageProfile) || checkUsageLimit()) return;

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
      const problemDifficulty = result.difficulty || difficulty; 
      setCurrentProblem({...result, difficulty: problemDifficulty});
      await addToHistory({ 
        topic,
        problemType: type,
        actualProblemType: actualProblemTypeForAI, 
        difficulty: problemDifficulty, 
        problem: {...result, difficulty: problemDifficulty}, 
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
      let evalOutput: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
      const updatesForHistory: Partial<InteractionHistoryItem> = { timeTakenSeconds };
      
      const isMcqStyleProblem = currentProblem.multipleChoiceOptions && currentProblem.multipleChoiceOptions.length > 0;

      if (!isMcqStyleProblem) { 
        const fetchedDetailsForEval = topicDetails || (await fetchTopicDetails({topic: currentTopic})).details || "No specific topic details available for this evaluation.";
        
        const evalInput: EvaluateTheoryAnswerInput = {
          question: currentProblem.problemStatement,
          studentAnswer: answer,
          answerFormat: currentProblem.answerFormat, 
          topicDetails: fetchedDetailsForEval,
        };
        evalOutput = await evaluateTheoryAnswer(evalInput);
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
      console.error("Page: Error evaluating answer:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to evaluate answer. Please try again." });
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleFetchTopicDetails = async (topicToFetch: string) => {
    if ((currentUser && isLoadingPageProfile) || checkUsageLimit()) return;

    setIsLoadingDetails(true);
    try {
      await incrementInteraction();
      const result = await fetchTopicDetails({ topic: topicToFetch });
      setTopicDetails(result.details);
      await updateLastHistoryItem({ isTopicRevised: true, topicDetails: result.details }); 
      toast({ title: "Topic Details Fetched", description: `Details for "${topicToFetch}" are now available.` });
    } catch (error) 
    {
      console.error("Page: Error fetching topic details:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch topic details." });
      setTopicDetails("Failed to load details. Please try again."); 
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleProblemFeedback = async (rating: string, comment: string) => {
    if (!currentProblem || (currentUser && isLoadingPageProfile)) {
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
      handleGenerateProblem(currentTopic, currentProblemType === 'random' ? 'random' : currentProblemType, currentDifficulty);
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
        console.error("Page: Error subscribing user:", error);
        toast({ variant: "destructive", title: "Subscription Failed", description: "Could not activate your subscription. " + error.message });
    }
  };

  const handleLoginForPaywall = async () => {
    setShowPaywall(false); 
    toast({title: "Login to Subscribe", description: "Please use the Login/Sign Up option in the header."})
  };


  useEffect(() => {
    if (!isLoadingPageProfile && !currentUser && history.length > 0 && !currentProblem && !isLoadingProblem) {
      const lastItem = history[0];
      setCurrentTopic(lastItem.topic);
      setCurrentProblemType(lastItem.problemType === 'random' ? 'theory' : lastItem.problemType as Exclude<ProblemType, 'random'>); 
      setCurrentDifficulty(lastItem.difficulty || 'medium');
      setCurrentProblem(lastItem.problem);
      if (lastItem.evaluation) setEvaluationResult(lastItem.evaluation);
      if (lastItem.isTopicRevised && lastItem.topicDetails) {
        setTopicDetails(lastItem.topicDetails);
      } else {
        setTopicDetails(null);
      }
    }
  }, [currentUser, history, isLoadingProblem, currentProblem, isLoadingPageProfile]);


  const interactionsLeftText = () => {
    if (isLoadingPageProfile && currentUser) return "Loading interactions...";
    if (currentUser && userProfile) {
        return userProfile.is_subscribed ? "You have unlimited interactions!" : `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - (userProfile.interaction_count || 0))}`;
    }
    if (!currentUser) { 
        return `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount)}`;
    }
    return "Interactions: N/A (Error loading profile)"; 
  };

  return (
    <>
      <section className="py-16 md:py-24 text-center bg-background">
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
      
      <UseCaseBanner />

      <div ref={problemGeneratorRef} className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {isLoadingPageProfile && currentUser ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
            <div className="lg:col-span-3 flex flex-col gap-6">
              <ProblemGenerator
                onGenerate={handleGenerateProblem}
                isLoading={isLoadingProblem || (!!currentUser && isLoadingPageProfile)}
                defaultTopic={currentTopic}
                defaultProblemType={currentProblemType}
                defaultDifficulty={currentDifficulty}
              />
              {currentProblem && (
                <>
                  <div className="flex gap-2 mt-0"> 
                    <Button 
                      onClick={handleNewProblemSameTopic} 
                      variant="outline" 
                      className="flex-1" 
                      disabled={!!(isLoadingProblem || (!!currentUser && isLoadingPageProfile))}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Another (Same Topic)
                    </Button>
                    <Button 
                      onClick={handleStartNew} 
                      variant="outline" 
                      className="flex-1" 
                      disabled={!!(isLoadingProblem || (!!currentUser && isLoadingPageProfile))}
                    >
                      <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                    </Button>
                  </div>
                  <ProblemDisplay
                    problem={currentProblem}
                    problemType={currentProblemType} 
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (!!currentUser && isLoadingPageProfile))}
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
                isLoading={!!(isLoadingDetails || (!!currentUser && isLoadingPageProfile))}
              />
              <HistoryView history={history} />
            </div>
          </div>
        )}
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
    </>
  );
}
