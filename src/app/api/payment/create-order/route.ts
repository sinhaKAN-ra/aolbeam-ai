import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, amount, currency } = body;

    // Validate the request
    if (!planId || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order in Cashfree
    const orderResponse = await fetch('https://api.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: `order_${Date.now()}`, // Generate unique order ID
        order_amount: amount,
        order_currency: currency,
        order_note: 'Subscription payment',
        customer_details: {
          customer_id: session.user.id,
          customer_email: session.user.email!,
          customer_phone: '9999999999' // Default phone number since it's not in session
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-test?order_id={order_id}&order_token={order_token}`
        }
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      console.error('Cashfree API error:', error);
      return NextResponse.json(
        { error: 'Failed to create order with Cashfree' },
        { status: 500 }
      );
    }

    const orderData = await orderResponse.json();

    // Store order details in Supabase
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        user_id: session.user.id,
        plan_id: planId,
        amount: amount,
        currency: currency,
        payment_provider: 'cashfree',
        provider_order_id: orderData.order_id,
        status: 'PENDING',
        metadata: {
          cashfree_order_id: orderData.order_id,
          cashfree_order_token: orderData.order_token
        }
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB insert fails, as the order is created in Cashfree
    }

    return NextResponse.json({
      orderId: orderData.order_id,
      orderToken: orderData.order_token,
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 