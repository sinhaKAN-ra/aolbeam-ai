import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-series - Get all test series for the current user (created by them or shared with them)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sharedOnly = url.searchParams.get('sharedOnly') === 'true';
    const createdOnly = url.searchParams.get('createdOnly') === 'true';
    const publicOnly = url.searchParams.get('publicOnly') === 'true';

    let query = supabase.from('test_series').select(`
      *,
      test_series_problems(*),
      test_series_shares(*),
      user_profiles(id, email, full_name)
    `);

    let sharedSeriesIds: string[] = [];

    // Fetch shared series IDs if needed
    if (sharedOnly || (!sharedOnly && !createdOnly && !publicOnly)) {
      const { data: sharedIdsData, error: sharedIdsError } = await supabase
        .from('test_series_shares')
        .select('test_series_id')
        .eq('shared_with_id', userId);

      if (sharedIdsError) {
        console.error('Error fetching shared series IDs:', sharedIdsError);
        return NextResponse.json({ error: sharedIdsError.message }, { status: 500 });
      }
      sharedSeriesIds = sharedIdsData?.map((item: any) => item.test_series_id) || [];
    }

    if (sharedOnly) {
      query = query.in('id', sharedSeriesIds);
    } else if (createdOnly) {
      query = query.eq('creator_id', userId);
    } else if (publicOnly) {
      query = query.eq('is_public', true);
    } else {
      // Default: Get test series created by user, shared with user, and all public test series
      let conditions = [`is_public.eq.true`, `creator_id.eq.${userId}`];

      if (sharedSeriesIds.length > 0) {
        conditions.push(`id.in.(${sharedSeriesIds.map(id => `'${id}'`).join(',')})`);
      }
      
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching test series:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unhandled error in GET /api/test-series:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/test-series - Create a new test series
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
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    // Create test series
    const { data, error } = await supabase
      .from('test_series')
      .insert({
        title: body.title,
        description: body.description || null,
        creator_id: userId,
        is_public: body.is_public || false,
        estimated_duration_minutes: body.estimated_duration_minutes || null,
        tags: body.tags || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test series:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in test series POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
