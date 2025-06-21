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

export async function POST(request: Request) {
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

    // Parse request body
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if user can send a message (check chat limits)
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

    if (usageError) {
      console.error('Error getting user usage:', usageError);
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      );
    }
    
    // Check if user has reached their chat limit
    const planLimits = {
      free: 15,
      weekly: 50,
      monthly: 100,
      quarterly: 200
    };

    const limit = planLimits[planId as keyof typeof planLimits] || 0;
    const remaining = limit - (usage?.chat_interactions_today || 0);
    
    if (remaining <= 0) {
      return NextResponse.json(
        { 
          error: 'Chat message limit reached',
          code: 'CHAT_LIMIT_REACHED',
          message: `You have reached your limit of ${limit} chat messages for your current plan.`,
          limit,
          remaining: 0
        },
        { status: 403 }
      );
    }

    // Record the chat message usage
    const { data: updatedUsage, error: updateError } = await supabaseAdmin
      .rpc('increment_usage', { 
        p_user_id: user.id, 
        p_feature: 'chat'
      });

    if (updateError) {
      console.error('Error recording chat usage:', updateError);
      // Continue with the chat even if recording fails
    }

    // Here you would typically process the chat message with your AI service
    // For now, we'll just return a success response
    return NextResponse.json({ 
      success: true,
      message: 'Message processed successfully',
      usage: {
        limit,
        remaining: Math.max(0, remaining - 1), // Subtract 1 for this message
        used: (usage?.chat_interactions_today || 0) + 1
      }
    });

  } catch (error: any) {
    console.error('Error processing chat message:', error);
    
    // If this is a known error, pass it through
    if (error.code === 'CHAT_LIMIT_REACHED') {
      return NextResponse.json(
        { 
          error: 'Chat message limit reached',
          code: 'CHAT_LIMIT_REACHED',
          message: error.message || 'You have reached your chat message limit for your current plan.'
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process chat message',
        code: error.code || 'CHAT_PROCESSING_ERROR'
      },
      { status: 500 }
    );
  }
}
