
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import type { User, Session } from '@supabase/supabase-js';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import MathRenderer from '@/components/MathRenderer';
import type { ProblemType, DifficultyLevel, UserProfile as AppUserProfile } from '@/types'; 
// Footer is now global
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Icons
import { BarChart3, History, Lightbulb, UserCircle, Settings, Star, MessageSquareText, ListChecks, CheckCircle, XCircle, TimerIcon as TimerHistoryIcon, Brain as ConceptualIcon, Sigma as NumericalIcon, GitFork as DiagramIcon, Shuffle } from 'lucide-react';

interface FetchedInteraction {
  id: string;
  created_at: string;
  topic: string;
  problem_type: ProblemType; 
  difficulty?: string | null; 
  problem_statement: string;
  answer_format: string;
  multiple_choice_options?: string[] | null;
  correct_answer: string;
  user_answer?: string | null;
  selected_option?: string | null;
  evaluation_is_correct?: boolean | null;
  evaluation_feedback?: string | null;
  is_topic_revised?: boolean | null;
  topic_details_content?: string | null;
  time_taken_seconds?: number | null;
}

interface DisplayHistoryItem {
  id: string;
  timestamp: string;
  topic: string;
  problemType: ProblemType; 
  difficulty?: DifficultyLevel | string | null; 
  problem: {
    problemStatement: string;
    answerFormat: string;
    multipleChoiceOptions?: string[];
    correctAnswer: string;
  };
  userAnswer?: string;
  selectedOption?: string;
  evaluation?: {
    isCorrect: boolean;
    feedback: string;
  };
  isTopicRevised?: boolean;
  topicDetails?: string | null;
  timeTakenSeconds?: number | null;
}

