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

  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    if (!supabase) {
      const error = new Error('Supabase client not available');
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please try again.'
      });
      setIsLoadingProfile(false);
      return;
    }
    
    try {
      // First, ensure the user_profiles table exists
      console.log('🔄 Verifying user_profiles table exists...');
      await verifyUserProfilesTable(supabase);
    } catch (error) {
      console.error('❌ Error verifying user_profiles table:', error);
      toast({
        variant: 'destructive',
        title: 'Database Error',
        description: 'Could not verify the user profiles table. Please contact support.'
      });
      setIsLoadingProfile(false);
      return;
    }
    
    console.log('Starting fetchAndSetUserProfile for user:', user.id, 'Email:', user.email);
    console.log('Supabase client available:', !!supabase);
    
    setIsLoadingProfile(true);
    
    try {
      console.log('Attempting to fetch profile from user_profiles table...');
      const { data, error, status } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile fetch response - Status:', status, 'Data:', data, 'Error:', error);

      if (error) {
        console.log('Profile fetch error:', error);
        console.log('Error code:', error.code, 'Details:', error.details, 'Hint:', error.hint, 'Message:', error.message);
        
        // If profile doesn't exist, create a new one
        if (error.code === 'PGRST116' || error.code === 'PGRST116') { 
          console.log('No profile found, creating new one...');
          
          const newProfile = {
            id: user.id, 
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
            interaction_count: 0, 
            is_subscribed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log('Attempting to create new profile with data:', newProfile);
          
          toast({ 
            variant: 'default', 
            title: 'Setting up your account...', 
            description: 'This might take a moment for new users.' 
          });
            // The trigger 'handle_new_user' should have created the profile.
            // We attempt a fetch again after a short delay, assuming the trigger might have a slight delay.
            await new Promise(resolve => setTimeout(resolve, 1500));
          
          try {
            console.log('Attempting to insert new profile into database...');
            const { data: newProfileData, error: retryError, status } = await supabase
              .from('user_profiles')
              .insert(newProfile)
              .select()
              .single();
            
            // console.log('Profile insert response - Status:', status, 'Data:', newProfileData, 'Error:', insertError);
              
            // console.log('Profile creation response:', { newProfileData, insertError });
            
            // if (insertError) {
            //   console.error('Error creating user profile - Code:', insertError.code, 'Message:', insertError.message);
            //   console.error('Error details:', insertError.details);
              
            //   // Try one more time with minimal data
            //   console.log('Retrying with minimal profile data...');
            //   const { data: retryData, error: retryError } = await supabase
            //     .from('user_profiles')
            //     .insert({
            //       id: user.id,
            //       email: user.email,
            //       full_name: 'New User',
            //       interaction_count: 0,
            //       is_subscribed: false
            //     })
            //     .select()
            //     .single();
                
            //   if (retryError) {
            //     console.error('Retry failed:', retryError);
            //     throw new Error('Failed to create profile after retry');
            //   }
              
            //   console.log('Profile created on retry:', retryData);
            //   setUserProfile(retryData as UserProfile);
            // } else 
            if (newProfileData) {
              console.log('New profile created successfully:', newProfileData);
              setUserProfile(newProfileData as UserProfile);
            }
          } catch (createError) {
            console.error('Unexpected error during profile creation:', createError);
            
            // Log the full error details
            if (createError instanceof Error) {
              console.error('Error details:', {
                name: createError.name,
                message: createError.message,
                stack: createError.stack,
                cause: createError.cause
              });
            }
            
            // Notify user about the issue
            toast({
              variant: 'destructive',
              title: 'Profile Creation Issue',
              description: 'Could not create your profile. Using a temporary profile instead.'
            });
            
            // Create a fallback profile in memory if database creation fails
            const fallbackProfile = {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
              interaction_count: 0,
              is_subscribed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_fallback: true // Mark as fallback profile
            };
            
            console.warn('Using fallback in-memory profile:', fallbackProfile);
            setUserProfile(fallbackProfile as UserProfile);
            
            // Ensure loading state is cleared even if something goes wrong
            setIsLoadingProfile(false);
          }
        } else {
          // Other database error
          console.error('Database error:', error);
          toast({ 
            variant: 'destructive', 
            title: 'Profile Error', 
            description: 'Could not load your profile. If this persists, please contact support.' 
          });
          setUserProfile(null);
        }
      } else if (data) {
        console.log('Existing profile loaded:', data);
        setUserProfile(data as UserProfile);
      }
    } catch (e) {
      console.error('Unexpected error in fetchAndSetUserProfile:', e);
      toast({ 
        variant: 'destructive', 
        title: 'Profile Error', 
        description: 'An unexpected error occurred while loading your profile.' 
      });
      setUserProfile(null);
    } finally {
      console.log('Finished loading profile, setting isLoadingProfile to false');
      setIsLoadingProfile(false);
    }
  }, [supabase, toast]);


  // Helper function to execute a promise with a timeout
  const withTimeout = <T,>(
    promise: () => Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`));
      }, timeoutMs);

      promise()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  };

  // Function to verify and create user_profiles table if needed
  const verifyUserProfilesTable = async (supabaseClient: SupabaseClient): Promise<boolean> => {
    try {
      console.log('🔍 Verifying user_profiles table exists...');
      
      // First, try to query the table with a simple select
      console.log('🔎 Attempting to query user_profiles table...');
      
      // Add a timeout to the query (30 seconds)
      const queryPromise = () => supabaseClient
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      const result = await withTimeout<{
        data: any[] | null;
        error: any;
        status: number;
        statusText: string;
      }>(
        async () => {
          try {
            console.log('🔍 Starting user_profiles table query...');
            const queryResult = await queryPromise();
            console.log('✅ Query completed successfully:', {
              status: queryResult.status,
              statusText: queryResult.statusText,
              hasError: !!queryResult.error,
              errorMessage: queryResult.error?.message
            });
            return {
              data: queryResult.data,
              error: queryResult.error,
              status: queryResult.status,
              statusText: queryResult.statusText
            };
          } catch (error) {
            console.error('❌ Error during query execution:', error);
            throw error;
          }
        },
        30000, // 30 second timeout
        'Query to user_profiles table timed out'
      );
      
      const { data: tableInfo, error: tableError, status, statusText } = result;
      
      console.log('📊 Query result:', { 
        status, 
        statusText, 
        hasError: !!tableError,
        errorMessage: tableError?.message
      });
      
      // If no error, table exists and is accessible
      if (!tableError) {
        console.log('✅ user_profiles table exists and is accessible');
        return true;
      }
      
      // Check if the error is because the table doesn't exist
      if (tableError.code === '42P01') { // Table doesn't exist
        console.log('🔄 user_profiles table not found, attempting to create it...');
        
        // Try to create the table using a raw SQL query through RPC
        console.log('🏗️ Attempting to create table via RPC...');
        try {
          const { data: createResult, error: createError } = await supabaseClient.rpc('create_user_profiles_table');
          
          if (!createError) {
            console.log('✅ Successfully created table via RPC');
            return true;
          }
          
          console.warn('⚠️ Failed to create user_profiles table via RPC, trying direct SQL...', createError);
          
          // If RPC fails, try a direct SQL query (this requires the service_role key)
          console.log('🔄 Attempting direct SQL approach...');
          try {
            // First, check if we can query the auth.users table (should be accessible)
            const { data: authUsers, error: authError } = await supabaseClient
              .from('auth.users')
              .select('id')
              .limit(1);
              
            console.log('🔐 Auth users query result:', { authUsers, authError });
            
            if (authError) {
              console.error('❌ Cannot query auth.users table:', authError);
              throw new Error(`Insufficient permissions to access auth.users: ${authError.message}`);
            }
            
            // Define SQL statements to execute in sequence with their descriptions
            const sqlStatements = [
              {
                sql: `CREATE TABLE IF NOT EXISTS public.user_profiles (
                  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                  email TEXT NOT NULL,
                  full_name TEXT,
                  interaction_count INTEGER DEFAULT 0,
                  is_subscribed BOOLEAN DEFAULT false,
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )`,
                description: 'Create user_profiles table'
              },
              {
                sql: 'ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY',
                description: 'Enable RLS on user_profiles'
              },
              {
                sql: 'DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles',
                description: 'Drop existing view policy'
              },
              {
                sql: `CREATE POLICY "Users can view their own profile" 
                  ON public.user_profiles FOR SELECT 
                  USING (auth.uid() = id)`,
                description: 'Create view policy'
              },
              {
                sql: 'DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles',
                description: 'Drop existing insert policy'
              },
              {
                sql: `CREATE POLICY "Users can insert their own profile"
                  ON public.user_profiles FOR INSERT
                  WITH CHECK (auth.uid() = id)`,
                description: 'Create insert policy'
              },
              {
                sql: 'DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles',
                description: 'Drop existing update policy'
              },
              {
                sql: `CREATE POLICY "Users can update their own profile"
                  ON public.user_profiles FOR UPDATE
                  USING (auth.uid() = id)`,
                description: 'Create update policy'
              }
            ];
            
            // Execute each statement one by one with timeout
            for (const { sql, description } of sqlStatements) {
              try {
                console.log(`🔄 Executing: ${description}`);
                console.debug('SQL:', sql);
                
                const rpcResult = await withTimeout<{ error: any } | null>(
                  async () => {
                    try {
                      const result = await supabaseClient.rpc('execute_sql', { query: sql });
                      return { error: result.error };
                    } catch (error) {
                      console.error('RPC call failed:', error);
                      return { error };
                    }
                  },
                  10000, // 10 second timeout per statement
                  `SQL execution timed out: ${description}`
                );
                
                const error = rpcResult?.error;
                if (error) {
                  console.error(`❌ Failed to execute SQL (${description}):`, error);
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  throw new Error(`Failed to ${description.toLowerCase()}: ${errorMessage}`);
                }
                
                console.log(`✅ Success: ${description}`);
                
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`❌ Error in ${description}:`, errorMessage);
                throw error; // Re-throw to be caught by the outer try-catch
              }
            }
            
            console.log('✅ Successfully created table via direct SQL');
            return true;
            
          } catch (sqlException: unknown) {
            const errorMessage = sqlException instanceof Error 
              ? sqlException.message 
              : 'Unknown SQL error during table creation';
            console.error('❌ Direct SQL approach failed:', errorMessage);
            throw new Error(`Direct SQL approach failed: ${errorMessage}`);
          }
          
        } catch (rpcException: unknown) {
          const errorMessage = rpcException instanceof Error 
            ? rpcException.message 
            : 'Unknown RPC error';
          console.error('❌ RPC call failed with exception:', errorMessage);
          throw new Error(`RPC call failed: ${errorMessage}`);
        }
      }
      
      // If we get here, there was an error that we don't know how to handle
      const errorMessage = tableError?.message || 'Unknown database error';
      console.error('❌ Error checking user_profiles table:', errorMessage);
      throw new Error(`Database error: ${errorMessage}`);
      
    } catch (error: unknown) {
      console.error('❌ Error in verifyUserProfilesTable:', error);
      
      // If all else fails, try one last approach - insert a dummy record
      try {
        if (!supabase) {
          throw new Error('Supabase client not available for fallback');
        }
        
        console.log('🔄 Trying fallback: inserting dummy record');
        const dummyId = '00000000-0000-0000-0000-000000000000';
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: dummyId,
            email: 'dummy@example.com',
            full_name: 'Dummy User',
            interaction_count: 0,
            is_subscribed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (!insertError) {
          // Clean up the dummy record
          await supabase
            .from('user_profiles')
            .delete()
            .eq('id', dummyId);
            
          console.log('✅ Successfully verified table access via dummy record');
          return true;
        }
        
        throw insertError || new Error('Failed to insert dummy record');
      } catch (fallbackError: unknown) {
        const errorMessage = fallbackError instanceof Error 
          ? fallbackError.message 
          : 'Unknown error during fallback table verification';
          
        console.error('❌ Fallback table verification failed:', errorMessage);
        throw new Error(`Could not verify table access: ${errorMessage}`);
      }
    }
  };

  // Initialize Supabase client and auth state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('Initializing Supabase client...');
    const client = createClientComponentClient();
    setSupabaseClient(client);

    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log('Auth state changed:', event, { user: session?.user });
      const user = session?.user ?? null;
      setCurrentUser(user);
      

      if (user) {
        console.log('User authenticated, fetching profile...');
        try {
          await fetchAndSetUserProfile(user);
        } catch (error) {
          console.error('Error in fetchAndSetUserProfile:', error);
          setIsLoadingProfile(false);
        }
      } else {
        console.log('No user, resetting profile state');
        setUserProfile(null);
        setIsLoadingProfile(false);
        // Restore guest history if available
        const guestHistoryRaw = localStorage.getItem('aolbeamHistory_guest');
        if (guestHistoryRaw) {
          try {
            const parsedGuestHistory = JSON.parse(guestHistoryRaw);
            setHistory(parsedGuestHistory);
          } catch (e) { 
            console.error("Error parsing guest history:", e); 
          }
        }
      }
    };

    const { data: { subscription } } = client.auth.onAuthStateChange(handleAuthChange);

    // Initial session check
    const checkUser = async () => {
      try {
        console.log('Checking for existing session...');
        const { data: { session }, error } = await client.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoadingProfile(false);
          return;
        }
        
        const user = session?.user ?? null;
        console.log('Initial session check - user:', user?.email);
        
        if (user) {
          await fetchAndSetUserProfile(user);
        } else {
          console.log('No active session found');
          setIsLoadingProfile(false);
        }
      } catch (error) {
        console.error('Error in checkUser:', error);
        setIsLoadingProfile(false);
      }
    };

    checkUser();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription?.unsubscribe();
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

  // Debug effect to log profile state changes
  useEffect(() => {
    console.log('Profile state updated - isLoadingProfile:', isLoadingProfile, 'currentUser:', !!currentUser, 'userProfile:', userProfile);
  }, [isLoadingProfile, currentUser, userProfile]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up AOLBEAMPage component');
    };
  }, []);

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
                  isLoading={isLoadingProblem}
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

    