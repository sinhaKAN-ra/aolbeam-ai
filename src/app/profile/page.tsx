// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { HistoryView } from '@/components/HistoryView';
import type { InteractionHistoryItem } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MathRenderer from '@/components/MathRenderer';

// Icons
import { 
  BarChart2, 
  BookOpen, 
  Clock, 
  Award,
  BarChart3, 
  History as HistoryIcon, 
  Lightbulb, 
  UserCircle, 
  Star, 
  MessageSquareText, 
  ListChecks, 
  Brain as ConceptualIcon, 
  Sigma as NumericalIcon, 
  GitFork as DiagramIcon, 
  Shuffle, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Settings
} from 'lucide-react';

// Types
import type { ProblemType, DifficultyLevel, UserProfile as AppUserProfile } from '@/types';

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

interface UserStats {
  totalProblems: number;
  correctAnswers: number;
  accuracy: number;
  avgTimePerProblem: number;
  topics: { name: string; count: number }[];
  recentHistory: DisplayHistoryItem[];
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
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [userHistory, setUserHistory] = useState<InteractionHistoryItem[]>([]);

  // Initialize Supabase client
  const supabase = useSupabase();
  
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) {
      // setIsLoading(false); // Let loadData handle initial non-user state
      return null; // Return null if no user
    }

    try {
      // setIsLoading(true); // Let loadData handle the overall loading state
      console.log('Fetching profile for user:', user.id);
      
      // First check if profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, create a new one
        if (profileError.code === 'PGRST116') {
          console.log('Creating new profile for user:', user.id);
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([
              { 
                id: user.id, 
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile as AppUserProfile); // Set profile here on successful creation
          return newProfile as AppUserProfile;
        }
        throw profileError;
      }
      
      setProfile(profileData as AppUserProfile); // Set profile here on successful fetch
      return profileData as AppUserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({ 
        variant: "destructive",
        title: "Profile Load Error",
        description: error instanceof Error ? error.message : "Failed to load or create user profile.",
      });
      // Do not re-throw, let loadData handle it
      return null; // Return null on error
    } finally {
      // setIsLoading(false); // Still let loadData manage this
    }
  }, [user, supabase, toast]);

  // Calculate statistics
  const calculateStats = useCallback((history: DisplayHistoryItem[]) => {
    const totalProblems = history.length;
    const correctAnswers = history.filter(item => item.evaluation?.isCorrect).length;
    const accuracy = totalProblems > 0 ? Math.round((correctAnswers / totalProblems) * 100) : 0;

    // Group by topic
    const topicMap = new Map<string, number>();
    history.forEach(item => {
      const topic = item.topic || 'General';
      topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
    });

    const topics = Array.from(topicMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const newStats: UserStats = {
      totalProblems,
      correctAnswers,
      accuracy,
      avgTimePerProblem: 0, // This would require tracking time spent
      topics,
      recentHistory: history
    };

    setStats(newStats);
    return newStats;
  }, []);

  // Fetch interaction history
  const fetchInteractionHistory = useCallback(async (): Promise<InteractionHistoryItem[]> => {
     if (!user?.id) return [];

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      
      const formattedHistory: InteractionHistoryItem[] = (historyData || []).map((item: FetchedInteraction) => ({
        id: item.id,
        timestamp: item.created_at,
        topic: item.topic || 'General',
        problemType: item.problem_type,
        difficulty: item.difficulty || 'medium',
        problem: {
          problemStatement: item.problem_statement,
          answerFormat: item.answer_format,
          multipleChoiceOptions: item.multiple_choice_options || undefined,
          correctAnswer: item.correct_answer,
        },
        userAnswer: item.user_answer || undefined,
        selectedOption: item.selected_option || undefined,
        evaluation: item.evaluation_is_correct !== null ? {
          isCorrect: item.evaluation_is_correct || false,
          feedback: item.evaluation_feedback || '',
          correctAnswer: item.correct_answer,
          explanation: ''
        } : undefined,
        isTopicRevised: item.is_topic_revised || false,
        topicDetails: item.topic_details_content || null,
        timeTakenSeconds: item.time_taken_seconds || undefined,
        actualProblemType: item.problem_type as any
      }));

      setUserHistory(formattedHistory); // Set history here on successful fetch
      return formattedHistory;
    } catch (error) {
      console.error('Error fetching interaction history:', error);
      toast({ 
        variant: "destructive",
        title: "History Load Error",
        description: error instanceof Error ? error.message : "Failed to load interaction history.",
      });
      // Do not re-throw, let loadData handle it
      return []; // Return empty array on error
    } finally {
      // setIsLoading(false); // Still let loadData manage this
    }
  }, [user, supabase, toast]);

  // Main effect to load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true); // Start loading
      try {
        if (!user) {
          // If no user, stop loading and redirect
          setIsLoading(false);
          router.push('/login?redirect=/profile');
          return;
        }
        
        // Fetch profile and history concurrently
        const profileResult = await fetchUserProfile();
        // Only fetch history if profile is successfully loaded/created
        const historyResult = profileResult ? await fetchInteractionHistory() : [];

        // States are set within the fetch functions now
        // setProfile(profileResult);
        // setUserHistory(historyResult || []);

        if (profileResult) {
           // Calculate stats only if profile and history are available
           const displayHistory = (historyResult || []).map((item: InteractionHistoryItem) => ({
            id: item.id.toString(), // Ensure id is string for DisplayHistoryItem
            timestamp: item.timestamp,
            topic: item.topic,
            problemType: item.problemType,
            difficulty: item.difficulty,
            problem: item.problem,
            userAnswer: item.userAnswer,
            selectedOption: item.selectedOption,
            evaluation: item.evaluation,
            isTopicRevised: item.isTopicRevised,
            topicDetails: item.topicDetails,
            timeTakenSeconds: item.timeTakenSeconds,
          }));
           calculateStats(displayHistory);
        } else {
          // If profile failed to load, reset stats
          setStats(null);
        }
        
      } catch (error) {
        console.error("Error loading profile page data:", error); // Errors are already toasted in fetch functions
      } finally {
        // Ensure loading is false after attempt, but only if profile state has been updated (or is null)
        // Adding a slight delay might help ensure state updates are processed
        setTimeout(() => {
            setIsLoading(false);
        }, 50); // Small delay
      }
    };

    if (!authLoading) { // Only load data once auth state is known
        loadData();
    } else {
        // If auth is loading, keep profile loading state true
        setIsLoading(true);
    }
  }, [user, authLoading, fetchUserProfile, fetchInteractionHistory, calculateStats, router]);

  if (authLoading || (isLoading && !isRefreshing)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-muted-foreground mb-4">You need to be signed in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" onClick={async () => {
          setIsRefreshing(true);
          try {
             const profileResult = await fetchUserProfile(); // Fetch profile
             if (profileResult) {
               // Only fetch history and calculate stats if profile is successful
               const historyResult = await fetchInteractionHistory();
                const displayHistory = (historyResult || []).map((item: InteractionHistoryItem) => ({
                  id: item.id.toString(),
                  timestamp: item.timestamp,
                  topic: item.topic,
                  problemType: item.problemType,
                  difficulty: item.difficulty,
                  problem: item.problem,
                  userAnswer: item.userAnswer,
                  selectedOption: item.selectedOption,
                  evaluation: item.evaluation,
                  isTopicRevised: item.isTopicRevised,
                  topicDetails: item.topicDetails,
                  timeTakenSeconds: item.timeTakenSeconds,
                }));
                calculateStats(displayHistory);
             } else {
               setStats(null);
             }
          } catch (error) {
            console.error("Error refreshing profile:", error); // Error toast already in fetch functions
          } finally {
            setIsRefreshing(false);
          }
        }} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      ) : !user ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
          <Button onClick={() => router.push('/login?redirect=/profile')}>Login / Sign Up</Button>
        </div>
      ) : (profile && stats) ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalProblems || 0}</div>
                  <p className="text-xs text-muted-foreground">Problems attempted</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.accuracy || 0}%</div>
                  <div className="mt-2">
                    <Progress value={stats?.accuracy} className="h-2" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.correctAnswers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.totalProblems ? 
                      `Out of ${stats.totalProblems} attempts` : 'No attempts yet'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Since</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {profile.created_at ? 
                      new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profile.created_at ? 
                      formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }) : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Topics</CardTitle>
                  <CardDescription>Your most practiced topics</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.topics?.length ? (
                    <div className="space-y-4">
                      {stats.topics.map((topic) => (
                        <div key={topic.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{topic.name}</span>
                            <span className="font-medium">{topic.count} problems</span>
                          </div>
                          <Progress 
                            value={(topic.count / (stats.totalProblems || 1)) * 100} 
                            className="h-2" 
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No topic data available yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent problem-solving activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats?.recentHistory?.length ? (
                    <div className="space-y-4">
                      {stats.recentHistory.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            item.evaluation?.isCorrect ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                          }`}>
                            {item.evaluation?.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  Problem History
                </CardTitle>
                <CardDescription>Your complete problem-solving history with detailed feedback</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <HistoryView history={userHistory} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Name</h3>
                  <p className="text-sm">{profile?.full_name || 'Not set'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Email</h3>
                  <p className="text-sm">{profile?.email || 'Not set'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Account Status</h3>
                  <div className="flex items-center">
                    <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                      profile?.is_subscribed ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm">
                      {profile?.is_subscribed ? 'Premium Account' : 'Free Account'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Interactions</h3>
                  <p className="text-sm">{profile?.interaction_count || 0} problems attempted</p>
                </div>
                {profile?.subscription_started_at && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Member Since</h3>
                    <p className="text-sm">
                      {new Date(profile.subscription_started_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
           <AlertCircle className="h-12 w-12 text-yellow-500 mb-4"/>
           <h2 className="text-2xl font-bold text-foreground mb-2">Could not load profile data</h2>
           <p className="text-muted-foreground mb-4">An unexpected error occurred while fetching your profile details. Please try reloading.</p>
           <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      )}
    </div>
  );
}

