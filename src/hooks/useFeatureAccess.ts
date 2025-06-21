import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSupabase } from './useSupabase';
import { SubscriptionPlan } from '@/types';
import { plans } from '@/app/pricing/page';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Define the structure of the usage data from the API
type UsageData = {
  user_id: string;
  plan_id: string;
  chat_interactions_today: number;
  chat_limit: number;
  tests_created: number;
  test_creation_limit: number;
  remaining_chats: number;
  remaining_tests: number;
  updated_at: string;
};

// Extended subscription plan with usage data
export interface ExtendedSubscriptionPlan extends Omit<SubscriptionPlan, 'usage'> {
  usage: {
    chat: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    test_creation: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
  };
  updated_at: string;
}

// Define feature types
export type FeatureName = 'chat' | 'test_creation' | 'advanced_analytics' | 'test_sharing' | 'ai_generation';

// Define feature limits based on plan ID
type FeatureLimits = {
  [key in FeatureName]: {
    [planId: string]: number | boolean;
  };
};

// Define the limits for each feature by plan
const featureLimits: FeatureLimits = {
  chat: {
    free: 15, // 15 messages/day for free users
    weekly: 50,
    monthly: 100,
    quarterly: 200,
  },
  test_creation: {
    free: 5, // 5 tests total for free users
    weekly: 10,
    monthly: 20,
    quarterly: 30,
  },
  advanced_analytics: {
    free: false,
    weekly: true,
    monthly: true,
    quarterly: true,
  },
  test_sharing: {
    free: false,
    weekly: true,
    monthly: true,
    quarterly: true,
  },
  ai_generation: {
    free: false,
    weekly: true,
    monthly: true,
    quarterly: true,
  },
};

// Usage stats for a specific feature
type FeatureUsage = {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}


// Helper function to fetch usage data
const fetchUsage = async (): Promise<UsageData> => {
  const supabase = createSupabaseBrowserClient();
  const { user } = useAuth(); // Get user from AuthContext

  if (!user) {
    throw new Error('User not authenticated.');
  }

  // Fetch all user interactions
  const { data: interactions, error } = await supabase
    .from('user_interactions')
    .select('interaction_type, created_at')
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to fetch user interactions: ${error.message}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let chatInteractionsToday = 0;
  let testsCreated = 0;

  interactions.forEach(interaction => {
    if (interaction.interaction_type === 'chat') {
      const interactionDate = new Date(interaction.created_at);
      interactionDate.setHours(0, 0, 0, 0);
      if (interactionDate.getTime() === today.getTime()) {
        chatInteractionsToday++;
      }
    }
    if (interaction.interaction_type === 'test_creation') {
      testsCreated++;
    }
  });

  // Determine the user's current plan (assuming 'free' if not subscribed or plan not found)
  const userProfile = await supabase.from('user_profiles').select('is_subscribed, subscription_plan').eq('id', user.id).single();
  const currentPlanId = userProfile.data?.is_subscribed ? userProfile.data.subscription_plan : 'free';
  const currentPlan = plans.find(p => p.id === currentPlanId) || plans.find(p => p.id === 'free');

  const chatLimit = currentPlan?.chat_limit || 0;
  const testCreationLimit = currentPlan?.test_creation_limit || 0;

  return {
    user_id: user.id,
    plan_id: currentPlan?.id || 'free',
    chat_interactions_today: chatInteractionsToday,
    chat_limit: chatLimit,
    tests_created: testsCreated,
    test_creation_limit: testCreationLimit,
    remaining_chats: Math.max(0, chatLimit - chatInteractionsToday),
    remaining_tests: Math.max(0, testCreationLimit - testsCreated),
    updated_at: new Date().toISOString(),
  };
};

