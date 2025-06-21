import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { Database } from '@/types/supabase';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user.id;
    const body = await request.json();
    
    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    // Use the database function to create test series with usage check
    const { data, error } = await supabase
      .rpc('create_test_series_with_usage_check', {
        p_title: body.title,
        p_description: body.description || null,
        p_creator_id: userId,
        p_is_public: body.is_public || false,
        p_estimated_duration: body.estimated_duration_minutes || null,
        p_tags: body.tags || null
      });
    
    if (error) {
      console.error('Error in create_test_series_with_usage_check:', error);
      
      // Handle test limit reached error specifically
      if (error.code === 'P0001') {
        return NextResponse.json({ 
          error: 'Test creation limit reached',
          code: 'TEST_LIMIT_REACHED',
          message: error.message || 'You have reached your test creation limit for your current plan.'
        }, { status: 403 });
      }
      
      // For other database errors
      return NextResponse.json({ 
        error: error.message || 'Failed to create test series',
        code: error.code || 'DATABASE_ERROR'
      }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to create test series',
        code: 'CREATION_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in test series POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}
