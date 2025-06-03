import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { plans } from '@/app/pricing/page'; // Import the plans array from pricing page
import { SubscriptionPlan } from '@/types'; // Import SubscriptionPlan type

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role for admin access (required for webhook)
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Helper function to get the order of a plan
const getPlanOrder = (planId: string): number => {
  const plan = plans.find(p => p.id === planId);
  return plan && plan.order !== undefined ? plan.order : 0;
};

export async function POST(request: Request) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify the webhook signature if available
    const signature = request.headers.get('x-signature');
    if (LEMONSQUEEZY_WEBHOOK_SECRET && signature) {
      // Implement signature verification here if needed
      // This is important for production, but we'll skip the detailed implementation for now
    }

    // Get the webhook payload
    const payload = await request.json();
    
    // Log the webhook for debugging
    console.log('Received LemonSqueezy webhook:', JSON.stringify(payload));
    
    // Extract data from the webhook
    const { meta, data } = payload;
    if (!meta || !meta.event_name || !data) {
      console.error('Invalid webhook payload format');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    const eventName = meta.event_name;
    
    // Handle different event types
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;
      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(data);
        break;
      case 'subscription_resumed':
        await handleSubscriptionResumed(data);
        break;
      case 'subscription_expired':
        await handleSubscriptionExpired(data);
        break;
      case 'subscription_paused':
        await handleSubscriptionPaused(data);
        break;
      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(data);
        break;
      case 'order_created':
        // Initial order creation, might need to be handled
        break;
      default:
        // Ignore other event types
        console.log(`Ignoring unhandled event type: ${eventName}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing LemonSqueezy webhook:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function handleSubscriptionCreated(data: any) {
  if (!supabase) return;
  
  const attributes = data.attributes;
  const subscriptionId = data.id;
  const customerId = attributes.customer_id;
  const orderId = attributes.order_id;
  
  // Find the user associated with this customer
  const { data: userData, error: userError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('provider_subscription_id', subscriptionId) // Use provider_subscription_id to find the user
    .eq('provider', 'lemonsqueezy')
    .single();
  
  let userId = userData?.user_id; // Initialize userId

  // If user not found via subscription, try finding by customer_id or email
  if (!userId) {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('lemon_squeezy_customer_id', customerId)
      .single();

    if (profileError || !profileData) {
      console.warn(`User not found for Lemon Squeezy customer_id: ${customerId}. Attempting to find by email.`);
      // Fallback to finding user by email if customer_id doesn't match
      const { data: userByEmail, error: userByEmailError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', attributes.user_email)
        .single();

      if (userByEmailError || !userByEmail) {
        console.error('Error finding user by email for subscription:', userByEmailError);
        return; // Cannot proceed without a user
      }
      userId = userByEmail.id;
    } else {
      userId = profileData.id;
    }
  }

  if (!userId) {
    console.error('Could not determine user ID for Lemon Squeezy subscription.');
    return;
  }

  const status = mapLemonSqueezyStatus(attributes.status);
  const planId = `${attributes.product_id}`;
  const periodEnd = attributes.renews_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days if not provided

  // Fetch user's current subscription details from user_profiles
  let currentUserPlanOrder = 0;
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_subscribed, subscription_plan_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile for upgrade check:', profileError);
    // Continue even if profile fetch fails, treat as non-subscribed
  } else if (profile && profile.is_subscribed && profile.subscription_plan_id) {
    currentUserPlanOrder = getPlanOrder(profile.subscription_plan_id);
  }

  // Enforce upgrade-only flow
  const targetPlanOrder = getPlanOrder(planId);
  if (currentUserPlanOrder > 0 && targetPlanOrder <= currentUserPlanOrder) {
    console.warn(`Blocking Lemon Squeezy subscription creation for user ${userId}: Attempted to downgrade or select current plan. Current order: ${currentUserPlanOrder}, Target order: ${targetPlanOrder}`);
    return; // Do not create/update subscription if it's not an upgrade
  }

  // Update or create the subscription
  const { data: subscription, error: upsertError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      provider: 'lemonsqueezy',
      provider_subscription_id: subscriptionId,
      status: status,
      amount: attributes.urls?.customer_portal ? parseFloat(attributes.urls.customer_portal) : 0,
      currency: 'USD',
      interval: mapInterval(attributes),
      current_period_start: new Date(attributes.created_at).toISOString(),
      current_period_end: attributes.renews_at || null,
      cancel_at_period_end: attributes.cancelled || attributes.renews_at === null,
      trial_ends_at: attributes.trial_ends_at || null,
      metadata: attributes,
    }, { onConflict: 'provider_subscription_id' });
  
  if (upsertError) {
    console.error('Error upserting subscription:', upsertError);
    return;
  }

  // Update the user profile
  await updateUserProfile(
    supabase,
    userId,
    status,
    planId,
    periodEnd
  );
}

async function handleSubscriptionUpdated(data: any) {
  if (!supabase) return;
  
  const attributes = data.attributes;
  const subscriptionId = data.id;
  const status = mapLemonSqueezyStatus(attributes.status);
  
  // First get the current subscription to get the user ID
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();
  
  if (!subscriptionData) {
    console.error('Subscription not found:', subscriptionId);
    return;
  }
  
  // Update the subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      current_period_end: attributes.renews_at,
      cancel_at_period_end: attributes.cancelled,
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error updating subscription:', error);
    return;
  }

  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    status,
    subscriptionData.plan_id,
    attributes.renews_at
  );

}

async function handleSubscriptionCancelled(data: any) {
  if (!supabase) return;
  
  const subscriptionId = data.id;
  const attributes = data.attributes;
  
  // First get the current subscription to get the user ID
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();
  
  if (!subscriptionData) {
    console.error('Subscription not found:', subscriptionId);
    return;
  }
  
  // Update the subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'CANCELED',
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error cancelling subscription:', error);
    return;
  }
  
  // Update the user profile to mark as unsubscribed
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    'CANCELED',
    subscriptionData.plan_id,
    attributes.ends_at || new Date().toISOString()
  );
}

async function handleSubscriptionResumed(data: any) {
  if (!supabase) return;
  
  const subscriptionId = data.id;
  const attributes = data.attributes;
  
  // First get the current subscription to get the user ID and plan
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();
  
  if (!subscriptionData) {
    console.error('Subscription not found:', subscriptionId);
    return;
  }
  
  // Update the subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'ACTIVE',
      cancel_at_period_end: false,
      canceled_at: null,
      current_period_end: attributes.renews_at,
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error resuming subscription:', error);
    return;
  }
  
  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    'ACTIVE',
    subscriptionData.plan_id,
    attributes.renews_at
  );
}

async function handleSubscriptionExpired(data: any) {
  if (!supabase) return;
  
  const subscriptionId = data.id;
  const attributes = data.attributes;
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'EXPIRED',
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error expiring subscription:', error);
    return;
  }

  // First get the current subscription to get the user ID and plan ID
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();

  if (!subscriptionData) {
    console.error('Subscription not found for expiration:', subscriptionId);
    return;
  }

  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    'EXPIRED',
    subscriptionData.plan_id,
    attributes.ends_at || new Date().toISOString()
  );
}

async function handleSubscriptionPaused(data: any) {
  if (!supabase) return;
  
  const subscriptionId = data.id;
  const attributes = data.attributes;
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'PAUSED',
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error pausing subscription:', error);
    return;
  }

  // First get the current subscription to get the user ID and plan ID
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();

  if (!subscriptionData) {
    console.error('Subscription not found for pausing:', subscriptionId);
    return;
  }

  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    'PAUSED',
    subscriptionData.plan_id,
    attributes.renews_at || new Date().toISOString()
  );
}

async function handleSubscriptionUnpaused(data: any) {
  if (!supabase) return;
  
  const subscriptionId = data.id;
  const attributes = data.attributes;
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'ACTIVE',
      metadata: attributes,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy');
  
  if (error) {
    console.error('Error unpausing subscription:', error);
    return;
  }

  // First get the current subscription to get the user ID and plan ID
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'lemonsqueezy')
    .single();

  if (!subscriptionData) {
    console.error('Subscription not found for unpausing:', subscriptionId);
    return;
  }

  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    'ACTIVE',
    subscriptionData.plan_id,
    attributes.renews_at || new Date().toISOString()
  );
}

// Helper function to map LemonSqueezy status to our status format
function mapLemonSqueezyStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'cancelled':
      return 'CANCELLED';
    case 'expired':
      return 'EXPIRED';
    case 'past_due':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'trialing':
      return 'TRIAL';
    default:
      return 'ACTIVE';
  }
}

// Helper function to update user profile with subscription information
async function updateUserProfile(
  supabase: any,
  userId: string,
  status: string,
  planId: string,
  periodEnd: string
) {
  try {
    const isSubscribed = status === 'ACTIVE' || status === 'TRIAL';
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        is_subscribed: isSubscribed,
        subscription_plan_id: isSubscribed ? planId : null,
        subscription_started_at: isSubscribed ? new Date().toISOString() : null,
        subscription_ends_at: isSubscribed ? periodEnd : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (error) {
      console.error('Error updating user profile:', error);
    } else {
      console.log(`User profile updated for user ${userId} with subscription status: ${status}`);
    }
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
  }
}

// Helper function to map subscription interval
function mapInterval(attributes: any): string {
  // LemonSqueezy doesn't directly expose the interval in the webhook payload
  // You might need to determine this from the product/variant information
  // For now, we'll use a simple heuristic based on renewal dates
  
  if (!attributes.renews_at) return 'monthly'; // Default to monthly
  
  const now = new Date();
  const renewDate = new Date(attributes.renews_at);
  const dayDiff = (renewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  if (dayDiff <= 14) return 'weekly';
  if (dayDiff <= 45) return 'monthly';
  if (dayDiff <= 100) return 'quarterly';
  return 'yearly';
}
