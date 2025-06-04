// src/lib/payment.ts

import { CheckoutPlanInfo, PaymentProvider, PaymentType, OrderResponse } from '@/app/checkout/types';
import { User, Session } from '@supabase/supabase-js';
import { load } from '@cashfreepayments/cashfree-js';
import { openCheckout } from '@/services/lemonsqueezy'; // Added import

interface InitiatePaymentArgs {
  plan: CheckoutPlanInfo | null;
  paymentType: PaymentType;
  paymentMethod: PaymentProvider | null;
  customerPhone: string;
  setPaymentError: (error: string | null) => void;
  setIsPaymentProcessing: (processing: boolean) => void;
  user: User | null;
  session: Session | null;
  finalAmount: number; // Amount to be charged, could be marked up
}

export const initiatePayment = async ({
  plan,
  paymentType,
  paymentMethod,
  customerPhone,
  setPaymentError,
  setIsPaymentProcessing,
  user,
  session,
  finalAmount,
}: InitiatePaymentArgs) => {
  setPaymentError(null);

  if (!plan || !paymentMethod || !paymentType || !user || !session) {
    setPaymentError('Missing payment details or user information.');
    setIsPaymentProcessing(false);
    return;
  }

  console.log(`[initiatePayment] paymentMethod: ${paymentMethod}, paymentType: ${paymentType}`);

  try {
    let response: Response;
    let orderData: OrderResponse;

    if (paymentMethod === 'cashfree' && paymentType === 'one-time') {
      response = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id, // Original plan ID
          amount: finalAmount,
          currency: plan.currencySymbol === '₹' ? 'INR' : (plan.currencySymbol === '$' ? 'USD' : plan.currencySymbol),
          customerEmail: user.email,
          customerPhone: customerPhone,
          customerName: user.user_metadata.full_name || user.email,
        }),
      });
      orderData = await response.json();

      if (orderData.success && orderData.data?.payment_session_id) {
        const cashfree = await load({
          mode: process.env.NEXT_PUBLIC_CASHFREE_MODE === 'PROD' ? 'production' : 'sandbox',
        });

        console.log('Cashfree SDK loaded:', cashfree);
        console.log('Cashfree checkout object:', cashfree?.checkout);

        const checkoutOptions = {
          paymentSessionId: orderData.data.payment_session_id,
          redirectTarget: '_self' as const,
        };

        setIsPaymentProcessing(false);
        cashfree?.checkout(checkoutOptions);
      } else {
        setPaymentError(orderData.error || 'Failed to create Cashfree order.');
        setIsPaymentProcessing(false);
      }
    } else if (paymentMethod === 'cashfree' && paymentType === 'subscription') {
      // Handle Cashfree subscription creation
      response = await fetch('/api/subscriptions/cashfree/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          amount: finalAmount,
          currency: plan.currencySymbol === '₹' ? 'INR' : (plan.currencySymbol === '$' ? 'USD' : plan.currencySymbol),
          customerEmail: user.email,
          customerPhone: customerPhone,
          customerName: user.user_metadata.full_name || user.email,
        }),
      });
      orderData = await response.json();

      if (orderData.success && orderData.data?.auth_url) {
        window.location.href = orderData.data.auth_url; // Redirect to Cashfree for subscription payment
      } else {
        setPaymentError(orderData.error || 'Failed to create Cashfree subscription.');
        setIsPaymentProcessing(false);
      }
    } else if (paymentMethod === 'lemonsqueezy' && paymentType === 'subscription') {
      response = await fetch('/api/payments/lemonsqueezy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          customerEmail: user.email,
        }),
      });
      orderData = await response.json();

      if (orderData.success && orderData.data?.paymentLink) {
        openCheckout(orderData.data.paymentLink); // Use openCheckout service function
      } else {
        setPaymentError(orderData.error || 'Failed to create Lemon Squeezy checkout.');
        setIsPaymentProcessing(false);
      }
    } else {
      setPaymentError('Invalid payment method or type selected.');
      setIsPaymentProcessing(false);
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    setPaymentError('An unexpected error occurred during payment. Please try again.');
    setIsPaymentProcessing(false);
  }
};
