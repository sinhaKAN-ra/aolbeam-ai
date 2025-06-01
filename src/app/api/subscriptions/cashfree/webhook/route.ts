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
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-cashfree-signature');
    if (!signature) {
      console.error('Missing Cashfree signature');
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

    // Parse the JSON payload
    const payload = JSON.parse(rawBody.toString('utf8'));

    // Log the webhook for debugging
    console.log('Received Cashfree webhook:', JSON.stringify(payload));

    // Extract data from the webhook
    const { data } = payload;
    if (!data || !data.order) {
      console.error('Invalid webhook payload format');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { order } = data;
    const orderId = order.order_id;
    const orderStatus = order.order_status;

    // Find the associated subscription
    // Note: The webhook might contain either the order_id or the subscription_id
    // Try to find by provider_subscription_id first
    let { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('provider', 'cashfree')
      .eq('provider_subscription_id', orderId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors
      
    // If not found by order_id, try to find by subscription_id if it exists in the payload
    if (!subscriptionData && data.subscription && data.subscription.subscription_id) {
      const subscriptionId = data.subscription.subscription_id;
      ({ data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('provider', 'cashfree')
        .eq('provider_subscription_id', subscriptionId)
        .maybeSingle());
    }

    if (!subscriptionData) {
      console.log('Subscription not found for webhook event:', orderId);
      // This could be a one-time payment, not a subscription, or a test webhook
      return NextResponse.json({ success: true });
    }

    // Update the subscription status based on the payment status
    let newStatus = subscriptionData.status;
    if (orderStatus === 'PAID') {
      newStatus = 'ACTIVE';
    } else if (orderStatus === 'EXPIRED') {
      newStatus = 'EXPIRED';
    } else if (orderStatus === 'CANCELLED') {
      newStatus = 'CANCELLED'; // Using exact spelling from the database constraint
    } else if (orderStatus === 'FAILED') {
      newStatus = 'PAST_DUE';
    }

    // Update the subscription record
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: newStatus,
        metadata: {
          ...subscriptionData.metadata,
          webhook_data: payload,
        },
      })
      .eq('id', subscriptionData.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Also update the payment_orders record
    const { error: orderUpdateError } = await supabase
      .from('payment_orders')
      .update({
        status: orderStatus,
      })
      .eq('provider_order_id', orderId)
      .eq('payment_provider', 'cashfree');

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
      // Don't fail the request if order update fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Cashfree webhook:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
