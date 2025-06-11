import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-attempts/[id] - Get a specific test attempt with all responses
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    // Fix Next.js warning by using params.id directly
const id = params.id;
    
    // Get the test attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        test_series!test_attempts_test_series_id_fkey(
          *,
          creator:creator_id(id, email)
        )
      `)
      .eq('id', id)
      .single();
    
    if (attemptError) {
      console.error('Error fetching test attempt:', attemptError);
      return NextResponse.json({ error: attemptError.message }, { status: 500 });
    }
    
    if (!attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }
    
    // Check authorization - user must be the one who made the attempt or the creator of the test series
    if (attempt.user_id !== userId && attempt.test_series.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get all problems for this test series
    const { data: problems, error: problemsError } = await supabase
      .from('test_series_problems')
      .select('*')
      .eq('test_series_id', attempt.test_series_id)
      .order('order_index');
      
    // Log for debugging
    console.log(`Fetched ${problems ? problems.length : 0} problems for test series ${attempt.test_series_id}`);
    
    if (problemsError) {
      console.error('Error fetching test problems:', problemsError);
      return NextResponse.json({ error: problemsError.message }, { status: 500 });
    }
    
    // Get responses for this attempt
    const { data: responses, error: responsesError } = await supabase
      .from('test_problem_responses')
      .select('*')
      .eq('test_attempt_id', id);
    
    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: responsesError.message }, { status: 500 });
    }
    
    // Combine data into a coherent response
    const result = {
      attempt,
      problems,
      responses
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Unexpected error in test attempt GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/test-attempts/[id] - Update a test attempt (complete or update time)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    // Fix Next.js warning by using params.id directly
const id = params.id;
    const body = await request.json();
    
    // Check if user is authorized to update this attempt
    const { data: attempt, error: fetchError } = await supabase
      .from('test_attempts')
      .select('user_id, test_series_id, completed_at')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test attempt for update:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }
    
    if (attempt.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the user who started the test can update it' }, { status: 403 });
    }
    
    // Check if the test is already completed
    if (attempt.completed_at && body.action === 'complete') {
      return NextResponse.json({ error: 'Test is already completed' }, { status: 400 });
    }
    
    const updateData: any = {};
    
    // Handle different update actions
    if (body.action === 'complete') {
      updateData.completed_at = new Date().toISOString();
      
      // Calculate and set total time
      if (body.total_time_seconds) {
        updateData.total_time_seconds = body.total_time_seconds;
      }
      
      // Calculate and set score if it's provided
      if (typeof body.score === 'number') {
        updateData.score = body.score;
      }
    }
    
    // Update the attempt
    const { data, error } = await supabase
      .from('test_attempts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating test attempt:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in test attempt PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
