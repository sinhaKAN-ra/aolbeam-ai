import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await (await supabase).auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, planId, amount, currency, status } = await req.json();
    
    if (!orderId || !planId || !amount || !currency || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store order in database
    const { error: dbError } = await (await supabase)
      .from('payment_orders')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        currency: currency,
        payment_provider: 'paypal',
        provider_order_id: orderId,
        status: status,
      });

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in store-paypal-order:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 