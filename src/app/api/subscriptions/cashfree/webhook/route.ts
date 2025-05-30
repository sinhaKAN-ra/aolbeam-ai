import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role for admin access (required for webhook)
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

export async function POST(request: Request) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify the webhook signature
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-cashfree-signature');
    if (!signature) {
      console.error('Missing Cashfree signature');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get the webhook payload
    const payload = await request.json();
    
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
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('provider', 'cashfree')
      .eq('provider_subscription_id', orderId)
      .single();
    
    if (subscriptionError) {
      console.error('Error finding subscription:', subscriptionError);
      // This could be a one-time payment, not a subscription
      return NextResponse.json({ success: true });
    }
    
    // Update the subscription status based on the payment status
    let newStatus = subscriptionData.status;
    
    if (orderStatus === 'PAID') {
      newStatus = 'ACTIVE';
    } else if (orderStatus === 'EXPIRED' || orderStatus === 'CANCELLED') {
      newStatus = orderStatus;
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