const formatTimeTakenForDisplay = (totalSeconds?: number | null): string | null => {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
    return null;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const problemTypeIcons: Record<ProblemType, React.ElementType> = {
  theory: MessageSquareText,
  practical: ListChecks,
  conceptual: ConceptualIcon,
  numerical: NumericalIcon,
  diagram_based: DiagramIcon,
  random: Shuffle, 
};


// This is a Client Component that will handle the authenticated session
export default function ProfilePage() {
  // All hooks must be called at the top level
  const router = useRouter();
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authSubscription, setAuthSubscription] = useState<{ unsubscribe: () => void } | null>(null);
  const [userProfileData, setUserProfileData] = useState<AppUserProfile | null>(null);
  const [userHistory, setUserHistory] = useState<DisplayHistoryItem[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // First effect: Handle authentication
  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          // Try to get the current user directly
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            router.push('/');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/');
      } finally {
        setLoading(false);
        setAuthChecked(true);
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in profile:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/');
      }
    });
    
    // Store the subscription for cleanup
    setAuthSubscription(subscription);

    // Initial session check
    checkSession();

    // Cleanup subscription
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [router, supabase.auth, authSubscription]); // Added authSubscription

  // Second effect: Load profile data when user is available
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      setProfileLoading(true);
      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setUserProfileData(profile as AppUserProfile);

        // Fetch user interactions
        const { data: interactions, error: historyError } = await supabase
          .from('user_interactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        if (interactions) {
          const formattedInteractions = interactions.map((item: FetchedInteraction): DisplayHistoryItem => ({
            id: item.id,
            timestamp: item.created_at,
            topic: item.topic,
            problemType: item.problem_type,
            difficulty: item.difficulty as DifficultyLevel | null,
            problem: {
              problemStatement: item.problem_statement,
              answerFormat: item.answer_format,
              multipleChoiceOptions: item.multiple_choice_options || undefined,
              correctAnswer: item.correct_answer,
            },
            userAnswer: item.user_answer || undefined,
            selectedOption: item.selected_option || undefined,
            evaluation: (item.evaluation_is_correct !== null && 
                       item.evaluation_is_correct !== undefined && 
                       item.evaluation_feedback)
              ? { 
                  isCorrect: item.evaluation_is_correct, 
                  feedback: item.evaluation_feedback 
                }
              : undefined,
            isTopicRevised: item.is_topic_revised || false,
            topicDetails: item.topic_details_content || null,
            timeTakenSeconds: item.time_taken_seconds,
          }));
          
          setUserHistory(formattedInteractions);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfileData();
  }, [user, supabase]);

  // Show loading state while checking auth
  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no user after auth check, show unauthorized (will be redirected by effect)
  if (!user) {
    return null;
  }

  const overallAccuracy = userHistory.length > 0 && userHistory.filter(item => item.evaluation).length > 0
    ? userHistory.filter(item => item.evaluation).reduce((acc, item) => acc + (item.evaluation?.isCorrect ? 1 : 0), 0) / userHistory.filter(item => item.evaluation).length
    : 0;
  const totalQuestionsAttempted = userHistory.length;
  
  const uniqueTopicsPracticedCount = new Set(userHistory.map(item => item.topic)).size;

  const averageQuestionsPerTopic = uniqueTopicsPracticedCount > 0 ? Math.round(totalQuestionsAttempted / uniqueTopicsPracticedCount) : 0;
  

  const strengths = userHistory
    .filter(item => item.evaluation?.isCorrect)
    .reduce((acc, item) => {
      if (!acc.find(t => t.name === item.topic)) {
        const topicItems = userHistory.filter(h => h.topic === item.topic && h.evaluation);
        const correctCount = topicItems.filter(t => t.evaluation?.isCorrect).length;
        const accuracy = topicItems.length > 0 ? correctCount / topicItems.length : 0;
        if (accuracy >= 0.85) { 
          acc.push({ name: item.topic, accuracy });
        }
      }
      return acc;
    }, [] as { name: string; accuracy: number }[])
    .slice(0, 3); 


  const focusAreas = userHistory
    .filter(item => item.evaluation && !item.evaluation.isCorrect)
    .reduce((acc, item) => {
      if (!acc.find(t => t.name === item.topic)) {
        const topicItems = userHistory.filter(h => h.topic === item.topic && h.evaluation);
        const correctCount = topicItems.filter(t => t.evaluation?.isCorrect).length;
        const accuracy = topicItems.length > 0 ? correctCount / topicItems.length : 0;
         const lastPracticed = new Date(topicItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp).toLocaleDateString();
        if (accuracy < 0.70) { 
          acc.push({ name: item.topic, accuracy, lastPracticed, problemType: item.problemType, difficulty: item.difficulty });
        }
      }
      return acc;
    }, [] as { name: string; accuracy: number, lastPracticed: string, problemType: ProblemType, difficulty?: DifficultyLevel | string | null }[])
    .slice(0, 3); 


  return (
    <>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card className="mb-8 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-card to-card p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary shadow-md">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={userProfileData?.full_name || user.email || 'User Avatar'} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {userProfileData?.full_name ? userProfileData.full_name.charAt(0).toUpperCase() : 
                 (user.email ? user.email.charAt(0).toUpperCase() : <UserCircle size={48} />)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-primary">
                Welcome, {userProfileData?.full_name || user.email?.split('@')[0] || 'AOLBEAM Learner'}!
              </CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1">
                This is your personal learning dashboard. Track your progress and conquer your exams.
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-2">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
              {userProfileData?.is_subscribed && userProfileData.subscription_plan_id && (
                <Badge variant="secondary" className="mt-2">Plan: {userProfileData.subscription_plan_id.charAt(0).toUpperCase() + userProfileData.subscription_plan_id.slice(1)}</Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg gap-2">
                <BarChart3 className="text-primary" /> Overall Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {totalQuestionsAttempted > 0 && userHistory.filter(item => item.evaluation).length > 0 ? (
                <>
                  <p className="text-5xl font-bold text-primary mb-1">
                    {Math.round(overallAccuracy * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Based on {uniqueTopicsPracticedCount} topic(s)
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground py-4">Start practicing to see your stats!</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg gap-2">
                <History className="text-accent" /> Questions Attempted
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
               <p className="text-5xl font-bold text-accent mb-1">
                {totalQuestionsAttempted}
              </p>
              <p className="text-sm text-muted-foreground">
                Avg. {averageQuestionsPerTopic} per topic
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-lg gap-2">
                <Star className="text-yellow-500" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
               {strengths.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {strengths.map(topic => (
                    <li key={topic.name} className="text-muted-foreground flex items-center">
                       <Star size={14} className="text-yellow-500 mr-2"/> {topic.name} ({Math.round(topic.accuracy*100)}%)
                    </li>
                  ))}
                </ul>
              ) : (
                 <p className="text-muted-foreground text-sm">Keep practicing to identify strengths!</p>
              )}
            </CardContent>
          </Card>
        </div>
        
         <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="text-orange-500" /> Focus Areas
              </CardTitle>
              <CardDescription>Topics where you might want to spend a bit more time.</CardDescription>
            </CardHeader>
            <CardContent>
              {focusAreas.length > 0 ? (
                <ul className="space-y-2">
                  {focusAreas.map(topic => (
                    <li key={topic.name} className="p-3 bg-muted/30 rounded-md">
                      <span className="font-semibold text-foreground">{topic.name}</span>
                      <p className="text-xs text-muted-foreground">Current Accuracy: {Math.round(topic.accuracy*100)}% - Last practiced: {topic.lastPracticed}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                 <p className="text-muted-foreground">No specific focus areas identified, or you're doing great! Practice more topics to get detailed insights.</p>
              )}
            </CardContent>
          </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="text-primary" /> Recent History
            </CardTitle>
            <CardDescription>
              Review your past practice sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Your practice history will appear here once you start solving problems.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {userHistory.map((item) => {
                  const ProblemIcon = problemTypeIcons[item.problemType] || MessageSquareText;
                  return (
                    <AccordionItem value={item.id} key={item.id} className="bg-card border rounded-md shadow-sm">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                         <div className="flex justify-between items-center w-full gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-grow text-left">
                            <ProblemIcon className="w-5 h-5 text-primary flex-shrink-0" />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
                              <span className="font-medium truncate">{item.topic}</span>
                              <div className="flex gap-1 text-xs">
                                  <Badge variant="outline" className="hidden sm:inline-flex">{item.problemType}</Badge>
                                  <Badge variant="outline">{item.difficulty || 'N/A'}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.evaluation && (
                              <Badge variant={item.evaluation.isCorrect ? "default" : "destructive"} className={`${item.evaluation.isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                                {item.evaluation.isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                                <span className="ml-1">{item.evaluation.isCorrect ? 'Correct' : 'Incorrect'}</span>
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3 pt-1 text-sm">
                        <div className="space-y-3 prose prose-sm dark:prose-invert max-w-none">
                          <div>
                            <strong className="block text-muted-foreground mb-1">Problem:</strong>
                            <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.problemStatement} /></div>
                          </div>
                          {item.userAnswer && !item.selectedOption && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Your Answer:</strong>
                              <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.userAnswer} /></div>
                            </div>
                          )}
                          {item.problem.multipleChoiceOptions && item.problem.multipleChoiceOptions.length > 0 && item.selectedOption && (
                            <>
                              <div>
                                <strong className="block text-muted-foreground mb-1">Your Choice:</strong>
                                <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.selectedOption} /></div>
                              </div>
                              <div>
                                <strong className="block text-muted-foreground mt-2 mb-1">Correct Answer:</strong>
                                <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.correctAnswer} /></div>
                              </div>
                            </>
                          )}
                          {!(item.problem.multipleChoiceOptions && item.problem.multipleChoiceOptions.length > 0) && item.evaluation && ( 
                            <div>
                              <strong className="block text-muted-foreground mt-2 mb-1">Model Answer / Key Points:</strong>
                              <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.problem.correctAnswer} /></div>
                            </div>
                          )}
                          {item.evaluation?.feedback && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Feedback:</strong>
                              <div className="p-2 rounded bg-muted/30"><MathRenderer content={item.evaluation.feedback} /></div>
                            </div>
                          )}
                          {item.timeTakenSeconds !== null && item.timeTakenSeconds !== undefined && item.timeTakenSeconds >= 0 && (
                            <div>
                              <strong className="block text-muted-foreground mb-1 flex items-center gap-1">
                                <TimerHistoryIcon size={14} /> Time Taken:
                              </strong>
                              <p className="p-2 rounded bg-muted/30">{formatTimeTakenForDisplay(item.timeTakenSeconds)}</p>
                            </div>
                          )}
                          {item.isTopicRevised && item.topicDetails && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Revised Details:</strong>
                              <div className="p-2 rounded bg-muted/30 max-h-32 overflow-y-auto"><MathRenderer content={item.topicDetails} /></div>
                            </div>
                          )}
                          {!item.evaluation && (
                            <p className="text-muted-foreground italic">This problem was generated but not answered.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