export function useFeatureAccess() {
  const [currentPlan, setCurrentPlan] = useState<ExtendedSubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabase();

  // Fetch usage data using React Query
  const { data: usage, refetch: refetchUsage } = useQuery<UsageData>({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    enabled: false, // We'll manually trigger this when needed
  });

  // Mutation to record feature usage
  const recordUsage = useMutation({
    mutationFn: async (feature: 'chat' | 'test_creation') => {
      const response = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const error = new Error(data.error || 'Failed to record usage');
        (error as any).code = data.code;
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch usage data after recording
      refetchUsage();
    },
  });
  
  // Record feature usage with better error handling
  // const recordFeatureUsage = useCallback(async (feature: FeatureName): Promise<boolean> => {
  //   try {
  //     if (feature !== 'chat' && feature !== 'test_creation') {
  //       console.warn(`Usage tracking not implemented for feature: ${feature}`);
  //       return true; // Allow features that don't have usage tracking yet
  //     }
      
  //     await recordUsage.mutateAsync(feature);
  //     return true;
  //   } catch (error) {
  //     console.error('Error recording feature usage:', error);
      
  //     // If this is a test limit reached error, rethrow it
  //     if ((error as any)?.code === 'TEST_LIMIT_REACHED') {
  //       throw error;
  //     }
      
  //     // For other errors, log but don't block the user
  //     return false;
  //   }
  // }, [recordUsage]);

  // Load user's subscription and usage data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get user's subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Update state with subscription
        if (subscription) {
          const planDetails = plans.find(p => p.id === subscription.plan_id) || {
            id: 'free',
            name: 'Free',
            price: '0',
            currency: 'INR',
            order: 0,
            features: [],
            type: 'free' as const,
          };
          
          setCurrentPlan({
            ...planDetails,
            usage: {
              chat: { used: 0, limit: 15, remaining: 15, percentage: 0 },
              test_creation: { used: 0, limit: 5, remaining: 5, percentage: 0 },
            },
            updated_at: new Date().toISOString(),
          });
        } else {
          // Default to free plan if no subscription found
          setCurrentPlan({
            id: 'free',
            name: 'Free',
            price: '0',
            currency: 'INR',
            order: 0,
            features: [],
            type: 'free',
            usage: {
              chat: { used: 0, limit: 15, remaining: 15, percentage: 0 },
              test_creation: { used: 0, limit: 5, remaining: 5, percentage: 0 },
            },
            updated_at: new Date().toISOString(),
          });
        }

        // Fetch usage data
        await refetchUsage();
      } catch (error) {
        console.error('Error loading feature access data:', error);
        setError(error instanceof Error ? error : new Error('Failed to load feature access data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [supabase, refetchUsage]);

  // Update current plan with usage data when it changes
  useEffect(() => {
    if (usage && currentPlan) {
      setCurrentPlan({
        ...currentPlan,
        usage: {
          chat: {
            used: usage.chat_interactions_today,
            limit: usage.chat_limit,
            remaining: usage.remaining_chats,
            percentage: Math.round((usage.chat_interactions_today / (usage.chat_limit || 1)) * 100)
          },
          test_creation: {
            used: usage.tests_created,
            limit: usage.test_creation_limit,
            remaining: usage.remaining_tests,
            percentage: Math.round((usage.tests_created / (usage.test_creation_limit || 1)) * 100)
          }
        },
        updated_at: usage.updated_at
      });
    }
  }, [usage]);

  // Define the return type for canUseFeature
  type FeatureAccessResult = {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    limit?: number;
    percentage?: number;
  };

  // Check if a feature is available for the current user's plan
  const canUseFeature = (feature: FeatureName): FeatureAccessResult => {
    // If user is not loaded yet, assume not allowed until we know for sure
    if (isLoading) return { 
      allowed: false, 
      reason: 'Loading user data...' 
    };
    
    const planId = currentPlan?.id || 'free';
    const featureLimit = featureLimits[feature][planId];

    // For boolean features (like advanced_analytics, test_sharing, ai_generation)
    if (typeof featureLimit === 'boolean') {
      return { 
        allowed: featureLimit,
        reason: featureLimit ? undefined : 'This feature requires a paid plan.'
      };
    }

    // For numeric features (like chat, test_creation)
    if (typeof featureLimit === 'number' && usage) {
      const usageCount = feature === 'chat' ? usage.chat_interactions_today : usage.tests_created;
      const remaining = Math.max(0, featureLimit - usageCount);
      
      const percentage = Math.min(Math.round((usageCount / featureLimit) * 100), 100);
      
      return {
        allowed: remaining > 0,
        remaining,
        limit: featureLimit,
        reason: remaining > 0 
          ? undefined 
          : `You've reached your limit of ${featureLimit} ${feature === 'chat' ? 'chat interactions' : 'tests'} for your plan.`,
        percentage,
      };
    }

    // Default to not allowed if feature/plan combination is not found
    return { 
      allowed: false, 
      reason: 'Feature not available with your current plan.' 
    };
  };

  // Record usage of a feature
  const recordFeatureUsage = useCallback(async (feature: FeatureName): Promise<boolean> => {
    try {
      if (feature !== 'chat' && feature !== 'test_creation') {
        console.warn(`Cannot record usage for feature: ${feature}`);
        return false;
      }
      
      // Record the usage via the API
      await recordUsage.mutateAsync(feature);
      return true;
    } catch (error) {
      console.error('Error recording feature usage:', error);
      return false;
    }
  }, [recordUsage]);
  
  // Get the current user's plan ID
  const getCurrentPlanId = useCallback((): string => {
    return currentPlan?.id || 'free';
  }, [currentPlan]);

  // Get usage statistics for a feature
  const getUsageStats = useCallback((feature: FeatureName) => {
    const defaultStats = { 
      used: 0, 
      limit: 0,
      remaining: 0,
      percentage: 0,
      isNearLimit: false,
      isLimitReached: false,
    };

    if (isLoading || !usage) {
      return defaultStats;
    }
    
    const planId = getCurrentPlanId();
    
    // Handle features with usage tracking (chat, test_creation)
    if (feature === 'chat' || feature === 'test_creation') {
      const featureData = {
        chat: {
          used: usage.chat_interactions_today,
          limit: usage.chat_limit,
          remaining: usage.remaining_chats
        },
        test_creation: {
          used: usage.tests_created,
          limit: usage.test_creation_limit,
          remaining: usage.remaining_tests
        },
      }[feature];
      
      if (!featureData) return defaultStats;
      
      const remaining = featureData.remaining;
      const percentage = Math.min(Math.round((featureData.used / (featureData.limit || 1)) * 100), 100);
      
      return {
        used: featureData.used,
        limit: featureData.limit,
        remaining,
        percentage,
        isNearLimit: percentage >= 80 && percentage < 100,
        isLimitReached: percentage >= 100,
      };
    }
    
    // Handle boolean features (advanced_analytics, ai_generation, test_sharing)
    const isAllowed = !!featureLimits[feature][planId];
    
    return {
      ...defaultStats,
      allowed: isAllowed,
      isLimitReached: !isAllowed,
      reason: isAllowed ? undefined : 'This feature requires a paid plan.'
    };
  }, [isLoading, usage, getCurrentPlanId]);

  // Memoize the return value to prevent unnecessary re-renders
  const result = useMemo(() => ({
    currentPlan,
    usage: usage ? {
      user_id: usage.user_id,
      plan_id: usage.plan_id,
      chat_interactions_today: usage.chat_interactions_today,
      chat_limit: usage.chat_limit,
      tests_created: usage.tests_created,
      test_creation_limit: usage.test_creation_limit,
      remaining_chats: usage.remaining_chats,
      remaining_tests: usage.remaining_tests,
      updated_at: usage.updated_at
    } : null,
    isLoading: isLoading || recordUsage.isPending,
    error,
    canUseFeature,
    recordFeatureUsage,
    getCurrentPlanId,
    getUsageStats,
  }), [
    currentPlan, 
    usage, 
    isLoading, 
    recordUsage.isPending, 
    error, 
    canUseFeature, 
    recordFeatureUsage, 
    getCurrentPlanId,
    getUsageStats
  ]);

  return result;
};

// Helper hook for checking specific feature access
export function useCanUseFeature(feature: FeatureName) {
  const { canUseFeature } = useFeatureAccess();
  return canUseFeature(feature);
}

// Helper hook for getting subscription status
export function useSubscriptionStatus() {
  const { currentPlan, isLoading, error, usage } = useFeatureAccess();

  return {
    plan: currentPlan,
    isLoading,
    error,
    usage,
  };
}
