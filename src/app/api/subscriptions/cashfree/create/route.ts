import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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

    // Debug: Log cookies received
    // Awaiting cookies() here to satisfy linter, which indicates it's a Promise in this context.
    const cookieStore = await cookies();
    console.log('Cookies received:', cookieStore.getAll());

    // Initialize Supabase client for route handler
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    // Debug: Log session data (safe)
    console.log('Supabase session:', session, 'Session error:', sessionError);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - Valid authentication required' }, { status: 401 });
    }
    const user = session.user;

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

    // Create initial order payload (no duplicate properties)
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
    const cashfreeBaseUrl = CASHFREE_MODE === 'sandbox' 
      ? 'https://sandbox.cashfree.com' 
      : 'https://api.cashfree.com';
      
    console.log('Creating Cashfree order with app ID:', CASHFREE_APP_ID ? '***' + CASHFREE_APP_ID.slice(-4) : 'undefined');
    console.log('Cashfree API URL:', `${cashfreeBaseUrl}/pg/orders`);
    
    const response = await fetch(
      `${cashfreeBaseUrl}/pg/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_APP_ID || '',
          'x-client-secret': CASHFREE_SECRET_KEY || '',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      }
    );
    
    console.log('Cashfree API response status:', response.status);

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
    
    // First, try to find an existing subscription
    const { data: existingSub, error: findSubError } = await supabase
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
      // Create a new subscription with proper status values
      const subscriptionData = {
        id: subscriptionId,
        user_id: user.id,
        plan_id: subscriptionDetails.planId,
        provider: 'cashfree',
        provider_subscription_id: data.order_id,
        status: 'TRIAL', // Will be updated to 'ACTIVE' after successful payment
        amount: orderAmount,
        currency: orderCurrency,
        interval: subscriptionDetails.interval,
        current_period_start: now.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        metadata: { 
          ...data,
          subscription_details: subscriptionDetails
        },
      };

      // First insert the subscription
      const { data: newSubscription, error: createSubError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (createSubError) {
        console.error('Error creating subscription record:', createSubError);
        // If subscription creation fails, we can't proceed with payment
        return NextResponse.json(
          { error: 'Failed to create subscription record', details: createSubError },
          { status: 500 }
        );
      }
      
      subscription = newSubscription;
      subscriptionId = newSubscription.id;
    }

    // Check for existing payment order (by provider_order_id)
    const { data: existingOrder, error: findOrderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('provider_order_id', data.order_id)
      .maybeSingle();

    if (!existingOrder) {
      const orderData = {
        user_id: user.id,
        plan_id: subscriptionDetails.planId,
        amount: orderAmount,
        currency: orderCurrency,
        payment_provider: 'cashfree',
        provider_order_id: data.order_id,
        status: 'PENDING', // Will be updated to 'SUCCESS' after payment confirmation
        subscription_id: subscriptionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...data,
          subscription_details: subscriptionDetails
        }
      };

      // Insert the payment order
      const { error: dbError } = await supabase
        .from('payment_orders')
        .insert(orderData);
        
      if (dbError) {
        console.error('Database error creating payment order:', dbError);
        // If we can't create the payment order, we should still return the payment session
        // but log the error for debugging
        console.error('Proceeding with payment despite order creation error');
      }
    }

    // Return the payment link in the response
    const paymentLink = data.payment_link || data.payments?.url;
    if (!paymentLink) {
      console.error('No payment link found in Cashfree response:', data);
      return NextResponse.json(
        { error: 'Payment link not found in Cashfree response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        payment_link: paymentLink,  // Ensure consistent naming with Cashfree's response
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
