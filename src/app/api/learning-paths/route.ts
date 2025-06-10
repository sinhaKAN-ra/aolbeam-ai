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
    const requestBody = await req.json();
    console.log('Incoming request body for POST /api/learning-paths:', requestBody);

    const { title, description, steps, topic, isPublic } = requestBody;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;
    
    // Validate required fields
    if (!title || !description || !steps || !topic) {
      console.error('Missing required fields for learning path:', { title, description, steps, topic });
      return NextResponse.json(
        { error: 'Missing required fields: title, description, steps, and topic are mandatory.' },
        { status: 400 }
      );
    }

    const newPath = {
      id: uuidv4(),
      user_id: userId,
      title,
      description,
      topic,
      steps,
      is_public: isPublic || false,
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert new learning path:', newPath);

    const { data, error } = await supabase
      .from('learning_paths')
      .insert(newPath)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Successfully created learning path:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating learning path:', error);
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
