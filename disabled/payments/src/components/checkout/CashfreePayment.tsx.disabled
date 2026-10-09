import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { PaymentHandlerProps } from '@/app/checkout/types';
import { createCashfreeOrder, initializeCashfreeWidget } from '@/services/cashfree';
import { load as cashfreeLoad } from '@cashfreepayments/cashfree-js';
import { useSupabase } from '@/hooks/useSupabase';

interface CashfreePaymentProps extends PaymentHandlerProps {
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
}

const AVAILABLE_PLANS = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 199,
    interval: 'monthly',
    description: 'Access premium features, billed monthly.'
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: 1999,
    interval: 'yearly',
    description: 'Best value for professionals, billed yearly.'
  }
];

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
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);


  // Initialize Cashfree checkout
  const initializeCashfreeCheckout = async (cashfreeSubscriptionSessionId: string, dbSubscriptionId: string) => {
    console.log('[CashfreePayment] initializeCashfreeCheckout called with:', { cashfreeSubscriptionSessionId, dbSubscriptionId });
    
    if (!cashfreeSubscriptionSessionId) {
      console.error('[CashfreePayment] initializeCashfreeCheckout: cashfreeSubscriptionSessionId is missing!');
      setSubscriptionError('Failed to get payment session. Please try again.');
      setIsSubscribing(false);
      return;
    }
    
    if (!dbSubscriptionId) {
      console.error('[CashfreePayment] initializeCashfreeCheckout: dbSubscriptionId (our internal ID) is missing!');
      setSubscriptionError('Payment session obtained, but there might be an issue updating subscription status later.');
      // We'll still proceed with payment
    }
    
    try {
      // Log the raw subscription session ID for debugging
      console.log('[CashfreePayment] Raw subscription_session_id:', cashfreeSubscriptionSessionId);
      
      // Clean and validate the subscription session ID
      const cleanedSessionId = cashfreeSubscriptionSessionId.trim();
      if (!cleanedSessionId) {
        throw new Error('Subscription session ID is empty after cleaning');
      }
      
      // Load the Cashfree SDK using the npm package
      console.log('[CashfreePayment] Loading Cashfree SDK using npm package...');
      const mode = process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';
      const cashfree = await cashfreeLoad({ mode });
      
      if (!cashfree) {
        throw new Error('Failed to load Cashfree SDK from npm package');
      }
      
      // Use the checkout method from the npm package
      if (typeof cashfree.checkout !== 'function') {
        throw new Error('Cashfree SDK checkout method not available');
      }
      
      cashfree.checkout({
        paymentSessionId: cleanedSessionId,
        redirectTarget: '_blank',
        components: ['card', 'netbanking', 'wallet', 'upi', 'paylater'],
        theme: {
          color: '#7c3aed',
          backgroundColor: '#ffffff',
          errorColor: '#dc2626',
          themeColor: '#7c3aed',
          iconBackground: '#f5f3ff',
          hideHeader: false,
          hideOrderSummary: true,
        }
      });
      
      // For debugging
      console.log('[CashfreePayment] Cashfree SDK instance:', cashfree);

      // Update subscription status to PENDING using our internal DB ID
      if (dbSubscriptionId) {
        try {
          console.log('[CashfreePayment] Updating subscription status to PENDING...');
          await updateSubscriptionStatus(dbSubscriptionId, 'PENDING');
          console.log('[CashfreePayment] Subscription status updated to PENDING');
        } catch (updateError) {
          console.error('[CashfreePayment] Error updating subscription status:', updateError);
          // Don't block the payment flow for this error
          setSubscriptionError('Warning: Could not update subscription status, but continuing with payment...');
        }
      } else {
        console.warn('[CashfreePayment] dbSubscriptionId is missing, skipping updateSubscriptionStatus');
      }
      
      // Add a small delay to ensure any state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error initializing Cashfree checkout:', error);
      setSubscriptionError('Failed to initialize payment. Please try again.');
      setIsSubscribing(false);
    }
  };

  // Function to update subscription status in the backend
  const updateSubscriptionStatus = async (subscriptionId: string, status: string) => {
    console.log('[CashfreePayment] updateSubscriptionStatus called with:', { subscriptionId, status, accessTokenPresent: !!session?.access_token });
    if (!subscriptionId || !status) {
      console.error('[CashfreePayment] updateSubscriptionStatus: Missing subscriptionId or status. Aborting update.');
      return false;
    }
    try {
      const response = await fetch('/api/subscriptions/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          status: status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update subscription status:', errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      return false;
    }
  };

  // Set default selected plan if not set
  useEffect(() => {
    if (paymentType === 'subscription' && !selectedPlanId && AVAILABLE_PLANS.length > 0) {
      setSelectedPlanId(AVAILABLE_PLANS[0].id);
    }
  }, [paymentType, selectedPlanId]);

  const handleSubscribe = async () => {
    if (isSubscribing) return;
    if (!customerPhone || !/^\d{10}$/.test(customerPhone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    // Get selected plan ID or use the selected plan from props
    const planId = selectedPlanId || plan?.id;
    if (!planId) {
      setSubscriptionError('Please select a subscription plan');
      return;
    }
    
    try {
      setIsSubscribing(true);
      setSubscriptionError(null);
      setPaymentError?.(null);
      


      // Get the selected plan details
      // const selectedPlan = AVAILABLE_PLANS.find(p => p.id === planId) || {
      //   id: planId,
      //   name: plan?.name,
      //   price: plan?.price?.baseOriginalPrice / 100, // Convert cents to rupees
      //   interval: plan.interval
      // };

      // Create the subscription via our API
      console.log(`Creating subscription for plan: ${planId}, phone: ${customerPhone}`);
    const generatedOrderId = `order_${Date.now()}`;
    const returnAmount = plan?.baseOriginalPrice / 100 || 0; // Use actual plan price for return URL

    const orderResponse = await createCashfreeOrder({
      orderId: generatedOrderId,
      orderAmount: 1, // This will be replaced by the actual plan amount on the server
      orderCurrency: 'INR',
      customerName: user?.user_metadata?.full_name || user?.email || 'Guest',
      customerEmail: user?.email || 'guest@example.com',
      customerPhone: customerPhone.startsWith('+') ? customerPhone : `+91${customerPhone}`,
      returnUrl: `${window.location.origin}/payment/success?token=${generatedOrderId}&payment_status=SUCCESS&payment_method=cashfree&plan_id=${planId}&amount=${returnAmount}&currency=INR&payment_type=subscription`,
      isSubscription: true,
      subscriptionDetails: {
        planId: planId,
        interval: 'monthly', // This needs to be dynamic based on the selected plan
      },
    }, session?.access_token);

      if (!orderResponse.success) {
        throw new Error(orderResponse.error || 'Failed to create subscription order');
      }

      const { data } = orderResponse;
      
      if (!data || !data.payment_session_id || !data.order_id) {
        throw new Error('Invalid response from subscription creation API');
      }

      // Initialize Cashfree checkout with the session ID and our internal subscription ID
      initializeCashfreeCheckout(data.payment_session_id, data.order_id);

      // Update subscription status to PENDING using our internal DB ID
      if (data.order_id) {
        try {
          console.log('[CashfreePayment] Updating subscription status to PENDING...');
          await updateSubscriptionStatus(data.order_id, 'PENDING');
          console.log('[CashfreePayment] Subscription status updated to PENDING');
        } catch (updateError) {
          console.error('[CashfreePayment] Error updating subscription status:', updateError);
          // Don't block the payment flow for this error
          setSubscriptionError('Warning: Could not update subscription status, but continuing with payment...');
        }
      } else {
        console.warn('[CashfreePayment] order_id is missing, skipping updateSubscriptionStatus');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setSubscriptionError(
        error instanceof Error ? error.message : 'Failed to create subscription. Please try again.'
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  // Render phone number input section
  const renderPhoneNumberSection = () => (
    <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
      <h4 className="font-medium mb-3">Contact Information</h4>
      <div className="space-y-4">
        <div>
          <Label htmlFor="customer-phone" className="block text-sm font-medium mb-1">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCustomerPhone(value);
                  setPhoneError(null);
                  setPhoneSaved(false);
                }}
                placeholder="Enter your 10-digit phone number"
                className={phoneError ? 'border-red-500' : ''}
                maxLength={10}
                required
                autoComplete="tel"
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-600">{phoneError}</p>
              )}
              {customerPhone && customerPhone.length !== 10 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {10 - customerPhone.length} digit{10 - customerPhone.length === 1 ? '' : 's'} needed
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Required for payment verification. Standard messaging rates may apply.
              </p>
            </div>
            {user && customerPhone !== (user.phone || '') && /^\d{10}$/.test(customerPhone) && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 whitespace-nowrap"
                disabled={savingPhone}
                onClick={async () => {
                  setSavingPhone(true);
                  setPhoneError(null);
                  try {
                    const { error } = await supabase.auth.updateUser({ phone: customerPhone });
                    if (error) throw error;
                    setPhoneSaved(true);
                  } catch (err: any) {
                    setPhoneError('Failed to update phone: ' + (err.message || 'Unknown error'));
                    setPhoneSaved(false);
                  } finally {
                    setSavingPhone(false);
                  }
                }}
              >
                {savingPhone ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
          {phoneSaved && (
            <div className="mt-2 text-sm text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Phone number saved to your profile
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper function to render the subscription plan selection UI
  const renderSubscriptionUI = () => {
    const isPhoneValid = customerPhone && /^\d{10}$/.test(customerPhone);
    
    return (
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-4">Subscription Plan</h4>
        <div className="space-y-4">
          {AVAILABLE_PLANS.map((planItem) => (
            <div 
              key={planItem.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPlanId === planItem.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedPlanId(planItem.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium">{planItem.name}</h5>
                  <p className="text-sm text-muted-foreground">{planItem.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{planItem.price}/{planItem.interval === 'monthly' ? 'mo' : 'yr'}</p>
                  <p className="text-xs text-muted-foreground">
                    {planItem.interval === 'monthly' ? 'Billed monthly' : 'Billed annually'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubscribe}
            disabled={isSubscribing || !isPhoneValid}
          >
            {isSubscribing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe Now
              </>
            )}
          </Button>
          {!isPhoneValid && customerPhone.length > 0 && (
            <p className="mt-2 text-sm text-red-600 text-center">
              Please enter a valid 10-digit phone number
            </p>
          )}
          {subscriptionError && (
            <p className="mt-2 text-sm text-red-600">{subscriptionError}</p>
          )}
        </div>
      </div>
    );
  };

  // Helper function to handle one-time payment
  const handleOneTimePayment = async () => {
    // Implement your one-time payment logic here
    console.log('Initiating one-time payment');
    // Add your payment processing logic
  };

  // Helper function to render the one-time payment UI
  const renderOneTimePaymentUI = () => {
    const isPhoneValid = customerPhone && /^\d{10}$/.test(customerPhone);
    
    return (
      <div className="space-y-4">
        <Button
          onClick={handleOneTimePayment}
          className="w-full"
          size="lg"
          disabled={isCashfreeLoading || !user || !session || !isPhoneValid}
        >
          {isCashfreeLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay {plan?.oneTimePrice || '₹0'}
            </>
          )}
        </Button>
        
        {!isPhoneValid && customerPhone.length > 0 && (
          <p className="text-sm text-red-600 text-center">
            Please enter a valid 10-digit phone number
          </p>
        )}

        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3 mr-1.5" />
          Secure payment. Your information is encrypted.
        </div>

        <div id="payment-container" className="p-4 border rounded-lg bg-white">
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Payment Method</h3>
        <p className="text-sm text-muted-foreground">
          Complete your payment using Cashfree
        </p>
      </div>

      {/* Phone number input - shown for both payment types */}
      {renderPhoneNumberSection()}

      {/* Payment type specific UI */}
      <div className="space-y-4">
        {paymentType === 'subscription' ? renderSubscriptionUI() : renderOneTimePaymentUI()}
      </div>
    </div>
  );
};
