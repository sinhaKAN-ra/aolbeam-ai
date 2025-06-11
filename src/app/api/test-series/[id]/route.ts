import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET /api/test-series/[id] - Get a single test series by ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  console.log(`GET request for test series with ID: ${id}`);
  try {
    const supabase = await createSupabaseServerClient();
    
    // User auth check - using getUser() for server-side authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the test series with additional info
    const { data, error } = await supabase
      .from('test_series')
      .select(`
        *,
        creator:creator_id(id, email),
        test_series_problems(*)
      `)
      .eq('id', id)
      .order('order_index', { referencedTable: 'test_series_problems' })
      .single();
    
    if (error) {
      console.error('Error fetching test series:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 });
    }

    // If the test series is private, only the creator can access it
    if (!data.is_public && data.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized. This is a private test series.' }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in test series GET by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/test-series/[id] - Update a specific test series
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
    const { id } = params;
    const body = await request.json();
    
    // Check if user is the creator of this test series
    const { data: testSeries, error: fetchError } = await supabase
      .from('test_series')
      .select('creator_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test series for update:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 });
    }
    
    if (testSeries.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the creator can update this test series' }, { status: 403 });
    }
    
    // Update test series
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = body.estimated_duration_minutes;
    if (body.tags !== undefined) updateData.tags = body.tags;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('test_series')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating test series:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in test series PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/test-series/[id] - Delete a specific test series
export async function DELETE(
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
    
    // Check if user is the creator of this test series
    const { data: testSeries, error: fetchError } = await supabase
      .from('test_series')
      .select('creator_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching test series for deletion:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!testSeries) {
      return NextResponse.json({ error: 'Test series not found' }, { status: 404 });
    }
    
    if (testSeries.creator_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only the creator can delete this test series' }, { status: 403 });
    }
    
    // Delete test series (cascade will handle deleting related problems)
    const { error } = await supabase
      .from('test_series')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting test series:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Test series deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in test series DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
