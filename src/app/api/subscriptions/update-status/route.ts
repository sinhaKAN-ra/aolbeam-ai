import { createSupabaseServerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const requestBodyText = await request.text();
    console.log('[update-status API] Raw request body:', requestBodyText);

    if (!requestBodyText) {
      console.error('[update-status API] Received empty request body.');
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBodyText);
    } catch (parseError) {
      console.error('[update-status API] Error parsing JSON body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON format in request body', details: (parseError as Error).message },
        { status: 400 }
      );
    }

    const { subscription_id, status } = parsedBody;

    if (!subscription_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', subscription_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription status:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in update-status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
