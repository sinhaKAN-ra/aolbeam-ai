import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { v4 as uuidv4 } from 'uuid';
import { getCashfreeServiceInstance } from '@/services/payment/cashfree/CashfreePaymentService';
import type { CashfreeSubscriptionRequestPayload } from '@/services/payment/cashfree/types';
import { plans } from '@/app/pricing/page'; // Import the plans array from pricing page
import type { SubscriptionPlan } from '@/types'; // Import the centralized SubscriptionPlan type


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Helper function to get the full details of a plan
const getPlanDetails = (planId: string): SubscriptionPlan | undefined => {
  return plans.find(p => p.id === planId);
};

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
      console.error('Authentication error:', userError);
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

    // Fetch user's current subscription details from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, subscription_plan_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('Warning: Error fetching user profile, proceeding as non-subscribed:', profileError.message);
      // Allow proceeding, will be treated as a new subscription if no active plan found by logic below
    }

    const targetPlan = getPlanDetails(planId);
    if (!targetPlan) {
      return NextResponse.json({ error: 'Invalid target plan ID.' }, { status: 400 });
    }

    let currentPlan: SubscriptionPlan | undefined;
    if (profile && profile.subscription_plan_id) {
      currentPlan = getPlanDetails(profile.subscription_plan_id);
    }

    // Validation Logic for plan changes
    if (profile && profile.is_subscribed && currentPlan) {
      // User has an active or recent subscription, apply change rules
      if (currentPlan.id === targetPlan.id) {
        return NextResponse.json({ error: 'Cannot select your current plan again.' }, { status: 400 });
      }

      if (currentPlan.type === 'subscription') {
        if (targetPlan.type === 'subscription') {
          const orderDiff = targetPlan.order - currentPlan.order;
          if (Math.abs(orderDiff) !== 1) {
            return NextResponse.json({ error: 'Can only upgrade or downgrade to the next/previous adjacent plan.' }, { status: 400 });
          }
          // If orderDiff is 1, it's an upgrade. If -1, it's a downgrade. Both are allowed here.
        } else {
          // Trying to switch from subscription to one-time
          return NextResponse.json({ error: 'Cannot switch from a subscription to a one-time plan directly. Please cancel your subscription first.' }, { status: 400 });
        }
      } else if (currentPlan.type === 'one_time') {
        if (targetPlan.type === 'subscription') {
          // Allowed: Switching from one-time to any subscription
        } else {
          // Switching from one-time to another one-time (essentially a new purchase, allowed)
          // Or if it's the same one-time plan, it would have been caught by currentPlan.id === targetPlan.id
        }
      }
    } else {
      // User is not subscribed, or profile/current plan couldn't be determined.
      // They can choose any plan (new subscription).
      console.log(`User ${user.id} is either not subscribed or current plan is undetermined. Allowing selection of plan ${targetPlan.id}.`);
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
    
    // targetPlan is the selected plan, already fetched and validated.
    const planDetails = targetPlan;

    // Extract numerical price from the string (e.g., '₹699' -> 699)
    const amount = parseFloat(planDetails.price.replace(/[^0-9.]/g, ''));
    if (isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid price format in plan configuration.' }, { status: 500 });
    }

    // Determine Cashfree plan type, interval, and intervals based on our plan structure
    let cfPlanType: 'PERIODIC' | 'CUSTOM' = 'CUSTOM';
    let cfInterval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' = 'MONTH'; // Default
    let cfIntervals = 1;

    if (planDetails.type === 'subscription') {
      cfPlanType = 'PERIODIC';
      if (planDetails.duration?.includes('/ week')) {
        cfInterval = 'WEEK';
        cfIntervals = 1;
      } else if (planDetails.duration?.includes('/ month')) {
        cfInterval = 'MONTH';
        cfIntervals = 1;
      } else if (planDetails.duration?.includes('/ 3 months')) {
        cfInterval = 'MONTH';
        cfIntervals = 3;
      } else if (planDetails.duration?.includes('/ year')) {
        cfInterval = 'YEAR';
        cfIntervals = 1;
      }
      // Add more conditions if other durations exist
    } else if (planDetails.type === 'one_time') {
      // For one-time, Cashfree subscriptions might not be the right API.
      // This flow is for 'subscriptions'. If one-time plans need a different Cashfree product (e.g. payment links),
      // this would need a separate API or logic branch.
      // For now, if it reaches here, we'll treat it as a 'CUSTOM' plan if Cashfree supports it for a single charge via subscription API.
      // Or, this path should be blocked by validation if one-time plans cannot use this endpoint.
      console.warn(`Attempting to create Cashfree subscription for one-time plan: ${planDetails.id}. This might need specific handling.`);
      // Defaulting to a one-time interpretation if possible, e.g., a plan that runs once.
      // This part is speculative based on Cashfree's flexibility with 'CUSTOM' plans.
      cfPlanType = 'CUSTOM'; // Or could be 'ON_DEMAND' if that's more appropriate and supported
      cfInterval = 'DAY'; // Smallest unit, effectively a single charge if intervals = 1 and it doesn't auto-renew
      cfIntervals = 1; 
    }

    const planDetailsObject = {
      id: planDetails.id,
      name: planDetails.name,
      amount: amount,
      interval: cfInterval, // Map duration to interval
      description: planDetails.features.join(', '),
      currency: 'INR' // Assuming Cashfree is always INR
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

    // Determine interval_type and interval_count for Supabase storage
    let dbIntervalType: string | undefined = undefined;
    let dbIntervalCount: number | undefined = undefined;

    if (planDetails.type === 'subscription') {
      if (planDetails.duration?.includes('/ week')) {
        dbIntervalType = 'week';
        dbIntervalCount = 1;
      } else if (planDetails.duration?.includes('/ month')) {
        dbIntervalType = 'month';
        dbIntervalCount = 1;
      } else if (planDetails.duration?.includes('/ 3 months')) {
        dbIntervalType = 'month';
        dbIntervalCount = 3;
      } else if (planDetails.duration?.includes('/ year')) {
        dbIntervalType = 'year';
        dbIntervalCount = 1;
      }
    } // For 'one_time', these might remain undefined or be set to a specific value

    // Insert initial subscription record into Supabase
    const { data: subscription, error: subInsertError } = await supabase
      .from('subscriptions')
      .insert({
        id: cashfreeSubId, // Use the same UUID for our internal record
        user_id: user.id,
        plan_id: planDetails.id,
        status: 'INITIATED', // Initial status before Cashfree interaction
        provider: 'cashfree',
        amount: amount, // Numeric amount parsed earlier
        currency: planDetails.currency || 'INR', // Currency from plan or default
        interval_type: dbIntervalType,
        interval_count: dbIntervalCount,
        metadata: {
          chosen_plan: planDetails, // Store the full chosen plan object from your config
          customer_phone: formattedPhone,
          internal_cashfree_sub_id: cashfreeSubId, // Link to the ID used with Cashfree
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    const subscriptionPayload: CashfreeSubscriptionRequestPayload = {
      subscription_id: cashfreeSubId, // Our internal unique ID for this attempt
      plan_details: {
        plan_id: planDetails.id, // Use our plan ID as Cashfree's plan_id
        plan_name: planDetails.name,
        type: cfPlanType,
        amount: amount,
        interval: cfInterval,
        intervals: cfIntervals,
        description: planDetails.description || `Subscription for ${planDetails.name}`,
        currency: planDetails.currency || 'INR' // Default to INR if not specified in plan
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
            chosen_plan: planDetails, // Store the full chosen plan object
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

    // Insert a record into payment_orders table
    const { error: paymentOrderInsertError } = await supabase
      .from('payment_orders')
      .insert({
        provider_order_id: cashfreeApiResult.order_id, // Cashfree's order ID
        subscription_id: subscription.id, // Our internal subscription ID
        status: 'PENDING', // Initial status for the payment order
        payment_status: cashfreeApiResult.payment_status || 'PENDING', // Initial payment status from Cashfree
        payment_message: cashfreeApiResult.payment_message || 'Payment initiated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (paymentOrderInsertError) {
      console.error('Error inserting into payment_orders:', paymentOrderInsertError);
      // This is a critical error, but we still proceed to update the subscription if possible
    }

    // Update subscription with Cashfree details
    const mappedStatus = cashfreeApiResult.subscription_status?.toUpperCase();
    const finalStatus = mappedStatus === 'INITIALIZED' ? 'PENDING' : (mappedStatus || 'PENDING');

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        provider_subscription_id: cashfreeApiResult.cf_subscription_id, // Cashfree's persistent subscription ID
        provider_order_id: cashfreeApiResult.order_id, // Store Cashfree's order ID for webhook lookup
        status: finalStatus,
        metadata: {
          chosen_plan: planDetails, // Store the full chosen plan object
          customer_phone: formattedPhone,
          internal_cashfree_sub_id: cashfreeSubId,
          cashfree_response: cashfreeApiResult,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription record with Cashfree details:', updateError);
    } else {
      // Verify the provider_order_id was successfully stored
      const { data: updatedSub, error: fetchError } = await supabase
        .from('subscriptions')
        .select('id, provider_order_id')
        .eq('id', subscription.id)
        .single();
      if (updatedSub) {
        console.log('Successfully updated subscription with provider_order_id in DB:', updatedSub.provider_order_id);
      } else if (fetchError) {
        console.error('Error fetching updated subscription to verify provider_order_id:', fetchError);
      }
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
