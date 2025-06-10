import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-attempts - Get test attempts for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get query params
    const url = new URL(request.url);
    const testSeriesId = url.searchParams.get('test_series_id');
    
    // Base query
    let query = supabase
      .from('test_attempts')
      .select(`
        *,
        test_series!test_attempts_test_series_id_fkey(title, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Apply test series filter if provided
    if (testSeriesId) {
      query = query.eq('test_series_id', testSeriesId);
    }
    
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
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
