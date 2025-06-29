import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createSupabaseServerClient } from '@/lib/supabaseServer';



export async function GET() {
  const supabase = await createSupabaseServerClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;
    
    const { data, error } = await supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning paths' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const learningPath = await req.json();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const newPathData = {
      ...learningPath,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Ensure created_at is also set if not provided by client
    if (!newPathData.created_at) {
      newPathData.created_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('learning_paths')
      .insert(newPathData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in POST /api/learning-paths:', error);
    return NextResponse.json(
      { error: `Failed to create learning path: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { id, updates } = await req.json();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // First verify the path belongs to the user
    const { data: existingPath, error: fetchError } = await supabase
      .from('learning_paths')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (existingPath.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the path
    const { data, error } = await supabase
      .from('learning_paths')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating learning path:', error);
    return NextResponse.json(
      { error: 'Failed to update learning path' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing path ID' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    // First verify the path belongs to the user
    const { data: existingPath, error: fetchError } = await supabase
      .from('learning_paths')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (existingPath.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete the path
    const { error } = await supabase
      .from('learning_paths')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting learning path:', error);
    return NextResponse.json(
      { error: 'Failed to delete learning path' },
      { status: 500 }
    );
  }
}
