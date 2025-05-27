import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// This is a placeholder for the actual PayPal integration
// You'll need to install the PayPal SDK and set up your credentials

// Mock function to simulate PayPal order creation
async function createPayPalOrder(amount: number, currency: string, planId: string) {
  // In a real implementation, this would call the PayPal API
  // For now, we'll return a mock response
  return {
    id: `PAYPAL-${Date.now()}`,
    status: 'CREATED',
    links: [
      {
        href: `https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-${Date.now()}`,
        rel: 'approve',
        method: 'GET',
      },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, amount, currency } = await req.json();
    
    if (!planId || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log the request details
    console.log('Creating PayPal order with:', {
      planId,
      amount,
      currency,
      userId: session.user.id
    });

    // Create order in PayPal
    const response = await fetch(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount,
              },
              description: `Subscription Plan: ${planId}`,
            },
          ],
          application_context: {
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
          },
        }),
      }
    );

    // Log the PayPal response
    console.log('PayPal API Response Status:', response.status);
    const responseData = await response.json();
    console.log('PayPal API Response:', responseData);

    if (!response.ok) {
      console.error('PayPal API Error:', responseData);
      return NextResponse.json(
        { 
          error: 'Failed to create PayPal order',
          details: responseData
        },
        { status: response.status }
      );
    }

    // Store order in database
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        user_id: session.user.id,
        plan_id: planId,
        amount: amount,
        currency: currency,
        payment_provider: 'paypal',
        provider_order_id: responseData.id,
        status: 'PENDING',
      });

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store order' },
        { status: 500 }
      );
    }

    // Return the approval URL
    const approvalUrl = responseData.links.find(
      (link: any) => link.rel === 'approve'
    )?.href;

    if (!approvalUrl) {
      console.error('No approval URL found in PayPal response');
      return NextResponse.json(
        { error: 'No approval URL received from PayPal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ approval_url: approvalUrl });
  } catch (error) {
    console.error('Unexpected error in create-paypal-order:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
