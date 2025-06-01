import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with admin privileges for authenticated API routes
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// For server-side admin operations with subscriptions
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_MODE = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';

export async function POST(req: NextRequest) {
  try {
    // Use the service role client to verify subscriptions
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get data from request body
    const { subscriptionId, dbId, paymentRef } = await req.json();
    
    if (!subscriptionId && !dbId) {
      return NextResponse.json({ error: 'Missing subscription identifiers' }, { status: 400 });
    }

    // First check if subscription exists in our database
    let query = supabase.from('subscriptions').select('*');
    
    // Use database UUID if available, otherwise use provider subscription ID
    if (dbId) {
      query = query.eq('id', dbId);
    } else {
      query = query.eq('provider_subscription_id', subscriptionId);
    }
    
    const { data: existingSubscription, error: dbError } = await query.single();

    if (dbError || !existingSubscription) {
      console.error('Database error or subscription not found:', dbError);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // API base URL depends on environment
    const baseUrl = CASHFREE_MODE === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
    
    try {
      // Call Cashfree API to verify subscription status
      const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'GET',
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
          error: `Failed to verify subscription status with provider: ${errorData.message || response.statusText}` 
        }, { status: response.status });
      }

      // Get subscription details from Cashfree
      const subscriptionData = await response.json();
      
      // Map Cashfree subscription status to our status
      let status = existingSubscription.status;
      if (subscriptionData.subscription_status === 'ACTIVE') {
        status = 'ACTIVE';
      } else if (subscriptionData.subscription_status === 'CANCELLED') {
        status = 'CANCELLED';
      } else if (subscriptionData.subscription_status === 'EXPIRED') {
        status = 'EXPIRED';
      }
      
      // Update subscription in database
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingSubscription.metadata,
            provider_data: subscriptionData,
            last_verified: new Date().toISOString(),
          }
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        status,
        message: `Subscription ${status.toLowerCase()}`
      });
    } catch (apiError) {
      console.error('Error calling Cashfree API:', apiError);
      
      // Still return success if we have the subscription in our database
      // The webhook will eventually update the status if needed
      return NextResponse.json({
        success: true,
        status: existingSubscription.status,
        message: `Using existing subscription data (${existingSubscription.status.toLowerCase()})`
      });
    }
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
