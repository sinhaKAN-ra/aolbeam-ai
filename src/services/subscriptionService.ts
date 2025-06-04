import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';

// Plan definitions with usage limits
export interface PlanLimit {
  id: string;
  name: string;
  description: string;
  maxQuestions: number;
  maxFeature1: number;
  maxFeature2: number;
  isFeatured: boolean;
}

export interface PaymentHistory {
  id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  provider: 'cashfree' | 'lemonsqueezy';
  payment_method: string;
  invoice_url?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface UsageMetrics {
  questionsUsed: number;
  feature1Used: number;
  feature2Used: number;
  percentageUsed: number;
  daysRemaining: number;
}

// Initialize Supabase client
const createClient = () => createSupabaseBrowserClient();

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  provider: 'cashfree' | 'lemonsqueezy';
  provider_subscription_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE' | 'PAUSED' | 'TRIAL';
  amount: number;
  currency: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  trial_start?: string;
  trial_end?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Error getting user:', userError);
    return null;
  }
  
  // Get the user's active subscription
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No active subscription found
      return null;
    }
    console.error('Error getting subscription:', error);
    return null;
  }
  
  return data as unknown as Subscription;
}

export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createClient();
    
    // Get subscription details
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    
    if (fetchError || !subscription) {
      console.error('Error fetching subscription:', fetchError);
      return { success: false, message: 'Subscription not found' };
    }
    
    // Call the appropriate API to cancel the subscription
    const response = await fetch(`/api/subscriptions/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }
    
    // Update subscription in the database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELLED',
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
    
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return { success: false, message: 'Failed to update subscription status' };
    }
    
    return { success: true, message: 'Subscription will be cancelled at the end of the billing period' };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, message: 'An error occurred while cancelling the subscription' };
  }
}

export async function checkSubscriptionStatus(): Promise<{ isActive: boolean; expiry?: string; plan?: string }> {
  try {
    const subscription = await getUserSubscription();
    
    if (!subscription) {
      return { isActive: false };
    }
    
    return {
      isActive: subscription.status === 'ACTIVE',
      expiry: subscription.current_period_end,
      plan: subscription.plan_id
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { isActive: false };
  }
}

// Define available plans
export const availablePlans: PlanLimit[] = [
  {
    id: 'free',
    name: 'Free Tier',
    description: 'Basic access with limited interactions for new users.',
    maxQuestions: 15,
    maxFeature1: 0,
    maxFeature2: 0,
    isFeatured: false,
  },
  {
    id: 'basic',
    name: 'Basic Access',
    description: 'Standard access for registered users.',
    maxQuestions: 25,
    maxFeature1: 0,
    maxFeature2: 0,
    isFeatured: false,
  },
  {
    id: 'one_time_cashfree',
    name: 'One-Time Access',
    description: 'Gain extensive access with a single payment.',
    maxQuestions: 1000, // 1000 total interactions
    maxFeature1: -1, // Unlimited
    maxFeature2: -1, // Unlimited
    isFeatured: true,
  },
  {
    id: 'weekly',
    name: 'Genius Plan',
    description: 'Unlock your full potential with advanced AI capabilities.',
    maxQuestions: 100,
    maxFeature1: -1, // Unlimited
    maxFeature2: -1, // Unlimited
    isFeatured: false,
  },
  {
    id: 'monthly',
    name: 'Power User',
    description: 'For those who demand more from their AI.',
    maxQuestions: 500,
    maxFeature1: -1, // Unlimited
    maxFeature2: -1, // Unlimited
    isFeatured: true,
  },
  {
    id: 'quarterly',
    name: 'AI Master',
    description: 'The ultimate AI experience for professionals.',
    maxQuestions: 1500,
    maxFeature1: -1, // Unlimited
    maxFeature2: -1, // Unlimited
    isFeatured: false,
  },
];

/**
 * Get subscription plan details
 */
export async function getSubscriptionPlan(planId?: string): Promise<PlanLimit | null> {
  if (!planId) {
    const status = await checkSubscriptionStatus();
    planId = status.plan;
  }
  
  if (!planId) return null;
  
  return availablePlans.find(plan => plan.id === planId) || null;
}

/**
 * Get user usage metrics compared to their plan limits
 */
export async function getUserUsageMetrics(): Promise<UsageMetrics> {
  try {
    const supabase = createClient();
    const subscription = await getUserSubscription();
    const plan = await getSubscriptionPlan(subscription?.plan_id);
    
    // Default usage metrics for free tier
    const defaultMetrics: UsageMetrics = {
      questionsUsed: 0,
      feature1Used: 0,
      feature2Used: 0,
      percentageUsed: 0,
      daysRemaining: 0
    };
    
    if (!subscription || !plan) {
      return defaultMetrics;
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return defaultMetrics;
    }
    
    // Get usage data from user_interactions based on plan type
    let interactionsQuery = supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', user.id);
      
    // For paid plans (weekly, monthly, quarterly), only count today's interactions (daily limit)
    // For free, basic, and one-time plans, count all interactions (total limit)
    if (['weekly', 'monthly', 'quarterly'].includes(subscription.plan_id)) {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      interactionsQuery = interactionsQuery.gte('created_at', today.toISOString());
    }
    
    const { data: interactions, error: interactionsError } = await interactionsQuery;
    
    if (interactionsError) {
      console.error('Error getting user interactions:', interactionsError);
      return defaultMetrics;
    }
    
    // Calculate metrics
    const questionsUsed = interactions ? interactions.length : 0;
    const feature1Used = interactions ? interactions.filter(i => i.type === 'feature1').length : 0;
    const feature2Used = interactions ? interactions.filter(i => i.type === 'feature2').length : 0;
    
    // Calculate percentage used (based on questions as primary metric)
    const percentageUsed = Math.min(100, Math.round((questionsUsed / plan.maxQuestions) * 100));
    
    // Calculate days remaining in subscription period
    const daysRemaining = subscription.current_period_end ? 
      Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
    
    return {
      questionsUsed,
      feature1Used,
      feature2Used,
      percentageUsed,
      daysRemaining
    };
  } catch (error) {
    console.error('Error getting usage metrics:', error);
    return {
      questionsUsed: 0,
      feature1Used: 0,
      feature2Used: 0,
      percentageUsed: 0,
      daysRemaining: 0
    };
  }
}

/**
 * Get payment history for the current user
 */
export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  try {
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return [];
    }
    
    // Get all payment orders for the current user, including one-time payments (subscription_id is NULL)
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('user_id', user.id) // Filter by user_id
      .order('created_at', { ascending: false });
    
    if (paymentsError) {
      console.error('Error getting payment history:', paymentsError);
      return [];
    }
    
    return payments as unknown as PaymentHistory[];
  } catch (error) {
    console.error('Error getting payment history:', error);
    return [];
  }
}

/**
 * Initiate plan upgrade/downgrade
 */
export async function changePlan(newPlanId: string): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
  try {
    // Get the current plan
    const currentSubscription = await getUserSubscription();
    
    // Determine the provider to use based on user location or existing subscription
    // For this example, we'll use the provider from the existing subscription or default to detecting based on country
    const provider = currentSubscription?.provider || await detectUserRegionForPayment();
    
    // Call the API to create a new subscription or update existing one
    const response = await fetch(`/api/subscriptions/${provider}/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planId: newPlanId,
        currentSubscriptionId: currentSubscription?.id
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process plan change');
    }
    
    const result = await response.json();
    
    return {
      success: true,
      message: currentSubscription ? 'Plan updated successfully' : 'New subscription created',
      redirectUrl: result.redirectUrl || result.paymentLink
    };
  } catch (error) {
    console.error('Error changing plan:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while changing the plan'
    };
  }
}

/**
 * Utility function to detect user region for payment provider selection
 */
export async function detectUserRegionForPayment(): Promise<'cashfree' | 'lemonsqueezy'> {
  try {
    // Try to get the user's country from browser or API
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    // Use Cashfree for India, LemonSqueezy for everyone else
    return data.country === 'IN' ? 'cashfree' : 'lemonsqueezy';
  } catch (error) {
    console.error('Error detecting user region:', error);
    // Default to LemonSqueezy if detection fails
    return 'lemonsqueezy';
  }
}
