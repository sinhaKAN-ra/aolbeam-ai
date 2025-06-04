import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // Log the incoming request for debugging
    console.log('Received webhook request');
    
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
    
    // Initialize the server-side Supabase client
    const cookieStore = cookies();
    const supabase = await createClient();
    
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
    const { data: { order_id, payment_status, payment_message } } = payload;

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
      default:
        subscriptionStatus = 'UNKNOWN'; // Handle any other unexpected statuses
    }

    // Update the subscription status in your database using provider_order_id
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscriptionStatus,
        payment_status,
        payment_message,
        updated_at: new Date().toISOString(),
      })
      .eq('provider_order_id', order_id);

    if (error) {
      console.error('Error updating subscription:', error);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // If payment is successful, update the user's profile
    if (payment_status === 'SUCCESS') {
      // Get the subscription to get the user ID
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('provider_order_id', order_id)
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
