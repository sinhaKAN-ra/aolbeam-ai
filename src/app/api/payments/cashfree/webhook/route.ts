import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // Initialize the server-side Supabase client
    const cookieStore = cookies();
    const supabase = await createClient();
    
    // Get the raw body and signature
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');

    // Verify the webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
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

    // Update the subscription status in your database
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: payment_status === 'SUCCESS' ? 'ACTIVE' : 'FAILED',
        payment_status,
        payment_message,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

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
        .eq('order_id', order_id)
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
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.CASHFREE_WEBHOOK_SECRET) return false;
  
  try {
    const computedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
