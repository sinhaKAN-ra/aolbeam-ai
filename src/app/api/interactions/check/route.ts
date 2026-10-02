import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { InteractionCheckResponse } from '@/types/interaction';
import { CHAT_LIMITS } from '@/config/limits';

export async function POST(request: Request) {
  try {
    const { interactionType } = await request.json();
    
    if (!interactionType) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // For non-logged in users, we'll handle this on the frontend
      return NextResponse.json({ allowed: false, remaining: 0, limit: 0, isLoggedIn: false, showLoginModal: true, showUpgradeModal: false });
    }

    // Get user profile to check subscription status
    let profileData: { is_subscribed: boolean; subscription_plan: string | null } | null = null;
    // Select subscription_plan_id directly
    const { data: rawProfileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, subscription_plan_id') // Fetch the actual column name
      .eq('id', user.id)
      .single();

    if (rawProfileData) {
      // Manually construct profileData with the desired 'subscription_plan' key
      profileData = {
        is_subscribed: rawProfileData.is_subscribed,
        // Assuming subscription_plan_id stores the plan name string or null
        subscription_plan: rawProfileData.subscription_plan_id as string | null, 
      };
    } else if (profileError && profileError.code !== 'PGRST116') {
      // An actual error occurred other than "not found"
      console.error('Error getting user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      );
    } else {
      // Profile not found (PGRST116 or fetchedProfile is null without specific error)
      // Treat as non-subscribed
      profileData = { is_subscribed: false, subscription_plan: null };
    }

    // Ensure profileData is not null before proceeding
    if (!profileData) {
      // This case should ideally not be reached if error handling is exhaustive
      console.error('Profile data is unexpectedly null after fetch and error handling.');
      return NextResponse.json(
        { error: 'Internal server error: Profile data missing' },
        { status: 500 }
      );
    }

    const profile = profileData; // Now profile is guaranteed to be non-null

    // Determine limit based on subscription plan and interaction type.
    // Free/non-subscribed defaults come from the shared src/config/limits.ts.
    let limit = CHAT_LIMITS.free; // Default for logged-in users without subscription
    let isPaidPlan = false;
    let isDaily = false;

    if (profile.is_subscribed && profile.subscription_plan) {
      // Set limits based on plan
      switch (profile.subscription_plan) {
        case 'one_time_cashfree':
          limit = 1000; // Total limit for one-time purchase
          isPaidPlan = true;
          isDaily = false;
          break;
        case 'weekly': // Genius Plan
          limit = 100;
          isPaidPlan = true;
          isDaily = true; // Paid plans have daily limits
          break;
        case 'monthly': // Power User
          limit = 500;
          isPaidPlan = true;
          isDaily = true;
          break;
        case 'quarterly': // AI Master
          limit = 1500;
          isPaidPlan = true;
          isDaily = true;
          break;
        default:
          // Basic plan or unknown plan
          limit = CHAT_LIMITS.free; // Default for non-subscribed or basic
          isPaidPlan = false;
          isDaily = false; // Basic plan has total limit, not daily
          break;
      }
    } else {
      // Handle non-subscribed users (free/basic)
      // For logged-in users who are not subscribed, provide a higher free limit
      limit = CHAT_LIMITS.free; // Free interactions for logged-in users without subscription
      isPaidPlan = false;
      isDaily = false;
    }

    // For problem_generation, enforce daily reset regardless of plan
    if (interactionType === 'problem_generation') {
      isDaily = true;
    }

    // Get the interaction count for the requested interaction type
    let queryBuilder = supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('interaction_type', interactionType);
    
    // For paid plans with daily limits, only count today's interactions
    if (isDaily) {
      const today = new Date().toISOString().split('T')[0];
      queryBuilder = queryBuilder.eq('created_date', today);
    }
    
    const { count, error: countError } = await queryBuilder;

    if (countError) {
      console.error('Error getting interaction count:', countError);
      // If there's an error counting, assume the user has some interactions available
      return NextResponse.json({ 
        allowed: true,
        remaining: Math.floor(limit / 2), // Give them half the limit as a fallback
        limit,
        isLoggedIn: true,
        isPaidPlan,
        showLoginModal: false,
        showUpgradeModal: false
      } as InteractionCheckResponse);
    }

    // Check if user has exceeded their limit
    const currentCount = count || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount);

    return NextResponse.json({ 
      allowed,
      remaining,
      limit,
      isLoggedIn: true,
      isPaidPlan,
      isDaily,
      showLoginModal: false,
      showUpgradeModal: false
    } as InteractionCheckResponse);

  } catch (error) {
    console.error('Error in interaction check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
