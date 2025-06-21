import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { interactionType, topic } = await request.json();
    
    if (!interactionType) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      );
    }

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await (await supabase).auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Record the interaction
    const { error: insertError } = await (await supabase)
      .from('user_interactions')
      .insert([
        { 
          user_id: user.id, 
          interaction_type: interactionType,
          topic,
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      console.error('Error recording interaction:', insertError);
      return NextResponse.json(
        { error: 'Failed to record interaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error recording interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
