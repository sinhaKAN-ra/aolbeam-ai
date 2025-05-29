import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // For non-logged in users, we'll handle this on the frontend
      return NextResponse.json({ allowed: false, remaining: 0, limit: 0, isLoggedIn: false });
    }

    // Use the database function to check interaction limit
    const { data, error } = await supabase
      .rpc('check_interaction_limit', {
        p_user_id: user.id,
        p_interaction_type: interactionType
      })
      .single();

    if (error) {
      console.error('Error checking interaction limit:', error);
      return NextResponse.json(
        { error: 'Failed to check interaction limit' },
        { status: 500 }
      );
    }

    const allowed = data as boolean;
    const limit = 5; // This should match the limit in the database function
    
    // Get the actual count to calculate remaining
    const { count } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('interaction_type', interactionType)
      .eq('created_date', new Date().toISOString().split('T')[0]);

    const remaining = allowed ? limit - (count || 0) : 0;

    return NextResponse.json({ 
      allowed,
      remaining: allowed ? remaining : 0,
      limit,
      isLoggedIn: true 
    } as InteractionCheckResponse);

  } catch (error) {
    console.error('Error in interaction check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
