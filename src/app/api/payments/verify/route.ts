import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient();
    
    // First, check if we have the payment in our database
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (dbError) throw dbError;

    if (subscription) {
      // If we have the subscription with a success status, return it
      if (subscription.status === 'ACTIVE' || subscription.status === 'SUCCESS') {
        return NextResponse.json({
          status: 'success',
          data: subscription,
        });
      }

      // If we have a payment ID, try to verify with Cashfree
      if (paymentId) {
        const cashfreeResponse = await fetch(
          `https://sandbox.cashfree.com/pg/orders/${orderId}/payments/${paymentId}`,
          {
            headers: {
              'x-client-id': process.env.CASHFREE_APP_ID!,
              'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
              'x-api-version': '2022-09-01',
            },
          }
        );

        if (!cashfreeResponse.ok) {
          const error = await cashfreeResponse.json();
          throw new Error(error.message || 'Failed to verify payment with Cashfree');
        }

        const paymentData = await cashfreeResponse.json();
        
        // Update the subscription status in our database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: paymentData.payment_status === 'SUCCESS' ? 'ACTIVE' : 'FAILED',
            payment_status: paymentData.payment_status,
            payment_id: paymentData.cf_payment_id,
            payment_message: paymentData.payment_message,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);

        if (updateError) throw updateError;

        return NextResponse.json({
          status: paymentData.payment_status === 'SUCCESS' ? 'success' : 'failed',
          message: paymentData.payment_message,
          data: paymentData,
        });
      }

      // If we don't have a payment ID but have the subscription, return its status
      return NextResponse.json({
        status: subscription.status.toLowerCase(),
        message: `Payment status: ${subscription.status}`,
        data: subscription,
      });
    }

    // If we don't have the subscription in our DB, try to fetch it from Cashfree
    const cashfreeResponse = await fetch(
      `https://sandbox.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID!,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
          'x-api-version': '2022-09-01',
        },
      }
    );

    if (!cashfreeResponse.ok) {
      const error = await cashfreeResponse.json();
      throw new Error(error.message || 'Failed to fetch order from Cashfree');
    }

    const orderData = await cashfreeResponse.json();
    
    // Save the order to our database
    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: orderData.customer_details.customer_id,
        order_id: orderData.order_id,
        amount: orderData.order_amount,
        currency: orderData.order_currency,
        status: orderData.order_status === 'PAID' ? 'ACTIVE' : 'PENDING',
        payment_gateway: 'cashfree',
        payment_status: orderData.payment_status,
        payment_id: paymentId || null,
        metadata: orderData,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      status: orderData.order_status === 'PAID' ? 'success' : 'pending',
      message: `Order status: ${orderData.order_status}`,
      data: newSubscription,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to verify payment',
      },
      { status: 500 }
    );
  }
}
