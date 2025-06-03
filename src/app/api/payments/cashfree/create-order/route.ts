import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique order IDs

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';

export async function POST(request: Request) {
  try {
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Cashfree credentials not configured' },
        { status: 500 }
      );
    }

    // Initialize Supabase client for route handler
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Valid authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount, // Changed from orderAmount
      currency = 'INR', // Changed from orderCurrency
      planId, // Expecting planId as well, though not directly used in Cashfree payload but good for logging/DB
      customerName,
      customerEmail,
      customerPhone,
      orderNote = 'One-time payment',
      paymentType = 'one-time', // Default to 'one-time' if not provided
    } = body;

    // Generate unique IDs
    const dbOrderId = uuidv4(); // Pure UUID for database primary key
    const cashfreeOrderId = `order_${Date.now()}_${dbOrderId.slice(0, 8)}`; // Format Cashfree prefers with order_ prefix
    
    // URLs for redirection and webhooks
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/subscription/callback?db_id=${dbOrderId}`; // Cashfree will append other parameters like payment_status, cf_payment_id
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cashfree/webhook`;

    // Validate required fields
    if (!amount || !customerName || !customerEmail || !customerPhone || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order payload
    const orderPayload = {
      order_id: cashfreeOrderId, // Use Cashfree-friendly ID format for the API
      order_amount: amount, // Use destructured amount
      order_currency: currency, // Use destructured currency
      customer_details: {
        customer_id: user.id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl,
        payment_methods: 'cc,dc,ppc,ccc,emi,paypal,upi,nb,app,paylater',
      },
      order_note: orderNote,
    };

    // Create order in Cashfree
    const response = await fetch(
      `${CASHFREE_MODE === 'sandbox' ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com'}/pg/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY
        },
        body: JSON.stringify(orderPayload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Cashfree API error:', error);
      return NextResponse.json(
        { error: 'Failed to create order in Cashfree' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Insert payment order
    const { error: paymentOrderError } = await supabase
      .from('payment_orders')
      .insert({
        id: dbOrderId, // Use pure UUID for database primary key
        user_id: user.id,
        plan_id: planId, // Ensure planId is saved to the database
        amount: amount, // Use destructured amount for DB
        currency: currency, // Use destructured currency for DB
        payment_provider: 'cashfree',
        provider_order_id: data.order_id,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...data,
          order_details: orderPayload
        },
        payment_type: paymentType, // Add payment_type to the database insert
      });
      
    if (paymentOrderError) {
      console.error('Error creating payment order:', paymentOrderError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({
      success: true,
      data: {
        payment_session_id: data.payment_session_id,
        order_id: data.order_id,
        order_token: data.order_token, // Include order_token for compatibility with older SDK versions
      },
    });
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
