import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

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

    // Try to authenticate user in multiple ways
    let user;
    
    // Initialize Supabase client ONCE for all operations in this handler
    const dbSupabase = createServerComponentClient({ cookies: () => cookies() });
    // Use dbSupabase for ALL Supabase operations below
    
    // Check Authorization header first (Bearer token)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('Got token from header:', !!token); // Debug log
      
      try {
        // Initialize Supabase with the token
        const supabase = createServerComponentClient({ cookies: () => cookies() });
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          user = data.user;
          console.log('User authenticated via header token');
        } else {
          console.error('Auth error with header token:', error);
        }
      } catch (err) {
        console.error('Error validating token from header:', err);
      }
    }
    
    // If no user yet, try cookies as fallback
    if (!user) {
      const cookieStore = cookies();
      const supabase = createServerComponentClient({ cookies: () => cookieStore });
      const { data, error: authError } = await supabase.auth.getUser();
      if (!authError && data.user) {
        user = data.user;
        console.log('User authenticated via cookies');
      } else {
        console.error('Auth error with cookies:', authError);
      }
    }

    // Still no user? Return 401
    if (!user) {
      console.error('Authentication failed via all methods');
      return NextResponse.json(
        { error: 'Unauthorized - Valid authentication required' },
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
      notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/cashfree/webhook`,
      orderNote = 'Subscription payment',
      subscriptionDetails,
    } = body;

    // Validate required fields
    if (!orderId || !orderAmount || !customerName || !customerEmail || !customerPhone || !returnUrl || !subscriptionDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create initial order payload (similar to one-time payment)
    // This is a workaround since Cashfree doesn't have a native subscription API for their payment gateway
    // We'll handle the recurring billing on our side using webhooks and the user's saved payment method
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
          payment_methods: 'cc,dc,upi,nb,paylater',
        },
        order_note: `${orderNote} - ${subscriptionDetails.interval} subscription`,
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
        { error: 'Failed to create order in Cashfree', cashfreeError: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Calculate the current period and next billing date
    const now = new Date();
    let currentPeriodEnd = new Date(now);
    
    switch (subscriptionDetails.interval) {
      case 'weekly':
        currentPeriodEnd.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        currentPeriodEnd.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        currentPeriodEnd.setMonth(now.getMonth() + 3);
        break;
      case 'yearly':
        currentPeriodEnd.setFullYear(now.getFullYear() + 1);
        break;
      default:
        currentPeriodEnd.setMonth(now.getMonth() + 1); // Default to monthly
    }
    
    // Check for existing subscription (by user, plan, and provider_order_id)
    let subscriptionId = uuidv4();
    let subscription = null;
    let subError = null;
    const { data: existingSub, error: findSubError } = await dbSupabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', subscriptionDetails.planId)
      .eq('provider_subscription_id', data.order_id)
      .maybeSingle();

    if (existingSub) {
      subscription = existingSub;
      subscriptionId = existingSub.id;
    } else {
      const insertResult = await dbSupabase
        .from('subscriptions')
        .insert({
          id: subscriptionId,
          user_id: user.id,
          plan_id: subscriptionDetails.planId,
          provider: 'cashfree',
          provider_subscription_id: data.order_id, // Use Cashfree order ID as the subscription ID for now
          status: 'PENDING', // Will be updated to ACTIVE once payment is successful
          amount: orderAmount,
          currency: orderCurrency,
          interval: subscriptionDetails.interval,
          current_period_start: now.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          metadata: { 
            ...data,
            subscription_details: subscriptionDetails
          },
        })
        .select()
        .single();
      subscription = insertResult.data;
      subError = insertResult.error;
      if (subError) {
        console.error('Error creating subscription record:', subError);
        // Don't fail the request if DB save fails
      }
    }

    // Check for existing payment order (by provider_order_id)
    const { data: existingOrder, error: findOrderError } = await dbSupabase
      .from('payment_orders')
      .select('*')
      .eq('provider_order_id', data.order_id)
      .maybeSingle();

    if (!existingOrder) {
      const { error: dbError } = await dbSupabase
        .from('payment_orders')
        .insert({
          user_id: user.id,
          plan_id: subscriptionDetails.planId,
          amount: orderAmount,
          currency: orderCurrency,
          payment_provider: 'cashfree',
          provider_order_id: data.order_id,
          status: 'PENDING',
          subscription_id: subscriptionId,
          metadata: data,
        });
      if (dbError) {
        console.error('Database error:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payment_session_id: data.payment_session_id,
        order_id: data.order_id,
        subscription_id: subscriptionId,
        is_subscription: true,
      },
    });
  } catch (error) {
    console.error('Error creating Cashfree subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
