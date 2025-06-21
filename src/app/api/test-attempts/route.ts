import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-attempts - Get test attempts for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    
    // Get query params
    const url = new URL(request.url);
    const testSeriesId = url.searchParams.get('test_series_id');
    
    // Base query
    let query = supabase
      .from('test_attempts')
      .select(`
        id,
        created_at,
        completed_at,
        total_time_seconds,
        score,
        test_series_id,
        user_id,
        test_series ( title ),
        user_profiles ( full_name )
      `);
    
    if (testSeriesId) {
      // If testSeriesId is provided, check if the current user is the creator of this test series
      const { data: testSeries, error: testSeriesError } = await supabase
        .from('test_series')
        .select('creator_id')
        .eq('id', testSeriesId)
        .single();

      if (testSeriesError || !testSeries) {
        console.error('Error fetching test series for authorization:', testSeriesError);
        return NextResponse.json({ error: 'Test series not found or unauthorized' }, { status: 404 });
      }

      if (testSeries.creator_id === userId) {
        // Current user is the creator, fetch all attempts for this test series
        query = query.eq('test_series_id', testSeriesId);
      } else {
        // Not the creator, only show current user's attempts for this series
        query = query
          .eq('test_series_id', testSeriesId)
          .eq('user_id', userId);
      }
    } else {
      // No testSeriesId, so only fetch current user's attempts
      query = query.eq('user_id', userId);
    }
    
    query = query.order('created_at', { ascending: false });
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching test attempts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in test attempts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/test-attempts - Start a new test attempt
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Validate required fields
    if (!body.test_series_id) {
      return NextResponse.json({ error: 'Test series ID is required' }, { status: 400 });
    }
    
    // Create test attempt
    const { data, error } = await supabase
      .from('test_attempts')
      .insert({
        test_series_id: body.test_series_id,
        user_id: userId,
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test attempt:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in test attempts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
