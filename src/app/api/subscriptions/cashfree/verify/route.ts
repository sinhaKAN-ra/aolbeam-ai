import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer'; // Correct import as per memory

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(); // Use the standardized client

    // Get data from request body - expecting cfPaymentId and dbId
    const { cfPaymentId, dbId } = await req.json();

    if (!dbId) {
      return NextResponse.json({ error: 'Missing database ID (dbId)' }, { status: 400 });
    }

    // 1. Fetch the Cashfree order_id (provider_order_id) from payment_orders table using dbId
    const { data: paymentOrder, error: paymentOrderError } = await supabase
      .from('payment_orders')
      .select('provider_order_id')
      .eq('id', dbId)
      .single();

    if (paymentOrderError || !paymentOrder) {
      console.error('Database error or payment order not found:', paymentOrderError);
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }

    const cashfreeOrderId = paymentOrder.provider_order_id;
    if (!cashfreeOrderId) {
      return NextResponse.json({ error: 'Cashfree Order ID not found for this dbId' }, { status: 404 });
    }

    // API base URL depends on environment
    const baseUrl = CASHFREE_MODE === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    try {
      // 2. Call Cashfree API to verify payment status for the order
      // Use cfPaymentId if available, otherwise fetch all payments for the order
      const cashfreeApiUrl = cfPaymentId 
        ? `${baseUrl}/orders/${cashfreeOrderId}/payments/${cfPaymentId}`
        : `${baseUrl}/orders/${cashfreeOrderId}/payments`;

      const response = await fetch(cashfreeApiUrl, {
        method: 'GET', // Cashfree payment verification is a GET request
        headers: {
          'Accept': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_APP_ID || '',
          'x-client-secret': CASHFREE_SECRET_KEY || '',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cashfree API error:', errorData);
        return NextResponse.json({
          error: `Failed to verify payment status with provider: ${errorData.message || response.statusText}`
        }, { status: response.status });
      }

      let paymentData;
      if (cfPaymentId) {
        paymentData = await response.json(); // Single payment object
      } else {
        const allPayments = await response.json(); // Array of payments
        // Assuming we want the latest payment if cfPaymentId is not provided
        paymentData = allPayments.length > 0 ? allPayments[0] : null; 
      }

      if (!paymentData) {
        return NextResponse.json({ error: 'No payment data found from Cashfree' }, { status: 404 });
      }

      // Map Cashfree payment status to our subscription status
      let newStatus = 'PENDING'; // Default
      if (paymentData.payment_status === 'SUCCESS') {
        newStatus = 'ACTIVE'; // Or 'SUCCESS' if your enum allows
      } else if (paymentData.payment_status === 'FAILED') {
        newStatus = 'FAILED';
      } else if (paymentData.payment_status === 'PENDING') {
        newStatus = 'PENDING';
      } else if (paymentData.payment_status === 'CANCELLED') {
        newStatus = 'CANCELLED';
      }

      // 3. Update the 'subscriptions' table with the new status
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          metadata: {
            ...paymentData, // Store full payment data from Cashfree
            last_verified: new Date().toISOString(),
          }
        })
        .eq('id', dbId); // Update using the dbId

      if (updateError) {
        console.error('Failed to update subscription status:', updateError);
        return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
      }

      console.log('Cashfree Verification Result:');
      console.log('Determined Status:', newStatus);
      console.log('Payment Data from Cashfree:', paymentData);

      return NextResponse.json({
        success: true,
        status: newStatus,
        message: `Payment ${newStatus.toLowerCase()}`
      });

    } catch (apiError: any) {
      console.error('Error calling Cashfree API:', apiError);
      return NextResponse.json({ error: `Cashfree API call failed: ${apiError.message}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 });
  }
}
