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
    const limit = 20; // Updated limit from 5 to 20 to match the database function
    
    // Get the actual count to calculate remaining
    const { count, error: countError } = await supabase
      .from('user_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('interaction_type', interactionType)
      .eq('created_date', new Date().toISOString().split('T')[0]);

    if (countError) {
      console.error('Error getting interaction count:', countError);
      // If there's an error counting, assume the user has all interactions available
      return NextResponse.json({ 
        allowed: true,
        remaining: limit,
        limit,
        isLoggedIn: true 
      } as InteractionCheckResponse);
    }

    // If allowed is true from the database function, calculate the remaining count
    const remaining = allowed ? Math.max(0, limit - (count || 0)) : 0;

    // For subscribed users, return unlimited (-1)
    // For free users, return the actual count
    return NextResponse.json({ 
      allowed,
      remaining: data === true && count === 0 ? limit : remaining,
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
