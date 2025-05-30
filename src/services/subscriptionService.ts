import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

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
  const supabase = createClientComponentClient<Database>();
  
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
    const supabase = createClientComponentClient<Database>();
    
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
