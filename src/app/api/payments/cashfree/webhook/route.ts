import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // Log the incoming request for debugging
    console.log('Received webhook request');
    
    // Initialize the server-side Supabase client
    const supabase = await createSupabaseServerClient(true);
    
    // Get the raw body first (we need to clone the request to read it multiple times)
    const requestClone = request.clone();
    const body = await request.text();
    
    // Check if this is a test webhook (Cashfree sends an empty body for tests)
    if (request.method === 'POST' && body.trim() === '') {
      console.log('Test webhook received - responding with 200 OK');
      return new Response(JSON.stringify({ status: 'OK', message: 'Test webhook received' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    

    
    // Get the signature and other headers
    const signature = request.headers.get('x-webhook-signature');
    const webhookVersion = request.headers.get('x-webhook-version');
    const webhookTimestamp = request.headers.get('x-webhook-timestamp');
    
    console.log('Webhook version:', webhookVersion);
    console.log('Webhook timestamp:', webhookTimestamp);
    console.log('Webhook signature header:', signature);
    
    // Log the raw headers for debugging
    console.log('All headers:', Object.fromEntries(request.headers.entries()));

    // Verify the webhook signature
    const isSignatureValid = verifyWebhookSignature(body, signature, webhookTimestamp);
    console.log('Webhook signature verification result:', isSignatureValid);
    
    if (!isSignatureValid) {
      console.error('Invalid webhook signature');
      // For debugging, you might want to see the raw body that was used for verification
      console.log('Raw body used for verification:', body);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    console.log('Full webhook payload:', JSON.stringify(payload, null, 2));
    
    // Extract and standardize the order_id
    const { data: { order: { order_id: rawOrderId }, payment: { payment_status, payment_message } } } = payload;
    const order_id = String(rawOrderId).trim(); // Ensure consistent string format
    
    console.log('CRITICAL - Webhook processing order_id:', order_id);

    if (!order_id || !payment_status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map Cashfree payment_status to our internal subscription status
    let subscriptionStatus: string;
    switch (payment_status) {
      case 'SUCCESS':
        subscriptionStatus = 'ACTIVE';
        break;
      case 'PENDING':
        subscriptionStatus = 'PENDING';
        break;
      case 'FAILED':
        subscriptionStatus = 'FAILED';
        break;
      case 'CANCELLED':
        subscriptionStatus = 'CANCELLED';
        break;
      case 'EXPIRED':
        subscriptionStatus = 'EXPIRED';
        break;
      case 'INITIALIZED':
        subscriptionStatus = 'PENDING'; // Map INITIALIZED to PENDING to match our enum values
        break;
      default:
        subscriptionStatus = 'PENDING'; // Default to PENDING for safety
    }

    console.log(`Mapped Cashfree status '${payment_status}' to internal status '${subscriptionStatus}'`);

    // First, try to fetch the payment_order to confirm it's visible to this supabase client instance
    console.log('Attempting to fetch payment_order before update with provider_order_id:', order_id);
    const { data: preUpdatePaymentOrder, error: preUpdateError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('provider_order_id', order_id)
      .single();

    if (preUpdateError) {
      console.error('CRITICAL - Error fetching payment_order before update:', preUpdateError);
      return NextResponse.json(
        { error: 'Failed to find payment order before update' },
        { status: 500 }
      );
    }

    if (!preUpdatePaymentOrder) {
      console.warn('Payment order not found for provider_order_id:', order_id, 'before update. It might have been processed already or ID is incorrect.');
      return NextResponse.json(
        { error: 'Payment order not found' },
        { status: 404 }
      );
    }

    console.log('Payment order found before update:', preUpdatePaymentOrder);

    // Now, attempt the update
    console.log('Attempting to update payment_order with provider_order_id:', order_id);
    const { data: paymentOrderData, error: paymentOrderError, count: paymentOrderCount } = await supabase
      .from('payment_orders')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('provider_order_id', order_id);

    console.log('Supabase payment_orders update result - data:', paymentOrderData, 'count:', paymentOrderCount);

    if (paymentOrderError) {
      console.error('CRITICAL - Error updating payment_order:', paymentOrderError);
      return NextResponse.json(
        { error: 'Failed to update payment order' },
        { status: 500 }
      );
    }

    if (paymentOrderCount === 0) {
      console.warn('No payment_order found for provider_order_id:', order_id, 'to update. Update operation returned 0 count.');
    }

    // Log what we've updated in payment_orders
    if (paymentOrderData) {
      console.log('Successfully updated payment_order with status:', subscriptionStatus);
    }

    // If paymentOrderCount is 0, it means no record was found or updated
    if (paymentOrderCount === 0) {
      console.warn('No payment_order found for provider_order_id:', order_id);
      // Instead of failing, try to find the subscription directly by provider_order_id
      console.log('Attempting to find subscription directly by provider_order_id:', order_id);
    }

    let subscriptionId: string | null = null;
    let isSubscriptionPayment = false;

    // Fetch the associated subscription_id, plan_id, and user_id from payment_orders
    console.log('Querying payment_orders with provider_order_id:', order_id);
    const { data: fetchedPaymentOrder, error: fetchPaymentOrderError } = await supabase
      .from('payment_orders')
      .select('subscription_id, plan_id, user_id')
      .eq('provider_order_id', order_id)
      .single();

    if (fetchedPaymentOrder?.subscription_id) {
      subscriptionId = fetchedPaymentOrder.subscription_id;
      isSubscriptionPayment = true;
      console.log('Found associated subscription_id via payment_orders:', subscriptionId);
    } else {
      console.log('No subscription_id found in payment_orders. Assuming one-time payment.');
    }


    if (isSubscriptionPayment && subscriptionId) {
      // For subscriptions, update the subscription status in your database
      const { data: subscriptionData, error: subscriptionError, count: subscriptionCount } = await supabase
        .from('subscriptions')
        .update({
          status: subscriptionStatus,
          payment_status,
          payment_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId); // Use the subscriptionId fetched from payment_orders

      console.log('Supabase subscriptions update result - data:', subscriptionData, 'count:', subscriptionCount);

      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      if (subscriptionCount === 0) {
        console.warn('No subscription found for ID:', subscriptionId);
        return NextResponse.json(
          { error: 'Subscription not found or already processed' },
          { status: 404 }
        );
      }

      // If payment is successful, update the user's profile for subscriptions
      if (payment_status === 'SUCCESS') {
        // Get the subscription to get the user ID using the subscription_id we already fetched
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('id', subscriptionId) // Use the subscription_id we already retrieved
          .single();

        if (subscription?.user_id) {
          // Update the user's profile to mark as subscribed
          await supabase
            .from('user_profiles')
            .update({
              is_subscribed: true,
              subscription_plan_id: subscription.plan_id,
              subscription_started_at: new Date().toISOString(),
              last_payment_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.user_id);
        }
      }
    } else if (payment_status === 'SUCCESS' && fetchedPaymentOrder?.user_id && fetchedPaymentOrder?.plan_id) {
      // For one-time payments, if successful, update the user's profile directly
      console.log('Processing one-time payment success. Updating user profile.');
      await supabase
        .from('user_profiles')
        .update({
          // For one-time payments, we might not set is_subscribed to true unless it's a specific type of one-time purchase that grants subscription-like access.
          // For now, let's assume it updates last_payment_at and potentially a specific one-time purchase record.
          last_payment_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // You might also want to add a field like 'last_one_time_purchase_plan_id' or similar if needed.
        })
        .eq('id', fetchedPaymentOrder.user_id);
    } else if (payment_status === 'FAILED' && fetchedPaymentOrder?.user_id) {
      // For one-time payments that failed, you might want to log or handle this differently
      console.log('One-time payment failed for user:', fetchedPaymentOrder.user_id);
      // Optionally, update user profile to reflect failed payment or send notification
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to verify webhook signature
function verifyWebhookSignature(body: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !process.env.CASHFREE_SECRET_KEY) {
    console.error('Missing signature or CASHFREE_SECRET_KEY');
    return false;
  }
  
  try {
    // Log the received signature and secret key (in production, you might want to avoid logging the full secret key)
    console.log('Received signature:', signature);
    console.log('Using secret key:', process.env.CASHFREE_SECRET_KEY ? '***' : 'MISSING');
    
    // Create the HMAC-SHA256 signature
    // The signed payload is timestamp + raw_body
    if (!timestamp) {
      console.error('Timestamp is missing for signature verification.');
      return false;
    }
    const signedPayload = timestamp + body;
    
    const computedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(signedPayload)
      .digest('base64');
    
    console.log('Computed signature:', computedSignature);
    
    // Compare the signatures in a timing-safe manner
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );
    
    console.log('Signature verification result:', isSignatureValid);
    return isSignatureValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
