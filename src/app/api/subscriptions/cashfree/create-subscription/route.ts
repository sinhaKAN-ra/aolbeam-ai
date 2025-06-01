import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getCashfreeServiceInstance } from '@/services/payment/cashfree/CashfreePaymentService';
import type { CashfreeSubscriptionRequestPayload } from '@/services/payment/cashfree/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
console.log('[create-subscription API] Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('[create-subscription API] Supabase Anon Key prefix:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 5));
  console.log('[create-subscription API] Supabase Service Role Key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5));
  try {
    // Cashfree credentials check is now handled by getCashfreeServiceInstance()

    // Initialize Supabase client
    const supabase = await createSupabaseServerClient();

    // Get the auth token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No auth token provided');
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Set the auth token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          details: userError?.message || 'No user found with the provided token'
        },
        { status: 401 }
      );
    }

    // Parse request body with validation
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { planId, customer_phone } = body;
    
    // Log the received data for debugging
    console.log('Received subscription request:', { planId, customer_phone });
    
    // Validate required parameters
    if (!planId || !customer_phone) {
      return NextResponse.json(
        { error: 'Missing required parameters: planId and customer_phone are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (typeof customer_phone !== 'string' || !/^\+?[0-9]{10,12}$/.test(customer_phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please provide a valid 10-12 digit phone number' },
        { status: 400 }
      );
    }

    // Format phone number to ensure it's in E.164 format (e.g., +911234567890)
    const formatPhoneNumber = (phone: string): string => {
      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // If number starts with country code, ensure it has + prefix
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned}`;
      }
      
      // If number is 10 digits, assume it's an Indian number and add +91
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      
      // If already in E.164 format, return as is
      if (cleaned.startsWith('+')) {
        return cleaned;
      }
      
      // Default: assume it's an Indian number and add +91
      return `+91${cleaned}`;
    };
    
    const formattedPhone = formatPhoneNumber(customer_phone);

    // Get plan details (in a real app, you would fetch this from the database)
    
    // Define plan details based on the selected plan
    // The interval must be one of: 'day', 'week', 'month', 'year'
    const isMonthly = planId.includes('monthly');
    const planDetails = {
      id: planId,
      name: isMonthly ? 'Premium Monthly' : 'Premium Yearly',
      amount: isMonthly ? 29900 : 299000, // in paise (₹299.00 or ₹2,990.00)
      currency: 'INR',
      // Use full interval name that matches the database enum
      interval: isMonthly ? 'monthly' : 'yearly',
      description: isMonthly ? 'Premium Monthly Plan' : 'Premium Yearly Plan'
    };
    
    console.log('Using plan details:', planDetails);

    // Generate a unique subscription ID (standard UUID format) and order ID (formatted string)
    const subscriptionId = uuidv4(); // Use standard UUID format for database compatibility
    const cashfreeSubId = `sub_${uuidv4().replace(/-/g, '').substring(0, 16)}`; // Formatted ID for Cashfree
    const orderId = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    const today = new Date();
    
    // Set return URL for after payment completion
    const returnUrl = `${APP_URL}/profile/subscriptions?subscription_id=${cashfreeSubId}&order_id=${orderId}&status=success`;
    const notifyUrl = `${APP_URL}/api/subscriptions/cashfree/webhook`;

    // Calculate next billing date
    const nextBillingDate = new Date(today);
    if (planDetails.interval === 'month') {
      nextBillingDate.setMonth(today.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(today.getFullYear() + 1);
    }

    // Create subscription in Cashfree
    // Create initial subscription record in Supabase
    const { data: subscription, error: subInsertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: 'PENDING',
        provider: 'cashfree',
        provider_subscription_id: cashfreeSubId,
        amount: planDetails.amount,
        currency: planDetails.currency,
        interval: planDetails.interval,
        current_period_start: today.toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        created_at: today.toISOString(),
        updated_at: today.toISOString(),
        metadata: {
          planDetails,
          customer_phone: formattedPhone,
          internal_cashfree_sub_id: cashfreeSubId
        },
      })
      .select()
      .single();

    if (subInsertError) {
      console.error('Error creating subscription record:', subInsertError);
      return NextResponse.json(
        { error: 'Failed to create subscription record', details: subInsertError.message },
        { status: 500 }
      );
    }

    const cashfreeService = getCashfreeServiceInstance();

    // Prepare the subscription payload for Cashfree
    const subscriptionPayload = {
      subscription_id: cashfreeSubId,
      plan_details: {
        plan_id: planId,
        plan_name: planDetails.name,
        type: planDetails.interval === 'monthly' ? 'PERIODIC' : 'CUSTOM',
        amount: planDetails.amount,
        interval: planDetails.interval === 'monthly' ? 'MONTH' : 'YEAR',
        intervals: 1,
        description: planDetails.description,
        currency: planDetails.currency
      },
      customer_details: {
        customer_id: user.id,
        customer_email: user.email || '',
        customer_phone: formattedPhone,
        customer_name: user.user_metadata?.full_name || ''
      },
      subscription_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl
      },
      subscription_note: `Subscription for ${planDetails.name}`,
      auth_attempts: 3, // Number of retry attempts for failed payments
      subscription_expiry_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    } as const; // Using 'as const' to ensure type safety

    console.log('Calling Cashfree service with payload:', subscriptionPayload);
    const serviceResponse = await cashfreeService.createSubscription(subscriptionPayload);

    if (!serviceResponse.success) {
      console.error('Cashfree service error:', serviceResponse.error);
      // Update the local subscription record to a 'failed' status
      await supabase
        .from('subscriptions')
        .update({
          status: 'FAILED',
          metadata: {
            planDetails,
            customer_phone: formattedPhone,
            internal_cashfree_sub_id: cashfreeSubId,
            cashfree_error: serviceResponse.error,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      return NextResponse.json(
        {
          error: 'Payment provider error',
          details: serviceResponse.error.message,
          provider_code: serviceResponse.error.code,
        },
        { status: 502 } // Bad Gateway, as we failed to interact with upstream service
      );
    }

    const cashfreeApiResult = serviceResponse.data;
    console.log('Cashfree subscription created via service:', cashfreeApiResult);

    // Update subscription with Cashfree details
    const mappedStatus = cashfreeApiResult.subscription_status?.toUpperCase();
    const finalStatus = mappedStatus === 'INITIALIZED' ? 'PENDING' : (mappedStatus || 'PENDING');

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        provider_subscription_id: cashfreeApiResult.cf_subscription_id, // Cashfree's persistent subscription ID
        status: finalStatus,
        metadata: {
          planDetails,
          customer_phone: formattedPhone,
          internal_cashfree_sub_id: cashfreeSubId,
          cashfree_response: cashfreeApiResult,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription with Cashfree ID:', updateError);
      // Non-fatal for the client, but needs monitoring. Client gets payment URL.
    }

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id, // Our internal Supabase subscription ID
      subscription_session_id: cashfreeApiResult.subscription_session_id, // For the payment page session
      auth_url: cashfreeApiResult.auth_link, // URL to redirect user for payment
    });

  } catch (error: any) { // This is the outer catch block
    console.error('Unexpected error in POST /api/subscriptions/cashfree/create-subscription:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected internal server error occurred.' },
      { status: 500 }
    );
  }
}
