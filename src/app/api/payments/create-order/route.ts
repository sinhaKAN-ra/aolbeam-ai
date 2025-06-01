import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// This is a placeholder for the actual Cashfree integration
// You'll need to install the Cashfree SDK and set up your credentials

// Mock function to simulate order creation
async function createCashfreeOrder(amount: number, currency: string, planId: string) {
  // In a real implementation, this would call the Cashfree API
  // For now, we'll return a mock response
  return {
    order_id: `order_${Date.now()}`,
    payment_session_id: `session_${Date.now()}`,
    payment_link: `https://checkout.cashfree.com/mock-payment-link?order_id=order_${Date.now()}`,
    order_status: 'ACTIVE',
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId, amount, currency = 'INR' } = await request.json();

    // Validate request
    if (!planId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate Cashfree credentials
    if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
      console.error('Cashfree credentials not configured');
      return NextResponse.json(
        { error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    // Generate a unique order ID
    const orderId = `order_${Date.now()}`;

    console.log('Creating Cashfree order with:', {
      orderId,
      amount,
      currency,
      customerId: user.id,
      customerEmail: user.email,
    });

    // Call Cashfree API to create order
    const cashfreeResponse = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: currency,
        customer_details: {
          customer_id: user.id,
          customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
          customer_email: user.email || '',
          customer_phone: user.phone || '',
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cashfree/webhook`,
          payment_methods: 'cc,dc,upi,netbanking,paylater,wallet',
        },
        order_note: `Subscription payment for plan: ${planId}`,
      }),
    });

    const responseData = await cashfreeResponse.json();
    console.log('Cashfree API response:', responseData);

    if (!cashfreeResponse.ok) {
      console.error('Cashfree API error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to create order',
          message: responseData.message || 'Payment gateway error',
          details: responseData
        },
        { status: cashfreeResponse.status }
      );
    }

    // Save the order details to your database
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: Number(amount),
        currency: currency,
        payment_provider: 'cashfree',
        provider_order_id: orderId,
        status: 'PENDING',
        metadata: responseData,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({
      order_id: responseData.order_id,
      payment_session_id: responseData.payment_session_id,
      payment_link: responseData.payment_link,
      order_status: responseData.order_status,
    });
  } catch (error) {
    console.error('Error in create order:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
