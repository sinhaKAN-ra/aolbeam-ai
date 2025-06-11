import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-series/[id]/problems - Get all problems in a test series
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check - using getUser() for server-side authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // First, check the test series' public status and creator
    const { data: testSeriesData, error: testSeriesError } = await supabase
      .from('test_series')
      .select('is_public, creator_id')
      .eq('id', id)
      .single();

    if (testSeriesError || !testSeriesData) {
      console.error('Error fetching test series for problems:', testSeriesError);
      return NextResponse.json({ error: 'Test series not found or access denied' }, { status: 404 });
    }

    // If the test series is private, only the creator can access its problems
    if (!testSeriesData.is_public && testSeriesData.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized. This is a private test series.' }, { status: 403 });
    }

    // Get all problems in this test series
    const { data, error } = await supabase
      .from('test_series_problems')
      .select('*')
      .eq('test_series_id', id)
      .order('order_index');
    
    if (error) {
      console.error('Error fetching test problems:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in test problems GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/test-series/[id]/problems - Add a problem to a test series
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check - using getUser() for server-side authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Check if user is the creator of this test series
    const { data: testSeries, error: fetchError } = await supabase
      .from('test_series')
      .select('creator_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test series for adding problem:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 });
    }
    
    if (testSeries.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the creator can add problems to this test series' }, { status: 403 });
    }
    
    // Validate required fields
    if (!body.problem_statement) {
      return NextResponse.json({ error: 'Problem statement is required' }, { status: 400 });
    }
    
    // Validate problem_type
    const allowedProblemTypes = ['theory', 'practical', 'conceptual', 'numerical', 'diagram_based'];
    if (!body.problem_type || !allowedProblemTypes.includes(body.problem_type)) {
      return NextResponse.json({ 
        error: `Invalid problem type. Must be one of: ${allowedProblemTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // Get the current highest order_index
    const { data: maxOrderResult, error: maxOrderError } = await supabase
      .from('test_series_problems')
      .select('order_index')
      .eq('test_series_id', id)
      .order('order_index', { ascending: false })
      .limit(1);
    
    if (maxOrderError) {
      console.error('Error getting max order index:', maxOrderError);
      return NextResponse.json({ error: maxOrderError.message }, { status: 500 });
    }
    
    const nextOrderIndex = maxOrderResult && maxOrderResult.length > 0 
      ? maxOrderResult[0].order_index + 1 
      : 0;
    
    // Add the problem to the test series
    const { data, error } = await supabase
      .from('test_series_problems')
      .insert({
        test_series_id: id,
        problem_statement: body.problem_statement,
        problem_type: body.problem_type,
        difficulty: body.difficulty || 'medium',
        correct_answer: body.correct_answer || null,
        multiple_choice_options: body.multiple_choice_options || null,
        explanation: body.explanation || null,
        topic: body.topic || null,
        order_index: nextOrderIndex
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding test problem:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update the test series updated_at timestamp
    await supabase
      .from('test_series')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in test problems POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/test-series/[id]/problems - Update problem order or bulk update
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check - using getUser() for server-side authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Check if user is the creator of this test series
    const { data: testSeries, error: fetchError } = await supabase
      .from('test_series')
      .select('creator_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test series for updating problems:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 });
    }
    
    if (testSeries.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the creator can update problems in this test series' }, { status: 403 });
    }
    
    // Handle problem reordering
    if (body.reorder && Array.isArray(body.problemOrder)) {
      for (let i = 0; i < body.problemOrder.length; i++) {
        const problemId = body.problemOrder[i];
        const { error } = await supabase
          .from('test_series_problems')
          .update({ order_index: i })
          .eq('id', problemId)
          .eq('test_series_id', id);
        
        if (error) {
          console.error(`Error reordering problem ${problemId}:`, error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      
      // Update the test series updated_at timestamp
      await supabase
        .from('test_series')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
      
      return NextResponse.json({ message: 'Problem order updated successfully' });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Unexpected error in test problems PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
