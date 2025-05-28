import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';

export async function POST(request: Request) {
  try {
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Cashfree credentials not configured' },
        { status: 500 }
      );
    }

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

    // Create order payload
    const orderPayload = {
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
    };

    // Create order in Cashfree
    const response = await fetch(
      `${CASHFREE_MODE === 'sandbox' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com'}/pg/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY
        },
        body: JSON.stringify(orderPayload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Cashfree API error:', error);
      return NextResponse.json(
        { error: 'Failed to create order in Cashfree' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
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
    console.error('Error creating Cashfree order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
