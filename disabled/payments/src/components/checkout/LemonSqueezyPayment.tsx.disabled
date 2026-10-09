'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { PaymentHandlerProps } from '@/app/checkout/types';
import { loadLemonSqueezy, initializeLemonSqueezy, openCheckout } from '@/services/lemonsqueezy';

interface LemonSqueezyPaymentProps extends PaymentHandlerProps {}

// Add Lemon Squeezy checkout URLs
const LEMON_SQUEEZY_CHECKOUT_URLS: Record<string, string> = {
  weekly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_WEEKLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/weekly-variant-id',
  monthly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/monthly-variant-id',
  quarterly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_QUARTERLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/quarterly-variant-id',
};

export const LemonSqueezyPayment: React.FC<LemonSqueezyPaymentProps> = ({
  plan,
  paymentType,
  setPaymentError,
  setIsPaymentProcessing,
  user,
  session
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Load Lemon Squeezy SDK when the component mounts
  React.useEffect(() => {
    loadLemonSqueezy().catch(console.error);
  }, []);

  const handleLemonSqueezyPayment = async () => {
    if (!user || !session) {
      setPaymentError('You must be logged in to make a payment.');
      setIsPaymentProcessing(false);
      return;
    }

    if (!plan) {
      setPaymentError('Please select a plan to continue.');
      setIsPaymentProcessing(false);
      return;
    }
    
    setIsPaymentProcessing(true);
    setIsLoading(true);
    setPaymentError(null);
    
    try {
      // SDK should already be loaded by useEffect, but we'll ensure it's ready
      // by calling openCheckout which has the waiting mechanism.
      
      // Initialize with success handler
      initializeLemonSqueezy((data) => {
        console.log('Payment Success:', data);
        
        // Extract required data from Lemon Squeezy response
        const orderData = data.order.data;
        const orderId = orderData.id;
        const orderAttributes = orderData.attributes;
        
        // Store payment info in payment_orders table
        const paymentInfo = {
          orderId: orderId,
          paymentMethod: 'lemonsqueezy',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          amount: orderAttributes.total / 100, // Convert from cents to dollars
          currency: orderAttributes.currency,
          metadata: {
            orderNumber: orderAttributes.order_number,
            userEmail: orderAttributes.user_email,
            userName: orderAttributes.user_name,
            receiptUrl: orderAttributes.urls.receipt
          }
        };

        // Store payment info in localStorage
        localStorage.setItem('lastPayment', JSON.stringify(paymentInfo));

        // If this is a subscription, store subscription info
        if (paymentType === 'subscription') {
          const subscriptionInfo = {
            orderId: orderId,
            status: 'active',
            startDate: new Date().toISOString(),
            paymentMethod: 'lemonsqueezy',
            plan: plan.id,
            interval: plan.interval,
            isSubscription: true
          };
          localStorage.setItem('subscription', JSON.stringify(subscriptionInfo));
        }

        // Redirect to success page with all necessary parameters
        router.push(`/payment/success?token=${orderId}&payment_status=SUCCESS&payment_method=lemonsqueezy&plan_id=${plan.id}&amount=${orderAttributes.total / 100}&currency=${orderAttributes.currency}&payment_type=${paymentType}`);
      });

      // Open checkout - use different URLs for subscription vs one-time payment
      let checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URLS[plan.id];
      if (!checkoutUrl) {
        throw new Error('Checkout URL not found for this plan');
      }
      
      // For one-time payments, we can append a parameter or use a different URL
      if (paymentType === 'one-time') {
        checkoutUrl = `${checkoutUrl}?one_time=true`;
      }
      
      openCheckout(checkoutUrl);
    } catch (error) {
      console.error('Lemon Squeezy error:', error);
      setPaymentError(
        error instanceof Error 
          ? error.message 
          : 'Failed to initialize LemonSqueezy payment. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setIsPaymentProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleLemonSqueezyPayment}
        className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
        size="lg"
        disabled={isLoading || !user || !session}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {paymentType === 'subscription' ? plan?.baseNumericPrice + '/mo' : plan?.baseNumericPrice}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center text-xs text-muted-foreground">
        <Lock className="h-3 w-3 mr-1.5" />
        Secure payment. Your information is encrypted.
      </div>
    </div>
  );
};
