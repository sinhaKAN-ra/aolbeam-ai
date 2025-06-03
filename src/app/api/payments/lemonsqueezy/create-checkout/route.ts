// src/app/api/payments/lemonsqueezy/create-checkout/route.ts

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;

export async function POST(request: Request) {
  try {
    if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
      return NextResponse.json(
        { error: 'Lemon Squeezy credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await (await supabase).auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, customerEmail } = body;

    console.log('Received planId:', planId);
    console.log('Received customerEmail:', customerEmail);

    if (!planId || !customerEmail) {
      return NextResponse.json({ error: 'Missing planId or customerEmail' }, { status: 400 });
    }

    let checkoutUrl: string;

    switch (planId) {
      case 'monthly':
        checkoutUrl = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_URL!;
        break;
      case 'weekly':
        checkoutUrl = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_WEEKLY_URL!;
        break;
      case 'quarterly':
        checkoutUrl = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_QUARTERLY_URL!;
        break;
      // case 'yearly_pro':
      //   checkoutUrl = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_YEARLY_URL!; // Assuming you have this env var
      //   break;
      default:
        return NextResponse.json({ error: 'Invalid planId' }, { status: 400 });
    }

    // Append customer email and custom data to the checkout URL if needed
    // Lemon Squeezy supports pre-filling email with ?email= and custom data with &custom={key}:{value}
    const url = new URL(checkoutUrl);
    url.searchParams.set('email', customerEmail);
    url.searchParams.set('custom', `user_id:${user.id}`); // Pass user_id as custom data

    return NextResponse.json({ success: true, data: { paymentLink: url.toString() } });

  } catch (error) {
    console.error('Error creating Lemon Squeezy checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
