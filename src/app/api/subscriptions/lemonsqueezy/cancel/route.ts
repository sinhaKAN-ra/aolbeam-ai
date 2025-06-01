import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Get the subscription details
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if subscription is already cancelled
    if (subscription.status === 'CANCELLED' || subscription.cancel_at_period_end) {
      return NextResponse.json(
        { success: true, message: 'Subscription is already cancelled' }
      );
    }

    // If using LemonSqueezy, we need to call their API to cancel the subscription
    if (LEMONSQUEEZY_API_KEY && subscription.provider === 'lemonsqueezy') {
      try {
        const lemonResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.provider_subscription_id}`,
          {
            method: 'PATCH',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
              'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`
            },
            body: JSON.stringify({
              data: {
                type: 'subscriptions',
                id: subscription.provider_subscription_id,
                attributes: {
                  cancelled: true
                }
              }
            })
          }
        );

        if (!lemonResponse.ok) {
          const error = await lemonResponse.json();
          console.error('Error cancelling LemonSqueezy subscription:', error);
          return NextResponse.json(
            { error: 'Failed to cancel subscription with payment provider' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Error calling LemonSqueezy API:', error);
        return NextResponse.json(
          { error: 'Failed to communicate with payment provider' },
          { status: 500 }
        );
      }
    }

    // Update the subscription in the database to be cancelled at period end
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });
  } catch (error) {
    console.error('Error cancelling LemonSqueezy subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
