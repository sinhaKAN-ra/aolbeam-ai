import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Cashfree credentials not configured');
      return NextResponse.json(
        { error: 'Payment provider not properly configured' },
        { status: 500 }
      );
    }

    // Initialize Supabase client
    const cookieStore = await cookies();
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;

    // Parse request body
    const body = await request.json();
    const { planId, customerDetails } = body;
    
    if (!planId || !customerDetails) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get plan details (in a real app, you would fetch this from the database)
    // For now we'll use hardcoded plan details, but ideally these should come from Supabase
    let planDetails;
    if (planId === 'premium_monthly') {
      planDetails = {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        amount: 199,
        currency: 'INR',
        interval: 'monthly',
        intervalCount: 1,
      };
    } else if (planId === 'pro_annual') {
      planDetails = {
        id: 'pro_annual',
        name: 'Pro Annual',
        amount: 1999,
        currency: 'INR',
        interval: 'yearly',
        intervalCount: 1,
      };
    } else {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Generate a unique subscription ID (standard UUID format) and order ID (formatted string)
    const subscriptionId = uuidv4(); // Use standard UUID format for database compatibility
    const cashfreeSubId = `sub_${uuidv4().replace(/-/g, '').substring(0, 16)}`; // Formatted ID for Cashfree
    const orderId = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const now = new Date();
    
    // Set return URL for after payment completion
    const returnUrl = `${APP_URL}/profile/subscriptions?subscription_id=${cashfreeSubId}&order_id=${orderId}&status=success`;
    const notifyUrl = `${APP_URL}/api/subscriptions/cashfree/webhook`;

    // Calculate next billing date
    let nextBillingDate = new Date(now);
    if (planDetails.interval === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + planDetails.intervalCount);
    } else if (planDetails.interval === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + planDetails.intervalCount);
    }
    
    // Create subscription in Cashfree
    const cashfreeBaseUrl = CASHFREE_MODE === 'sandbox' 
      ? 'https://sandbox.cashfree.com/pg' 
      : 'https://api.cashfree.com/pg';
      
    // Create initial subscription record in Supabase
    const subscriptionData = {
      id: subscriptionId,
      user_id: user.id,
      plan_id: planId,
      provider: 'cashfree',
      provider_subscription_id: cashfreeSubId,
      status: 'ACTIVE', // Will be updated after payment confirmation - must be uppercase to match enum
      amount: planDetails.amount,
      currency: planDetails.currency,
      interval: planDetails.interval,
      current_period_start: now.toISOString(),
      current_period_end: nextBillingDate.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: {
        planDetails,
        customerDetails
      },
    };

    // Insert the subscription record
    const { error: subInsertError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (subInsertError) {
      console.error('Error creating subscription record:', subInsertError);
      return NextResponse.json(
        { error: 'Failed to create subscription record' },
        { status: 500 }
      );
    }

    // Build Cashfree subscription parameters based on their API documentation
    const subscriptionPayload = {
      subscription_id: cashfreeSubId,
      plan_details: {
        plan_id: planId,
        plan_name: planDetails.name,
        plan_amount: Number(planDetails.amount), // Must be float for Cashfree API
        plan_currency: planDetails.currency,
        plan_description: `${planDetails.name} subscription`
      },
      customer_details: {
        customer_id: user.id,
        customer_name: customerDetails.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        customer_email: customerDetails.email || user.email,
        customer_phone: customerDetails.phone
      },
      subscription_note: `${planDetails.name} subscription`,
      return_url: returnUrl,
      subscription_meta: {
        notify_url: notifyUrl,
        udf1: 'metadata'
      },
      subscription_registration: {
        authentication: {
          method: "link",
          authentication_type: "netbanking"
        },
        first_payment: {
          amount: planDetails.amount.toString(), // Convert to string as per Cashfree docs
          currency: planDetails.currency
        }
      }
    };

    console.log('Creating Cashfree subscription', subscriptionPayload);

    // Call Cashfree API to create subscription with timeout and error handling
    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      console.log('Connecting to Cashfree API at:', cashfreeBaseUrl);
      response = await fetch(
        `${cashfreeBaseUrl}/subscriptions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-version': '2022-09-01',
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
          },
          body: JSON.stringify(subscriptionPayload),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
    } catch (error: any) {
      console.error('Network error connecting to Cashfree:', error.message, error.cause);
      return NextResponse.json({ 
        error: 'Unable to connect to Cashfree API. Please check your network connection or try again later.',
        details: error.message,
        code: error.cause?.code || 'NETWORK_ERROR'
      }, { status: 503 });
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Error creating Cashfree subscription:', data);
      return NextResponse.json({ error: data }, { status: 500 });
    }

    // Extract subscription_session_id and cf_subscription_id from the response
    const sessionId = data.subscription_session_id || data.session_id;
    const cfSubscriptionId = data.subscription_id || data.cf_subscription_id || cashfreeSubId;

    // No /subscriptions/authorize call needed for hosted checkout flow
    if (sessionId && cfSubscriptionId) {
      // Update subscription metadata with Cashfree response
      await supabase
        .from('subscriptions')
        .update({
          metadata: {
            ...subscriptionData.metadata,
            provider_response: data
          }
        })
        .eq('id', subscriptionId);
      // Return session and subscription IDs to the frontend
      return NextResponse.json({ subscriptionSessionId: sessionId, subscriptionId: cfSubscriptionId });
    } else {
      console.error('No session ID or subscription ID found in Cashfree response:', data);
      return NextResponse.json({ error: 'No session ID or subscription ID found in Cashfree response' }, { status: 500 });
    }

    // Create a corresponding payment order record
    const orderData = {
      user_id: user.id,
      plan_id: planId,
      amount: planDetails.amount,
      currency: planDetails.currency,
      payment_provider: 'cashfree',
      provider_order_id: data.subscription_id || subscriptionId,
      status: 'PENDING',
      subscription_id: subscriptionId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: {
        planDetails,
        customerDetails,
        provider_response: data
      }
    };

    const { error: orderInsertError } = await supabase
      .from('payment_orders')
      .insert(orderData);

    if (orderInsertError) {
      console.error('Error creating payment order record:', orderInsertError);
      // Continue despite error to avoid disrupting payment flow
    }

    // Return the payment link and subscription details
    return NextResponse.json({
      success: true,
      data: {
        subscription_id: subscriptionId,
        plan_id: planId,
        interval: planDetails.interval,
        amount: planDetails.amount
      }
    });
  } catch (error: any) {
    console.error('Unexpected error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
