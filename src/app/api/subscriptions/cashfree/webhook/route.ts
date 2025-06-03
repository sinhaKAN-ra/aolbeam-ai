import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role for admin access (required for webhook)
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Helper to read the raw body from the request
async function getRawBody(request: Request): Promise<Buffer> {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.from('');
  let chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  return signature === computedSignature;
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Read the raw body for signature verification
    const rawBody = await getRawBody(request);
    
    // Log raw webhook data for debugging
    console.log('Received raw webhook data:', rawBody.toString('utf8'));
    
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-cashfree-signature');
    
    // For development/testing, allow webhooks without signature verification
    const skipSignatureVerification = process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_SIGNATURE === 'true';
    
    if (!skipSignatureVerification) {
      if (!signature) {
        console.error('Missing Cashfree signature');
        console.log('Headers received:', Object.fromEntries([...request.headers.entries()]));
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }
      
      if (!CASHFREE_SECRET_KEY) {
        console.error('Missing CASHFREE_SECRET_KEY');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      
      // Verify the signature
      if (!verifySignature(rawBody, signature, CASHFREE_SECRET_KEY)) {
        console.error('Invalid Cashfree webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.log('⚠️ Webhook signature verification skipped in development mode');
    }

    // Parse the JSON payload
    const payload = JSON.parse(rawBody.toString('utf8'));

    // Log the webhook for debugging
    console.log('Received Cashfree webhook payload:', JSON.stringify(payload, null, 2));

    // Extract data from the webhook
    const { data, event_time, event_type } = payload;
    
    console.log(`Processing Cashfree ${event_type} event from ${event_time}`);
    
    if (!data) {
      console.error('Invalid webhook payload format: missing data object');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // Handle different webhook event types
    if (event_type === 'SUBSCRIPTION_STATUS_CHANGE' && data.subscription) {
      // Handle subscription status change events
      return await handleSubscriptionStatusChange(data, supabase);
    } else if (event_type === 'PAYMENT_SUCCESS' || event_type === 'PAYMENT_FAILED' && data.order) {
      // Handle payment events
      return await handlePaymentEvent(data, supabase);
    } else {
      // Handle other event types or fallback to order-based processing
      return await handleGenericEvent(data, supabase);
    }
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Handle subscription status change events
async function handleSubscriptionStatusChange(data: any, supabase: any) {
  const { subscription } = data;
  if (!subscription || !subscription.subscription_id) {
    console.error('Invalid subscription data in webhook');
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
  }
  
  const subscriptionId = subscription.subscription_id;
  const subscriptionStatus = subscription.subscription_status;
  
  console.log(`Processing subscription status change: ${subscriptionId} -> ${subscriptionStatus}`);
  
  // Find the subscription in our database
  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('provider', 'cashfree')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();
    
  if (!subscriptionData) {
    console.log(`Subscription not found for ID: ${subscriptionId}`);
    return NextResponse.json({ success: false, message: 'Subscription not found' });
  }
  
  // Map Cashfree status to our status
  let newStatus = subscriptionData.status;
  if (subscriptionStatus === 'ACTIVE') {
    newStatus = 'ACTIVE';
  } else if (subscriptionStatus === 'CANCELLED') {
    newStatus = 'CANCELLED';
  } else if (subscriptionStatus === 'EXPIRED') {
    newStatus = 'EXPIRED';
  } else if (subscriptionStatus === 'ON_HOLD') {
    newStatus = 'PAST_DUE';
  }
  
  // Update the subscription record
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      metadata: {
        ...subscriptionData.metadata,
        webhook_data: data,
      },
    })
    .eq('id', subscriptionData.id);
    
  if (updateError) {
    console.error('Error updating subscription:', updateError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  
  console.log(`Successfully updated subscription ${subscriptionId} to status ${newStatus}`);

  // Determine periodEnd for user profile update
  const periodEnd = (newStatus === 'ACTIVE' || newStatus === 'TRIAL')
    ? (subscriptionData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    : null;

  // Update the user profile
  await updateUserProfile(
    supabase,
    subscriptionData.user_id,
    newStatus,
    subscriptionData.plan_id,
    periodEnd
  );

  return NextResponse.json({ success: true });
}

// Handle payment events
async function handlePaymentEvent(data: any, supabase: any) {
  const { order } = data;
  if (!order || !order.order_id) {
    console.error('Invalid order data in webhook');
    return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
  }
  
  const orderId = order.order_id;
  const orderStatus = order.order_status;
  
  console.log(`Processing payment event for order: ${orderId} with status: ${orderStatus}`);
  
  // Try to find the subscription by order ID
  let { data: subscriptionData, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('provider', 'cashfree')
    .eq('provider_subscription_id', orderId)
    .maybeSingle();
    
  // If not found directly, check payment_orders table to find associated subscription
  if (!subscriptionData) {
    const { data: orderData } = await supabase
      .from('payment_orders')
      .select('subscription_id')
      .eq('provider_order_id', orderId)
      .eq('payment_provider', 'cashfree')
      .maybeSingle();
      
    if (orderData?.subscription_id) {
      ({ data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', orderData.subscription_id)
        .maybeSingle());
    }
  }
  
  // Update the payment_orders record regardless of subscription
  const { error: orderUpdateError } = await supabase
    .from('payment_orders')
    .update({
      status: orderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_order_id', orderId)
    .eq('payment_provider', 'cashfree');
    
  if (orderUpdateError) {
    console.error('Error updating order:', orderUpdateError);
  }
  
  // If we found a subscription, update its status based on the payment status
  if (subscriptionData) {
    let newStatus = subscriptionData.status;
    if (orderStatus === 'PAID') {
      newStatus = 'ACTIVE';
    } else if (orderStatus === 'EXPIRED') {
      newStatus = 'EXPIRED';
    } else if (orderStatus === 'CANCELLED') {
      newStatus = 'CANCELLED';
    } else if (orderStatus === 'FAILED') {
      newStatus = 'PAST_DUE';
    }
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...subscriptionData.metadata,
          webhook_data: data,
        },
      })
      .eq('id', subscriptionData.id);
      
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    
    console.log(`Successfully updated subscription to status ${newStatus}`);

    // Determine periodEnd for user profile update
    const periodEnd = (newStatus === 'ACTIVE' || newStatus === 'TRIAL')
      ? (subscriptionData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      : null;

    // Update the user profile
    await updateUserProfile(
      supabase,
      subscriptionData.user_id,
      newStatus,
      subscriptionData.plan_id,
      periodEnd
    );
  } else {
    console.log(`No subscription found for order ${orderId}`);
  }
  
  return NextResponse.json({ success: true });
}

// Handle generic events or fallback processing
async function handleGenericEvent(data: any, supabase: any) {
  // Try to extract order information
  const order = data.order;
  if (order && order.order_id) {
    return await handlePaymentEvent(data, supabase);
  }
  
  // Try to extract subscription information
  const subscription = data.subscription;
  if (subscription && subscription.subscription_id) {
    return await handleSubscriptionStatusChange(data, supabase);
  }
  
  console.log('Unhandled webhook event type with data:', JSON.stringify(data, null, 2));
  return NextResponse.json({ success: true, message: 'Unhandled event type' });
}

// Helper function to update user profile with subscription information
async function updateUserProfile(
  supabase: any,
  userId: string,
  status: string,
  planId: string,
  periodEnd: string
) {
  try {
    const isSubscribed = status === 'ACTIVE' || status === 'TRIAL';
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        is_subscribed: isSubscribed,
        subscription_plan_id: isSubscribed ? planId : null,
        subscription_started_at: isSubscribed ? new Date().toISOString() : null,
        subscription_ends_at: isSubscribed ? periodEnd : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      
    if (error) {
      console.error('Error updating user profile:', error);
    } else {
      console.log(`User profile updated for user ${userId} with subscription status: ${status}`);
    }
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
  }
}
