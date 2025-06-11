import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();


  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: testSeries, error } = await supabase
    .from('test_series')
    .select('id, title')
    .eq('creator_id', user.id);

  if (error) {
    console.error('Error fetching user test series:', error);
    return NextResponse.json({ error: 'Failed to fetch test series' }, { status: 500 });
  }

  return NextResponse.json(testSeries);
}
