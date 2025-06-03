import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { InteractionCheckResponse } from '@/types/interaction';

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
      return NextResponse.json({ allowed: false, remaining: 0, limit: 0, isLoggedIn: false });
    }

    // Get user profile to check subscription status
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, subscription_plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      );
    }

    // Determine limit based on subscription plan
    let limit = 25; // Default for logged-in users without subscription
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
          limit = 25; // Default for non-subscribed or basic
          isPaidPlan = false;
          isDaily = false; // Basic plan has total limit, not daily
          break;
      }
    } else {
      // Handle non-subscribed users (free/basic)
      if (profile.subscription_plan === 'basic') {
        limit = 25;
      } else {
        limit = 15; // Free tier
      }
      isPaidPlan = false;
      isDaily = false;
    }

    // Get the interaction count
    let queryBuilder = supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    // For paid plans with daily limits, only count today's interactions
    if (isDaily) {
      queryBuilder = queryBuilder.eq('created_at', new Date().toISOString().split('T')[0]);
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
        isPaidPlan
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
      isDaily
    } as InteractionCheckResponse);

  } catch (error) {
    console.error('Error in interaction check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
