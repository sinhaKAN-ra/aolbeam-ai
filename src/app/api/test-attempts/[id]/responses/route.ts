import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-attempts/[id]/responses - Get all responses for a test attempt
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
    const { id } = params;
    
    // Check if user is authorized to access this attempt's responses
    const { data: attempt, error: fetchError } = await supabase
      .from('test_attempts')
      .select(`
        user_id,
        test_series:test_series_id(creator_id)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test attempt for responses:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }
    
    if (attempt.user_id !== userId && attempt.test_series[0].creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the test taker or test creator can view responses' }, { status: 403 });
    }
    
    // Get all responses for this attempt with problem details
    const { data: responses, error } = await supabase
      .from('test_problem_responses')
      .select(`
        *,
        problem:test_problem_id(*)
      `)
      .eq('test_attempt_id', id);
    
    if (error) {
      console.error('Error fetching test responses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: responses });
  } catch (error) {
    console.error('Unexpected error in test responses GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/test-attempts/[id]/responses - Submit a response for a problem in this attempt
export async function POST(
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
    
    // Validate required fields
    if (!body.test_problem_id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });
    }
    
    if (body.user_response === undefined) {
      return NextResponse.json({ error: 'Response content is required' }, { status: 400 });
    }
    
    // Check if user is authorized to submit to this attempt
    const { data: attempt, error: fetchError } = await supabase
      .from('test_attempts')
      .select('user_id, completed_at')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test attempt for response submission:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }
    
    // Only the user who started the test can submit responses
    if (attempt.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the test taker can submit responses' }, { status: 403 });
    }
    
    // Check if test is already completed
    if (attempt.completed_at) {
      return NextResponse.json({ error: 'Cannot submit response. Test is already completed' }, { status: 400 });
    }
    
    // Check if the problem exists and belongs to the test
    const { data: problem, error: problemError } = await supabase
      .from('test_series_problems')  // Fixed table name
      .select('*')
      .eq('id', body.test_problem_id)
      .single();
    
    if (problemError) {
      console.error('Error fetching problem for response:', problemError);
      return NextResponse.json({ error: problemError.message }, { status: 500 });
    }
    
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }
    
    // Check if a response to this problem already exists
    const { data: existingResponse, error: existingError } = await supabase
      .from('test_problem_responses')
      .select('id')
      .eq('test_attempt_id', id)
      .eq('test_problem_id', body.test_problem_id)
      .single();
    
    // If response exists, update it instead of creating a new one
    if (!existingError && existingResponse) {
      const { data, error } = await supabase
        .from('test_problem_responses')
        .update({
          user_response: body.user_response,
          is_correct: determineIsCorrect(problem, body.user_response),
          time_taken_seconds: body.time_taken_seconds || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating test response:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ data, updated: true });
    }
    
    // Create a new response
    const { data, error } = await supabase
      .from('test_problem_responses')
      .insert({
        test_attempt_id: id,
        test_problem_id: body.test_problem_id,
        user_response: body.user_response,
        is_correct: determineIsCorrect(problem, body.user_response),
        time_taken_seconds: body.time_taken_seconds || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test response:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in test responses POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to determine if answer is correct
function determineIsCorrect(problem: any, userResponse: string): boolean | null {
  // For MCQ problems, we can automatically check
  if (problem.problem_type === 'mcq' && problem.correct_answer !== null && userResponse !== null) {
    // Assuming correct_answer for MCQ is the correct option's value
    return problem.correct_answer.trim().toLowerCase() === userResponse.trim().toLowerCase();
  }
  
  // For other problem types, or if correct_answer/userResponse is null, we need manual grading or AI evaluation
  return null;
}
