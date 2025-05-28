import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase client will be initialized only when needed
let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Safely gets the Supabase client, initializing it if necessary
 * Returns null if Supabase is not configured
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase configuration is missing. Webhook events will be logged but not saved to the database.');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return null;
  }
}

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
    console.log(`Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'PAYMENT_SUCCESS':
        try {
          const supabase = getSupabaseClient();
          let databaseUpdated = false;
          
          if (supabase) {
            try {
              // Update order status in database
              const { error: updateError } = await supabase
                .from('payment_orders')
                .update({
                  status: 'SUCCESS',
                  metadata: {
                    payment_id: event.data.payment.payment_id,
                    payment_details: event.data.payment
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('provider_order_id', event.data.order.order_id)
                .eq('payment_provider', 'cashfree');

              if (updateError) {
                console.error('Error updating order status:', updateError);
              } else {
                console.log('Successfully updated order status in database');
                databaseUpdated = true;
              }
            } catch (dbError) {
              console.error('Database update error:', dbError);
              // Continue processing even if database update fails
            }
          } else {
            console.warn('Supabase not configured. Webhook event will not be saved to database.');
          }

          // Here you can add additional logic like:
          // - Sending confirmation emails
          // - Updating user subscription status
          // - Triggering other business logic

          return NextResponse.json({ 
            success: true,
            message: 'Payment processed successfully',
            databaseUpdated
          });
        } catch (error) {
          console.error('Error processing PAYMENT_SUCCESS event:', error);
          return NextResponse.json(
            { error: 'Error processing payment success' },
            { status: 500 }
          );
        }

      case 'PAYMENT_FAILED':
        try {
          const supabase = getSupabaseClient();
          let databaseUpdated = false;
          
          if (supabase) {
            try {
              // Update order status to failed
              await supabase
                .from('payment_orders')
                .update({
                  status: 'FAILED',
                  metadata: {
                    failure_reason: event.data.payment.payment_message,
                    payment_details: event.data.payment
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('provider_order_id', event.data.order.order_id)
                .eq('payment_provider', 'cashfree');
              console.log('Successfully updated order status to failed in database');
              databaseUpdated = true;
            } catch (dbError) {
              console.error('Database update error:', dbError);
              // Continue processing even if database update fails
            }
          } else {
            console.warn('Supabase not configured. Logging payment failed event:', event);
          }

          return NextResponse.json({ 
            success: true,
            message: 'Payment failed',
            databaseUpdated
          });

        } catch (error) {
          console.error('Error processing PAYMENT_FAILED event:', error);
          return NextResponse.json(
            { error: 'Error processing payment failure' },
            { status: 500 }
          );
        }

      // Handle other event types as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ 
          success: true, 
          message: `Unhandled event type: ${event.type}`,
          databaseUpdated: false
        });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}