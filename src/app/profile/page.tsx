// src/app/profile/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase, useSession } from '@/hooks/useSupabase';
import type { User, Session } from '@supabase/supabase-js';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import MathRenderer from '@/components/MathRenderer';
import type { ProblemType, DifficultyLevel, UserProfile as AppUserProfile } from '@/types'; // Ensure this matches your actual types file
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Icons
import { BarChart3, History, Lightbulb, UserCircle, Star, MessageSquareText, ListChecks, CheckCircle, XCircle, TimerIcon as TimerHistoryIcon, Brain as ConceptualIcon, Sigma as NumericalIcon, GitFork as DiagramIcon, Shuffle } from 'lucide-react';
// Removed unused Settings icon

interface FetchedInteraction {
  id: string;
  created_at: string;
  topic: string;
  problem_type: ProblemType;
  difficulty?: DifficultyLevel | null;
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
  difficulty?: DifficultyLevel | null;
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


export default function ProfilePage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { session, loading: authLoading } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [userProfileData, setUserProfileData] = useState<AppUserProfile | null>(null);
  const [userHistory, setUserHistory] = useState<DisplayHistoryItem[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // Handle auth state changes
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    } else if (!authLoading) {
      // Only redirect if we're not still loading the session
      router.push('/');
    }
  }, [session, authLoading, router]);

  // Load profile data when user is available
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      setProfileLoading(true);
      try {
        // Fetch user profile and interactions in parallel
        const [
          { data: profile, error: profileError },
          { data: interactions, error: historyError }
        ] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_interactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // If profile doesn't exist, it might be PGRST116, handle if necessary,
        // but trigger should create it.
        setUserProfileData(null);
      } else {
        setUserProfileData(profile as AppUserProfile);
      }
      // historyError is checked below

      if (historyError) {
          console.error('Error fetching user history:', historyError);
          setUserHistory([]); // Set to empty array on error
      } else if (interactions) {
          const formattedInteractions = interactions.map((item: FetchedInteraction): DisplayHistoryItem => ({
            id: item.id,
            timestamp: item.created_at,
            topic: item.topic,
            problemType: item.problem_type, // This will be the resolved type from DB
            difficulty: item.difficulty || null, // Ensure it's null if undefined
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
        } else {
            setUserHistory([]); // Set to empty if interactions are null/undefined
        }

      } catch (error) { // Catch any unexpected error from Promise.all or mapping
        console.error('Error in fetchProfileData:', error);
        setUserProfileData(null);
        setUserHistory([]);
      } finally {
        setProfileLoading(false);
      }
    };

    if (user) { // Only fetch if user is set
        fetchProfileData();
    } else if (!authLoading) { // If no user and auth is not loading, set profile loading to false
        setProfileLoading(false);
    }
  }, [user, supabase, authLoading]); 

  // Show loading state while checking auth or fetching profile
  if (authLoading || profileLoading) { // Combined loading states
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no user after loading (e.g., redirect might not have happened yet or failed silently)
  if (!user) {
    // This case should ideally be handled by the redirect in the first useEffect,
    // but as a fallback:
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Please log in to view your profile.</p>
        </div>
    );
  }
  
  const evaluatedHistory = userHistory.filter(item => item.evaluation);
  const correctAnswersCount = evaluatedHistory.filter(item => item.evaluation?.isCorrect).length;
  const overallAccuracy = evaluatedHistory.length > 0 ? (correctAnswersCount / evaluatedHistory.length) : 0;
  
  const totalQuestionsAttempted = userHistory.length;
  const uniqueTopics = [...new Set(userHistory.map(item => item.topic))];
  const uniqueTopicsPracticedCount = uniqueTopics.length;
  const averageQuestionsPerTopic = uniqueTopicsPracticedCount > 0 ? Math.round(totalQuestionsAttempted / uniqueTopicsPracticedCount) : 0;

  const topicStats = uniqueTopics.map(topic => {
    const topicItems = userHistory.filter(item => item.topic === topic && item.evaluation);
    const topicCorrectCount = topicItems.filter(item => item.evaluation?.isCorrect).length;
    const topicAccuracy = topicItems.length > 0 ? topicCorrectCount / topicItems.length : 0;
    const lastPracticedItem = userHistory
      .filter(item => item.topic === topic)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return {
      name: topic,
      accuracy: topicAccuracy,
      count: topicItems.length, 
      lastPracticed: lastPracticedItem ? new Date(lastPracticedItem.timestamp).toLocaleDateString() : 'N/A',
      problemType: lastPracticedItem?.problemType || 'random', 
      difficulty: lastPracticedItem?.difficulty || 'medium', 
    };
  });

  const strengths = topicStats
    .filter(topic => topic.accuracy >= 0.80 && topic.count > 0)
    .sort((a, b) => b.accuracy - a.accuracy || b.count - a.count)
    .slice(0, 3);

  const focusAreas = topicStats
    .filter(topic => topic.accuracy < 0.70 && topic.count > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.count - a.count)
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

        {profileLoading && !userHistory.length ? ( 
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading your stats and history...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg gap-2">
                    <BarChart3 className="text-primary" /> Overall Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  {evaluatedHistory.length > 0 ? (
                    <>
                      <p className="text-5xl font-bold text-primary mb-1">
                        {Math.round(overallAccuracy * 100)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Based on {evaluatedHistory.length} evaluated question(s)
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
                    Across {uniqueTopicsPracticedCount} topic(s)
                  </p>
                   <p className="text-xs text-muted-foreground">
                    Avg. {averageQuestionsPerTopic} per topic
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg gap-2">
                    <Star className="text-yellow-500" /> Strengths
                  </CardTitle>
                  <CardDescription className="text-xs">Top topics with &gt;=80% accuracy.</CardDescription>
                </CardHeader>
                <CardContent>
                  {strengths.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {strengths.map(topic => (
                        <li key={topic.name} className="text-muted-foreground flex items-center">
                          <Star size={14} className="text-yellow-500 mr-2 flex-shrink-0"/> 
                          <span className="truncate" title={topic.name}>{topic.name}</span> ({Math.round(topic.accuracy*100)}%)
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
                <CardDescription>Topics with &lt;70% accuracy. Review these for improvement!</CardDescription>
              </CardHeader>
              <CardContent>
                {focusAreas.length > 0 ? (
                  <ul className="space-y-2">
                    {focusAreas.map(topic => (
                      <li key={topic.name} className="p-3 bg-muted/30 rounded-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-semibold text-foreground">{topic.name}</span>
                                <p className="text-xs text-muted-foreground">
                                Current Accuracy: {Math.round(topic.accuracy*100)}% ({topic.count} attempts) - Last practiced: {topic.lastPracticed}
                                </p>
                            </div>
                             {/* <Button variant="link" size="sm" asChild>
                                <Link href={`/?topic=${encodeURIComponent(topic.name)}&type=${topic.problemType || 'random'}&difficulty=${topic.difficulty || 'medium'}`}>Practice {topic.name} &rarr;</Link>
                            </Button> */}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No specific focus areas identified yet, or you're doing great! Practice more to get detailed insights.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

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
            {profileLoading && !userHistory.length ? ( 
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <p className="ml-2 text-muted-foreground">Loading history...</p>
              </div>
            ) : userHistory.length === 0 ? (
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
                              <span className="font-medium truncate" title={item.topic}>{item.topic}</span>
                              <div className="flex gap-1 text-xs">
                                  <Badge variant="outline" className="capitalize">{item.problemType.replace('_based', '-based')}</Badge>
                                  <Badge variant="outline" className="capitalize">{item.difficulty || 'N/A'}</Badge>
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
                          {/* Model answer for non-MCQ if evaluated */}
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
                          {(item.timeTakenSeconds !== null && item.timeTakenSeconds !== undefined && item.timeTakenSeconds >= 0) && (
                            <div>
                              <strong className="block text-muted-foreground mb-1 flex items-center gap-1">
                                <TimerHistoryIcon size={14} /> Time Taken:
                              </strong>
                              <p className="p-2 rounded bg-muted/30">{formatTimeTakenForDisplay(item.timeTakenSeconds)}</p>
                            </div>
                          )}
                          {item.isTopicRevised && item.topicDetails && (
                            <div>
                              <strong className="block text-muted-foreground mb-1">Problem Insights Fetched:</strong>
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

