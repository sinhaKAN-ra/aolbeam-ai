import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { plans } from '@/app/pricing/page';
import { SubscriptionPlan } from '@/types';

// Define the structure of the usage data from the API
export type UsageData = {
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
    free: 20, // 20 interactions for free users
    weekly: true,
    monthly: true,
    quarterly: true,
  },
};

// Define the return type for canUseFeature
export type FeatureAccessResult = {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  percentage?: number;
};

// Helper function to fetch usage data
const fetchUsage = async (userId: string): Promise<UsageData> => {
  const supabase = createSupabaseBrowserClient();
  if (!userId) throw new Error('User not authenticated.');

  // Fetch all user interactions
  const { data: interactions, error: interactionsError } = await supabase
    .from('user_interactions')
    .select('interaction_type, created_at')
    .eq('user_id', userId);

  if (interactionsError) {
    throw new Error(`Failed to fetch user interactions: ${interactionsError.message}`);
  }

  const testCreationInteractions = interactions?.filter(i => i.interaction_type === 'test_creation') || [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let chatInteractionsToday = 0;
  interactions?.forEach(interaction => {
    if (interaction.interaction_type === 'chat') {
      const interactionDate = new Date(interaction.created_at);
      interactionDate.setHours(0, 0, 0, 0);
      if (interactionDate.getTime() === today.getTime()) {
        chatInteractionsToday++;
      }
    }
  });

  const testsCreated = testCreationInteractions.length;

  // Get user's subscription plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .in('status', ['trialing', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planId = subscription?.plan_id || 'free';
  const currentPlan = plans.find(p => p.id === planId) || plans.find(p => p.id === 'free');
  
  const chatLimit = currentPlan?.chat_limit ?? featureLimits.chat[planId] as number;
  const testCreationLimit = currentPlan?.test_creation_limit ?? featureLimits.test_creation[planId] as number;

  return {
    user_id: userId,
    plan_id: planId,
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['usage-stats', user?.id],
    queryFn: async () => {
      console.log('Fetching fresh usage data for user:', user?.id);
      const data = await fetchUsage(user!.id);
      console.log('Fresh usage data received:', data);
      return data;
    },
    enabled: !!user,
    staleTime: 0, // Always refetch fresh data
    refetchOnWindowFocus: true,
  });

  const recordUsageMutation = useMutation({
    mutationFn: async (feature: 'chat' | 'test_creation') => {
      if (!user) throw new Error('User not authenticated');
      
      console.log(`Recording usage for feature: ${feature}`);
      const supabase = createSupabaseBrowserClient();
      // Set default topic based on interaction type
      const chatContext = (window as any).__CHAT_CONTEXT__ || {};
      const currentTopic = chatContext.currentTopic || 'General Discussion';
  
      const topic = feature === 'chat' ? currentTopic : 'Test Creation';
  
      const { error } = await supabase.from('user_interactions').insert({
        user_id: user.id,
        interaction_type: feature,
        topic: topic // This is now guaranteed to be non-null
      });

      if (error) {
        if (error.message.includes('check_test_creation_limit')) {
            const limitError = new Error('You have reached your test creation limit.');
            (limitError as any).code = 'TEST_LIMIT_REACHED';
            throw limitError;
        }
        throw new Error(`Failed to record usage: ${error.message}`);
      }
      console.log(`Successfully recorded usage for ${feature}`);
      return { success: true };
    },
    onSuccess: () => {
      console.log('Usage recorded successfully, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['usage-stats', user?.id] });
    },
  });

  const canUseFeature = useCallback((feature: FeatureName): FeatureAccessResult => {
    if (isLoading) return { allowed: false, reason: 'Loading user data...' };
    if (error || !usage) return { allowed: false, reason: 'Could not load usage data.' };

    const planId = usage.plan_id;
    const featureLimit = featureLimits[feature][planId];

    if (typeof featureLimit === 'boolean') {
      return { 
        allowed: featureLimit,
        reason: featureLimit ? undefined : 'This feature requires a paid plan.'
      };
    }

    if (typeof featureLimit === 'number') {
      const usageCount = feature === 'chat' ? usage.chat_interactions_today : usage.tests_created;
      const remaining = feature === 'chat' ? usage.remaining_chats : usage.remaining_tests;
      const limit = feature === 'chat' ? usage.chat_limit : usage.test_creation_limit;
      const percentage = limit > 0 ? Math.min(Math.round((usageCount / limit) * 100), 100) : 0;
      
      return {
        allowed: remaining > 0,
        remaining,
        limit,
        reason: remaining > 0 ? undefined : `You've reached your limit for this feature.`,
        percentage,
      };
    }

    return { allowed: false, reason: 'Feature not available.' };
  }, [usage, isLoading, error]);

  const recordFeatureUsage = useCallback(async (feature: 'chat' | 'test_creation') => {
    try {
      console.log(`Starting recordFeatureUsage for ${feature}`);
      await recordUsageMutation.mutateAsync(feature);
      console.log(`Completed recordFeatureUsage for ${feature}`);
      return true;
    } catch (error) {
      console.error(`Failed to record usage for ${feature}:`, error);
      throw error;
    }
  }, [recordUsageMutation]);

  return {
    usage,
    isLoading,
    error: error as Error | null,
    canUseFeature,
    recordFeatureUsage,
    refetchUsage: refetch,
  };
}
