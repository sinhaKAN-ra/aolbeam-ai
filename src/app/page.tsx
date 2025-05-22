
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
// Link component is now in Header
// import Link from 'next/link';
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
} from '@/ai/flows/evaluate-theory-answer';
import {
  fetchTopicDetails,
} from '@/ai/flows/fetch-topic-details';
import { RefreshCcw, FilePlus2, ArrowRight } from 'lucide-react';
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { InteractionHistoryItem, ProblemType, UserProfile, DifficultyLevel } from '@/types';
import { ProblemGenerator } from '@/components/ProblemGenerator';
import { ProblemDisplay } from '@/components/ProblemDisplay';
import { EvaluationResult } from '@/components/EvaluationResult';
import { TopicRevision } from '@/components/TopicRevision';
import { HistoryView } from '@/components/HistoryView';
import { PaywallModal } from '@/components/PaywallModal';
// ThemeToggle removed as it's in the global Header
import Footer from '@/components/Footer';
import { useLocalStorage } from '@/hooks/useLocalStorage';


const FREE_INTERACTION_LIMIT = 5;
const ALL_CONCRETE_PROBLEM_TYPES: Exclude<ProblemType, 'random'>[] = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];


export default function AOLBEAMPage() {
  const { toast } = useToast();
  
  const [supabase] = useState<SupabaseClient>(() => {
    console.log('Page: Initializing Supabase client...');
    return createClientComponentClient();
  });
  
  const [pageCurrentUser, setPageCurrentUser] = useState<User | null>(null);
  const [pageUserProfile, setPageUserProfile] = useState<UserProfile | null>(null);
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

  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    console.log(`Page: Attempting to fetch profile from user_profiles table for user: ${user.id}`);
    setIsLoadingPageProfile(true);
    setPageUserProfile(null); 

    try {
      let { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setPageUserProfile(profileData as UserProfile);
      } else if (fetchError && fetchError.code === 'PGRST116') { 
        console.log('Page: No profile found (PGRST116), attempting to create as fallback...');
        const newProfilePayload: Omit<UserProfile, 'created_at' | 'updated_at'> = { 
          id: user.id,
          email: user.email!, 
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          interaction_count: 0,
          is_subscribed: false,
        };
        const { data: insertedProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(newProfilePayload)
          .select()
          .single();
        
        if (insertedProfile) {
            setPageUserProfile(insertedProfile as UserProfile);
        } else if (insertError && insertError.code === '23505') { 
            console.log('Page: Profile insert failed due to unique violation (profile likely created by trigger). Re-fetching...');
            const { data: refetchedData, error: refetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (refetchedData) setPageUserProfile(refetchedData as UserProfile);
            else {
                console.error('Page: Error re-fetching profile after unique violation:', refetchError);
                toast({ variant: 'destructive', title: 'Profile Sync Error', description: `Could not sync your profile: ${refetchError?.message || 'Unknown error'}`});
            }
        } else { 
            console.error('Page: Error creating user profile during fallback insert:', insertError);
            toast({ variant: 'destructive', title: 'Profile Creation Failed', description: `Could not create your profile: ${insertError?.message || 'Unknown error'}`});
        }
      } else if (fetchError) { 
        console.error('Page: Database error fetching profile:', fetchError);
        toast({ variant: 'destructive', title: 'Profile Error', description: `Could not load your profile: ${fetchError.message}`});
      }
    } catch (error) { 
      console.error('Page: Unexpected error during profile setup:', error);
      toast({ variant: 'destructive', title: 'Profile Setup Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
      setIsLoadingPageProfile(false);
      console.log(`Page: Profile fetching complete. isLoadingPageProfile: ${false}, pageUserProfile email: ${pageUserProfile?.email}`);
    }
  }, [supabase, toast]); // N.B. pageUserProfile?.email was removed from dep array to avoid re-fetch loops


  useEffect(() => {
    const handlePageAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Page: Auth state changed:', event, { user: session?.user?.email });
      const user = session?.user ?? null;
      setPageCurrentUser(user);
      
      if (user) {
        console.log('Page: User authenticated, fetching profile...');
        await fetchAndSetUserProfile(user);
      } else {
        setPageUserProfile(null);
        setIsLoadingPageProfile(false); 
      }
    };

    const checkPageUser = async () => {
      console.log('Page: Checking for existing session...');
      setIsLoadingPageProfile(true); 
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setPageCurrentUser(user); 
      if (user) {
        await fetchAndSetUserProfile(user);
      } else {
        setIsLoadingPageProfile(false); 
      }
    };
    
    console.log('Page: Setting up auth subscription...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handlePageAuthChange);
    checkPageUser(); 

    return () => {
      subscription?.unsubscribe();
      console.log("Page: Cleaning up auth subscription");
    };
  }, [supabase, fetchAndSetUserProfile]);

  useEffect(() => {
    console.log('Page: Profile state updated - isLoadingProfile:', isLoadingPageProfile, 'pageCurrentUser:', !!pageCurrentUser, 'pageUserProfile email:', pageUserProfile?.email);
  }, [isLoadingPageProfile, pageCurrentUser, pageUserProfile]);

  useEffect(() => {
    console.log("Page: Cleaning up AOLBEAMPage component");
    return () => {
      // Any other cleanup logic for the component itself
    };
  }, []);

  const checkUsageLimit = useCallback((): boolean => {
    if (pageCurrentUser && pageUserProfile) {
      if (pageUserProfile.is_subscribed) return false; 
      if ((pageUserProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT) {
        setShowPaywall(true);
        return true;
      }
    } else if (!pageCurrentUser) { 
      if (guestInteractionCount >= FREE_INTERACTION_LIMIT) {
        setShowPaywall(true);
        return true;
      }
    }
    return false; 
  }, [pageCurrentUser, pageUserProfile, guestInteractionCount]);


  const incrementInteraction = useCallback(async () => {
    if (pageCurrentUser && pageUserProfile && !pageUserProfile.is_subscribed) {
        const newCount = (pageUserProfile.interaction_count || 0) + 1;
        setPageUserProfile(prev => prev ? { ...prev, interaction_count: newCount } : null); 
        
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ interaction_count: newCount })
                .eq('id', pageCurrentUser.id);
            if (error) {
                console.error("Page: Error updating interaction count in Supabase:", error);
                toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count. Reverting UI." });
                setPageUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null);
            }
        } catch (error: any) {
            console.error("Page: Exception updating interaction count in Supabase:", error);
            toast({ variant: "destructive", title: "Sync Error", description: "Could not save interaction count. Reverting UI." });
            setPageUserProfile(prev => prev ? { ...prev, interaction_count: newCount - 1 } : null); 
        }
    } else if (!pageCurrentUser) { 
        setGuestInteractionCount(prev => prev + 1);
    }
  }, [pageCurrentUser, pageUserProfile, supabase, setGuestInteractionCount, toast]);


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

    setHistory(prevHistory => {
      const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 50);
      if (pageCurrentUser && itemToAdd.problem && itemToAdd.problem.problemStatement) {
          const dbRecord: any = { 
              user_id: pageCurrentUser.id,
              topic: itemToAdd.topic,
              problem_type: itemToAdd.actualProblemType, 
              difficulty: itemToAdd.difficulty,
              problem_statement: itemToAdd.problem.problemStatement,
              answer_format: itemToAdd.problem.answerFormat,
              multiple_choice_options: itemToAdd.problem.multipleChoiceOptions,
              correct_answer: itemToAdd.problem.correctAnswer,
          };
          supabase.from('user_interactions').insert(dbRecord).select('id').single()
          .then(({ data: dbData, error: dbError }) => {
              if (dbError) {
                  console.error("Page: Error saving history to Supabase:", dbError);
                  toast({ variant: "destructive", title: "Save Error", description: "Could not save new problem to your account. " + dbError.message });
              } else if (dbData) {
                  setHistory(prev => prev.map(hItem => 
                      hItem.id === newHistoryItem.id ? { ...hItem, supabase_id: dbData.id } : hItem
                  ));
              }
          });
      }
      return updatedHistory;
    });
  }, [setHistory, supabase, pageCurrentUser, toast]); 

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

      if (supabase && pageCurrentUser && itemToUpdateSupabaseId) { 
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
          supabase.from('user_interactions').update(dbUpdatePayload).eq('id', itemToUpdateSupabaseId).eq('user_id', pageCurrentUser.id)
          .then(({ error: dbError }) => {
            if (dbError) {
              console.error("Page: Error updating history in Supabase:", dbError);
              toast({ variant: "destructive", title: "Update Error", description: "Could not save updates to your account. " + dbError.message });
            }
          });
        }
      } else if (supabase && pageCurrentUser && !itemToUpdateSupabaseId && prevHistory[0] && Object.keys(updates).length > 0) {
          console.warn("Page: Attempted to update history in Supabase, but supabase_id was missing for the last item:", prevHistory[0]);
      }
      return newHistory;
    });
  }, [setHistory, supabase, pageCurrentUser, toast]); // pageUserProfile removed from deps to avoid loops


  const handleGenerateProblem = async (topic: string, type: ProblemType, difficulty: DifficultyLevel) => {
    if ((pageCurrentUser && isLoadingPageProfile) || checkUsageLimit()) return;

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
        difficulty: result.difficulty || difficulty, 
        problem: result,
      });
      toast({ title: "Problem Generated!", description: `A new ${actualProblemTypeForAI} problem on "${topic}" (${result.difficulty || difficulty}) is ready.` });
    } catch (error) {
      console.error("Page: Error generating problem:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate problem. Please try again." });
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleEvaluateAnswer = async (answer: string, timeTakenSeconds?: number) => {
    if (!currentProblem || !currentTopic || (pageCurrentUser && isLoadingPageProfile)) return;

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
      console.error("Page: Error evaluating answer:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to evaluate answer. Please try again." });
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  const handleFetchTopicDetails = async (topicToFetch: string) => {
    if ((pageCurrentUser && isLoadingPageProfile) || checkUsageLimit()) return;

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
    if (!currentProblem || (pageCurrentUser && isLoadingPageProfile)) {
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
    if (!supabase || !pageCurrentUser || !pageUserProfile) { 
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
            .eq('id', pageCurrentUser.id)
            .select() 
            .single();
        if (error) throw error;
        if (data) {
            setPageUserProfile(data as UserProfile); 
            setShowPaywall(false);
            toast({ title: "Subscription Activated!", description: "You now have unlimited access and your progress will be saved to your account." });
        }
    } catch (error: any) {
        console.error("Page: Error subscribing user:", error);
        toast({ variant: "destructive", title: "Subscription Failed", description: "Could not activate your subscription. " + error.message });
    }
  };

  const handleLoginForPaywall = async () => {
    // This function would be called by the PaywallModal's "Login/Register" button
    // The actual Google Sign-In is initiated by the global Header.
    // We just need to make sure the paywall closes or re-evaluates after login.
  };


  useEffect(() => {
    // Load last interaction for guests from localStorage if no current problem is active
    if (!isLoadingPageProfile && !pageCurrentUser && history.length > 0 && !currentProblem && !isLoadingProblem) {
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
  }, [pageCurrentUser, history, isLoadingProblem, currentProblem, isLoadingPageProfile]);


  const interactionsLeftText = () => {
    if (isLoadingPageProfile && pageCurrentUser) return "Loading interactions...";
    if (pageCurrentUser && pageUserProfile) {
        return pageUserProfile.is_subscribed ? "You have unlimited interactions!" : `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - (pageUserProfile.interaction_count || 0))}`;
    }
    if (!pageCurrentUser) {
        return `Free interactions remaining: ${Math.max(0, FREE_INTERACTION_LIMIT - guestInteractionCount)}`;
    }
    return "Interactions: N/A (Error loading profile)"; 
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          const isMandatoryPaywall = !!(pageCurrentUser && pageUserProfile && !pageUserProfile.is_subscribed && ((pageUserProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT ));
            if (!isMandatoryPaywall) {
                setShowPaywall(false);
            } else {
                 toast({title: "Plan Selection Required", description: "Please select a plan to continue using AOLBEAM.", variant: "default"});
            }
        }}
        onSubscribe={handleSubscribe}
        onLoginRegister={handleLoginForPaywall}
        isMandatory={showPaywall && !!(pageCurrentUser && pageUserProfile && !pageUserProfile.is_subscribed && ((pageUserProfile.interaction_count || 0) >= FREE_INTERACTION_LIMIT)) }
      />
      
      {/* Hero Section */}
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
        {isLoadingPageProfile && pageCurrentUser && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <p>Loading your profile...</p>
          </div>
        )}
        {!isLoadingPageProfile && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <ProblemGenerator
                  onGenerate={handleGenerateProblem}
                  isLoading={isLoadingProblem || (!!pageCurrentUser && isLoadingPageProfile)}
                  defaultTopic={currentTopic}
                  defaultProblemType={currentProblemType}
                  defaultDifficulty={currentDifficulty}
                />
                {currentProblem && (
                <>
                <div className="flex gap-2 mt-0"> 
                    <Button onClick={handleNewProblemSameTopic} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (!!pageCurrentUser && isLoadingPageProfile))}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Another (Same Topic)
                    </Button>
                    <Button onClick={handleStartNew} variant="outline" className="flex-1" disabled={!!(isLoadingProblem || (!!pageCurrentUser && isLoadingPageProfile))}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Start New Topic
                    </Button>
                </div>
                <ProblemDisplay
                    problem={currentProblem}
                    problemType={currentProblemType}
                    onSubmitAnswer={handleEvaluateAnswer}
                    onFeedbackSubmit={handleProblemFeedback} 
                    isLoading={!!(isLoadingEvaluation || (!!pageCurrentUser && isLoadingPageProfile))}
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
                  isLoading={!!(isLoadingDetails || (!!pageCurrentUser && isLoadingPageProfile))}
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

    
