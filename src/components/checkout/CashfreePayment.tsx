import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { PaymentHandlerProps } from '@/app/checkout/types';
import { createCashfreeOrder, initializeCashfreeWidget } from '@/services/cashfree';
import { useSupabase } from '@/hooks/useSupabase';

interface CashfreePaymentProps extends PaymentHandlerProps {
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
}

export const CashfreePayment: React.FC<CashfreePaymentProps> = ({
  plan,
  paymentType,
  customerPhone,
  setCustomerPhone,
  setPaymentError,
  setIsPaymentProcessing,
  user,
  session,
}) => {
  const router = useRouter();
  const supabase = useSupabase();
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isCashfreeLoading, setIsCashfreeLoading] = useState(false);

  const handleCashfreePayment = async () => {
    if (!customerPhone || !/^\d{10}$/.test(customerPhone.trim())) {
      setPaymentError('A valid 10-digit phone number is required for Cashfree payments.');
      setIsPaymentProcessing(false);
      return;
    }

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
    setIsCashfreeLoading(true);
    setPaymentError(null);

    try {
      // Create unique order ID
      const orderId = `order_${plan.id}_${Date.now()}`;
      
      // Create order via API
      const orderResponse = await createCashfreeOrder({
        orderId,
        orderAmount: plan.basePrice,
        orderCurrency: 'INR',
        customerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        customerEmail: user?.email || "",
        customerPhone: customerPhone,
        returnUrl: `${window.location.origin}/payment/success?orderId=${orderId}&amount=${plan.basePrice}&planId=${plan.id}&paymentMethod=cashfree`,
        isSubscription: paymentType === 'subscription',
        subscriptionDetails: paymentType === 'subscription' ? {
          planId: plan.id,
          interval: plan.interval || 'monthly',
        } : undefined,
      }, session.access_token);

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create Cashfree order');
      }

      // Store payment info in localStorage for fallback
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId,
        amount: plan.basePrice,
        planId: plan.id,
        paymentMethod: 'cashfree',
        paymentStatus: 'PENDING',
        userId: user.id,
        isSubscription: paymentType === 'subscription',
        timestamp: new Date().toISOString(),
      }));

      // If it's a subscription and we have a paymentLink, redirect to it
      if (paymentType === 'subscription' && orderResponse.data?.paymentLink) {
        // Store subscription info in localStorage before redirecting
        localStorage.setItem('lastPayment', JSON.stringify({
          orderId,
          amount: plan.basePrice,
          planId: plan.id,
          paymentMethod: 'cashfree',
          paymentStatus: 'PENDING',
          userId: user.id,
          isSubscription: true,
          subscriptionId: orderResponse.data?.subscription_id || null,
          interval: plan.interval || 'monthly'
        }));
        window.location.href = orderResponse.data.paymentLink;
        return;
      }

      // For one-time payments, initialize the widget
      await initializeCashfreeWidget({
        amount: plan.basePrice,
        appId: process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '',
        returnUrl: `${window.location.origin}/payment/success?orderId=${orderId}&amount=${plan.basePrice}&planId=${plan.id}&paymentMethod=cashfree`,
        theme: {
          widgetColor: '#2d2d2d',
          linkColor: '#4a90e2',
          cfLogoTheme: 'light',
          isLogoActive: true
        },
        onSuccess: (data) => {
          console.log('Payment successful:', data);
          // Store payment info in localStorage for success page
          localStorage.setItem('lastPayment', JSON.stringify({
            ...data,
            orderId,
            amount: plan.basePrice,
            planId: plan.id,
            paymentMethod: 'cashfree',
            paymentStatus: 'SUCCESS',
            userId: user.id,
          }));
          router.push(`/payment/success?orderId=${orderId}&amount=${plan.basePrice}&planId=${plan.id}&paymentMethod=cashfree&paymentStatus=SUCCESS`);
        },
        onFailure: (error) => {
          console.error('Payment failed:', error);
          setPaymentError(error?.message || 'Payment failed. Please try again or contact support.');
          setIsPaymentProcessing(false);
          setIsCashfreeLoading(false);
        },
      });
    } catch (error) {
      console.error('Cashfree payment error:', error);
      setPaymentError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while processing your payment. Please try again.'
      );
    } finally {
      setIsCashfreeLoading(false);
      setIsPaymentProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Label htmlFor="customer-phone">Phone Number</Label>
        <div className="flex gap-2 items-center">
          <Input
            id="customer-phone"
            type="tel"
            value={customerPhone}
            onChange={e => {
              // Only allow digits and limit to 10 characters
              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
              setCustomerPhone(value);
              setPhoneSaved(false);
              setPhoneError(null);
            }}
            placeholder="Enter your phone number"
            maxLength={15}
            required
            autoComplete="tel"
          />
          {user && customerPhone !== (user.phone || '') && /^\d{10}$/.test(customerPhone) && (
            <Button
              variant="secondary"
              size="sm"
              disabled={savingPhone}
              onClick={async () => {
                setSavingPhone(true);
                setPhoneError(null);
                try {
                  const { error } = await supabase.auth.updateUser({ phone: customerPhone });
                  if (error) {
                    setPhoneError('Failed to update phone: ' + error.message);
                    setPhoneSaved(false);
                  } else {
                    setPhoneSaved(true);
                    setPhoneError(null);
                  }
                } catch (err: any) {
                  setPhoneError('Failed to update phone: ' + (err.message || 'Unknown error'));
                  setPhoneSaved(false);
                }
                setSavingPhone(false);
              }}
            >
              {savingPhone ? 'Saving...' : 'Save to Profile'}
            </Button>
          )}
          {phoneSaved && (
            <span className="text-green-600 text-xs ml-2">Saved!</span>
          )}
          {phoneError && (
            <span className="text-red-600 text-xs ml-2">{phoneError}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Required for Cashfree payments. Must be exactly 10 digits.</p>
        {customerPhone && customerPhone.length !== 10 && (
          <p className="text-xs text-red-500 mt-1">{10 - customerPhone.length} {10 - customerPhone.length === 1 ? 'digit' : 'digits'} {customerPhone.length < 10 ? 'more' : 'less'} needed</p>
        )}
      </div>

      <Button
        onClick={handleCashfreePayment}
        className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
        size="lg"
        disabled={isCashfreeLoading || !user || !session || (!/^\d{10}$/.test(customerPhone.trim()))}
      >
        {isCashfreeLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {paymentType === 'subscription' ? plan?.price + '/mo' : plan?.oneTimePrice}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center text-xs text-muted-foreground">
        <Lock className="h-3 w-3 mr-1.5" />
        Secure payment. Your information is encrypted.
      </div>

      <div id="payment-container" className="mt-4 p-4 border rounded-lg bg-white">
        {isCashfreeLoading ? (
          <div className="flex items-center justify-center min-h-[100px]">
            <Loader2 className="animate-spin h-6 w-6 text-primary mr-2" />
            <span>Loading payment options...</span>
          </div>
        ) : (
          <div id="cashfree-widget" className="min-h-[200px] w-full flex items-center justify-center">
            <p className="text-gray-500">Click Pay to proceed with payment</p>
          </div>
        )}
      </div>
    </div>
  );
};
