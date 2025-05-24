import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      orderId,
      orderAmount,
      orderCurrency = 'INR',
      customerName,
      customerEmail,
      customerPhone,
      returnUrl,
      notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cashfree/webhook`,
      orderNote = 'Subscription payment',
    } = body;

    // Validate required fields
    if (!orderId || !orderAmount || !customerName || !customerEmail || !customerPhone || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Call Cashfree API to create order
    const cashfreeResponse = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': '2022-09-01',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: user.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
          payment_methods: 'cc,dc,upi,netbanking,paylater,wallet',
        },
        order_note: orderNote,
      }),
    });

    if (!cashfreeResponse.ok) {
      const error = await cashfreeResponse.json();
      console.error('Cashfree API error:', error);
      return NextResponse.json(
        { error: 'Failed to create order', details: error },
        { status: cashfreeResponse.status }
      );
    }

    const data = await cashfreeResponse.json();
    
    // Save the order details to your database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        order_id: orderId,
        amount: orderAmount,
        currency: orderCurrency,
        status: 'PENDING',
        payment_gateway: 'cashfree',
        payment_session_id: data.payment_session_id,
        metadata: data,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({
      success: true,
      data: {
        payment_session_id: data.payment_session_id,
        order_id: data.order_id,
        order_token: data.order_token,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
