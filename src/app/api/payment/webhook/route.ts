import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    const rawBody = await request.text();

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET!)
      .update(timestamp + rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);

    // Handle different event types
    switch (event.type) {
      case 'PAYMENT_SUCCESS':
        // Update order status in database
        const { error: updateError } = await supabase
          .from('payment_orders')
          .update({
            status: 'SUCCESS',
            metadata: {
              payment_id: event.data.payment.payment_id,
              payment_details: event.data.payment
            }
          })
          .eq('provider_order_id', event.data.order.order_id)
          .eq('payment_provider', 'cashfree');

        if (updateError) {
          console.error('Error updating order status:', updateError);
          return NextResponse.json(
            { error: 'Database update failed' },
            { status: 500 }
          );
        }

        // Here you can add additional logic like:
        // - Sending confirmation emails
        // - Updating user subscription status
        // - Triggering other business logic

        break;

      case 'PAYMENT_FAILED':
        // Update order status to failed
        await supabase
          .from('payment_orders')
          .update({
            status: 'FAILED',
            metadata: {
              failure_reason: event.data.payment.payment_message,
              payment_details: event.data.payment
            }
          })
          .eq('provider_order_id', event.data.order.order_id)
          .eq('payment_provider', 'cashfree');
        break;

      // Handle other event types as needed
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
} 