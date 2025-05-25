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
    const supabase = await createClient();
    
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
        const { error: updateError } = await (await createClient())
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
      `https://api.cashfree.com/pg/orders/${orderId}/payments`,
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
      console.error('Cashfree API error:', error);
      throw new Error('Failed to verify payment with Cashfree');
    }

    const paymentData = await cashfreeResponse.json();
    
    // Process the payment data and update our database
    if (paymentData && paymentData.length > 0) {
      const latestPayment = paymentData[0];
      
      // Insert the subscription into our database
      const { data: newSubscription, error: insertError } = await (await createClient())
        .from('subscriptions')
        .insert({
          user_id: latestPayment.customer_id,
          order_id: orderId,
          payment_id: latestPayment.payment_id,
          amount: latestPayment.payment_amount,
          currency: latestPayment.payment_currency,
          status: latestPayment.payment_status === 'SUCCESS' ? 'ACTIVE' : latestPayment.payment_status,
          payment_method: latestPayment.payment_method?.channel || 'unknown',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json({
        status: latestPayment.payment_status === 'SUCCESS' ? 'success' : 'pending',
        message: `Order status: ${latestPayment.payment_status}`,
        data: newSubscription,
      });
    }

    // If we don't have any payment data, return an error
    return NextResponse.json({
      status: 'error',
      message: 'No payment data found',
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
