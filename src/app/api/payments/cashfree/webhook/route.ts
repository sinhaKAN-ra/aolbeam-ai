import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/client';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Verify webhook signature (important for security)
    const body = await request.text();
    const signature = (await headers()).get('x-webhook-signature');

    // Verify the webhook signature
    if (!verifyWebhookSignature(body, signature)) {
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

    // If payment is successful, update user's subscription status
    if (payment_status === 'SUCCESS') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('user_id, plan_id')
        .eq('order_id', order_id)
        .single();

      if (subscription) {
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: 'active',
            plan_id: subscription.plan_id,
            subscription_updated_at: new Date().toISOString(),
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
  if (!signature) return false;
  
  // Implement your signature verification logic here
  // This is a placeholder - you should verify the signature using your webhook secret
  // Example with crypto-js:
  // const computedSignature = CryptoJS.HmacSHA256(body, process.env.CASHFREE_WEBHOOK_SECRET!)
  //   .toString(CryptoJS.enc.Hex);
  // return computedSignature === signature;
  
  // For now, we'll return true to allow testing, but make sure to implement proper verification in production
  return true;
}
