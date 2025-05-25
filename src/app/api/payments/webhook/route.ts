import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { headers } from 'next/headers';

// Verify the webhook signature (implementation depends on your payment provider)
async function verifyWebhookSignature(
  signature: string,
  payload: any,
  secret: string
): Promise<boolean> {
  // Implement signature verification based on your payment provider's documentation
  // This is a placeholder - you should implement proper signature verification
  return true;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const signature = request.headers.get('x-webhook-signature') || '';
    
    // Verify the webhook signature
    const isValid = await verifyWebhookSignature(
      signature,
      payload,
      process.env.PAYMENT_WEBHOOK_SECRET || ''
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Handle the webhook event
    const eventType = payload.event_type || payload.type;
    const orderId = payload.data?.order?.order_id || payload.resource?.id;
    
    if (!orderId) {
      console.error('No order ID found in webhook payload');
      return NextResponse.json(
        { error: 'No order ID found' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Update the subscription status based on the webhook event
    let status = 'PENDING';
    
    switch (eventType) {
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT.CAPTURE.COMPLETED':
        status = 'ACTIVE';
        break;
      case 'PAYMENT_FAILED':
      case 'PAYMENT.CAPTURE.DENIED':
        status = 'FAILED';
        break;
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT.CAPTURE.REFUNDED':
        status = 'REFUNDED';
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
        return NextResponse.json(
          { received: true },
          { status: 200 }
        );
    }

    // Update the subscription in the database
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status,
        payment_data: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    // If this is a successful payment, you might want to send a confirmation email, etc.
    if (status === 'ACTIVE' && data.user_id) {
      // Send confirmation email or perform other post-payment actions
      console.log(`Payment successful for order ${orderId}, user ${data.user_id}`);
    }

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
