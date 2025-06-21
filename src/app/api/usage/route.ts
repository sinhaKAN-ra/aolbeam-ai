import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Create a server-side Supabase client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dynamic = 'force-dynamic';

// Helper function to get user's subscription plan
async function getUserPlan(userId: string) {
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return subscription?.plan_id || 'free';
}

// Helper function to get user's usage data
async function getUserUsage(userId: string, planId: string) {
  const { data: usage, error } = await supabaseAdmin
    .rpc('get_user_usage', { 
      p_user_id: userId,
      p_plan_id: planId
    });

  if (error) throw error;
  return usage;
}

// GET handler to fetch current user's usage data
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's plan and usage
    const planId = await getUserPlan(user.id);
    const usage = await getUserUsage(user.id, planId);
    
    // Return the usage data in a structured format
    return NextResponse.json({
      user_id: user.id,
      plan_id: planId,
      usage: {
        chat: {
          used: usage.chat_interactions_today || 0,
          limit: usage.chat_limit || 15,
          remaining: usage.remaining_chat || 0,
          percentage: Math.min(Math.round(((usage.chat_interactions_today || 0) / (usage.chat_limit || 15)) * 100), 100)
        },
        test_creation: {
          used: usage.tests_created || 0,
          limit: usage.test_creation_limit || 5,
          remaining: usage.remaining_tests || 0,
          percentage: Math.min(Math.round(((usage.tests_created || 0) / (usage.test_creation_limit || 5)) * 100), 100)
        }
      },
      updated_at: usage.updated_at || new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch usage data',
        code: error.code || 'USAGE_FETCH_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { feature } = await request.json();

    if (!['chat', 'test_creation'].includes(feature)) {
      return NextResponse.json(
        { error: 'Invalid feature' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For test creation, we'll use the database function which includes the limit check
    if (feature === 'test_creation') {
      // First, check if the user has a subscription
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const planId = subscription?.plan_id || 'free';
      
      // Get usage for the current period
      const { data: usage, error: usageError } = await supabaseAdmin
        .rpc('get_user_usage', { 
          p_user_id: user.id,
          p_plan_id: planId
        });

      if (usageError) throw usageError;
      
      // Check if user has reached their limit
      const planLimits = {
        free: 5,
        weekly: 10,
        monthly: 20,
        quarterly: 30
      };

      const limit = planLimits[planId as keyof typeof planLimits] || 0;
      const remaining = limit - (usage?.tests_created || 0);
      
      if (remaining <= 0) {
        return NextResponse.json(
          { 
            error: 'Test creation limit reached',
            code: 'TEST_LIMIT_REACHED',
            message: `You have reached your limit of ${limit} tests for your current plan.`
          },
          { status: 403 }
        );
      }
    }

    // For chat or if test creation is allowed, update the usage
    const { data: updatedUsage, error: updateError } = await supabaseAdmin
      .rpc('increment_usage', { 
        p_user_id: user.id, 
        p_feature: feature 
      });

    if (updateError) throw updateError;

    return NextResponse.json({ 
      data: updatedUsage,
      remaining: updatedUsage?.[0]?.remaining
    });
  } catch (error: any) {
    console.error('Error updating usage data:', error);
    
    // If this is a test limit error, pass it through
    if (error.code === 'P0001' || error.code === 'TEST_LIMIT_REACHED') {
      return NextResponse.json(
        { 
          error: 'Test creation limit reached',
          code: 'TEST_LIMIT_REACHED',
          message: error.message || 'You have reached your test creation limit for your current plan.'
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update usage data',
        code: error.code || 'USAGE_UPDATE_ERROR'
      },
      { status: 500 }
    );
  }
}
