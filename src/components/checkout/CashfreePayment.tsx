import React, { useState, useEffect } from 'react';
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

// Example: List of plans (ideally fetched from your backend or Supabase, but here hardcoded for demo)
const AVAILABLE_PLANS = [
  {
    id: 'premium_monthly', // Use this as planId in Cashfree
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
}): React.ReactNode => {
  const router = useRouter();
  const supabase = useSupabase();
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isCashfreeLoading, setIsCashfreeLoading] = useState(false);
  const [isCashfreeSdkLoaded, setIsCashfreeSdkLoaded] = useState(false);
  const [sdkLoadAttempts, setSdkLoadAttempts] = useState(0);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(AVAILABLE_PLANS[0].id);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string|null>(null);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    setSubscriptionError(null);
    setPaymentError?.(null);
    
    // First check if SDK is loaded
    if (!isCashfreeSdkLoaded) {
      console.log('Cashfree SDK not loaded yet, attempting to load...');
      // Trigger a reload of the SDK
      setSdkLoadAttempts(prev => prev + 1);
      
      // Wait for SDK to load before proceeding
      const maxWaitTime = 5000; // 5 seconds max wait
      const startTime = Date.now();
      
      while (!isCashfreeSdkLoaded && (Date.now() - startTime < maxWaitTime)) {
        // Wait 500ms and check again
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // @ts-ignore
        if (window.Cashfree) {
          console.log('Cashfree SDK detected during wait loop');
          setIsCashfreeSdkLoaded(true);
          break;
        }
      }
      
      // If SDK still not loaded after waiting, show error
      // @ts-ignore
      if (!window.Cashfree) {
        setSubscriptionError('Payment gateway not loaded. Please refresh the page and try again.');
        setIsSubscribing(false);
        return;
      }
    }
    
    try {
      // Call backend to create subscription
      const response = await fetch("/api/subscriptions/cashfree/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          customerPhone,
          customerDetails: {
            name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
            email: user?.email,
            phone: customerPhone
          }
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || "Failed to create subscription");
      }

      // Use Cashfree JS SDK to open the subscription checkout
      if (data.subscriptionSessionId) {
        console.log('Subscription session ID received:', data.subscriptionSessionId);
        
        // Get a fresh reference to the SDK
        // @ts-ignore
        const cashfreeSDK = window.Cashfree;
        
        if (!cashfreeSDK) {
          throw new Error('Cashfree SDK not available. Please refresh the page and try again.');
        }
        
        // Create a new instance with proper mode
        try {
          // @ts-ignore
          const cashfree = new cashfreeSDK({
            mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox'
          });
          
          console.log('Cashfree SDK initialized for checkout');
          
          // Check which method is available and use it
          if (typeof cashfree.subscriptionsCheckout === 'function') {
            console.log('Using cashfree.subscriptionsCheckout');
            // @ts-ignore
            await cashfree.subscriptionsCheckout({
              subsSessionId: data.subscriptionSessionId,
              redirectTarget: '_blank'
            });
          } else if (cashfreeSDK.subscriptionsCheckout && typeof cashfreeSDK.subscriptionsCheckout === 'function') {
            console.log('Using Cashfree.subscriptionsCheckout directly');
            // @ts-ignore
            await cashfreeSDK.subscriptionsCheckout({
              subsSessionId: data.subscriptionSessionId,
              redirectTarget: '_blank'
            });
          } else {
            // Last resort, try the global function
            // @ts-ignore
            if (typeof window.CashfreeSubscriptionsCheckout === 'function') {
              console.log('Using global CashfreeSubscriptionsCheckout function');
              // @ts-ignore
             // @ts-ignore
            await window.CashfreeSubscriptionsCheckout({
                subsSessionId: data.subscriptionSessionId,
                redirectTarget: '_blank'
              });
            } else {
              throw new Error('Cashfree subscriptions checkout method not found');
            }
          }
        } catch (error: any) {
          console.error('Error during Cashfree checkout:', error);
          setSubscriptionError(error.message || 'Error launching payment checkout');
        }
      } else {
        throw new Error("No subscription session ID received from server");
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      setSubscriptionError(error.message || "Failed to create subscription");
    }
    
    setIsSubscribing(false);
  };

  // Load Cashfree SDK with improved loading mechanism
  useEffect(() => {
    const loadCashfreeSDK = () => {
      // First remove any existing script to avoid conflicts
      const existingScript = document.getElementById('cashfree-sdk');
      if (existingScript) {
        existingScript.remove();
      }

      // Clear any existing global Cashfree object
      if (typeof window !== 'undefined') {
        // @ts-ignore
        if (window.Cashfree) {
          console.log('Clearing existing Cashfree SDK instance');
          // @ts-ignore
          window.Cashfree = undefined;
        }
      }

      console.log('Loading Cashfree SDK (attempt ' + (sdkLoadAttempts + 1) + ')');
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.id = 'cashfree-sdk';
      script.async = true;
      script.defer = true; // Add defer to ensure proper loading
      
      // Define onload handler before appending to DOM
      script.onload = () => {
        console.log('Cashfree SDK loaded successfully');
        // Verify the SDK is actually available
        setTimeout(() => {
          // @ts-ignore
          if (window.Cashfree) {
            console.log('Cashfree SDK initialized and available globally');
            setIsCashfreeSdkLoaded(true);
            
            // Initialize the SDK with mode
            try {
              // @ts-ignore
              const cashfree = new window.Cashfree({
                mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox'
              });
              console.log('Cashfree SDK initialized:', cashfree);
            } catch (err) {
              console.error('Error initializing Cashfree SDK:', err);
            }
          } else {
            console.error('Cashfree SDK loaded but not available globally');
            if (sdkLoadAttempts < 3) {
              setSdkLoadAttempts(prev => prev + 1);
            }
          }
        }, 1000); // Wait 1 second to ensure SDK is fully initialized
      };
      
      script.onerror = (error) => {
        console.error('Error loading Cashfree SDK:', error);
        // Retry loading if failed (up to 3 attempts)
        if (sdkLoadAttempts < 3) {
          setSdkLoadAttempts(prev => prev + 1);
          setTimeout(loadCashfreeSDK, 2000); // Retry after 2 seconds
        } else {
          setSubscriptionError('Failed to load payment gateway. Please refresh the page and try again.');
        }
      };
      
      // Add to head instead of body for better loading performance
      document.head.appendChild(script);
    };

    loadCashfreeSDK();
    
    // Cleanup function to remove script when component unmounts
    return () => {
      const script = document.getElementById('cashfree-sdk');
      if (script) {
        script.remove();
      }
    };
  }, [sdkLoadAttempts]);

  // Original Cashfree payment handler
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

      console.log('Order created successfully:', orderResponse);
      
      // If we have a payment link, redirect to it immediately
      if (orderResponse.data?.payment_link) {
        window.location.href = orderResponse.data.payment_link;
        return;
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

      // Store subscription info in localStorage before redirecting
      localStorage.setItem('lastPayment', JSON.stringify({
        orderId,
        amount: plan.basePrice,
        planId: plan.id,
        paymentMethod: 'cashfree',
        paymentStatus: 'PENDING',
        userId: user.id,
        isSubscription: paymentType === 'subscription',
        subscriptionId: orderResponse.data?.subscription_id || null,
        interval: plan.interval || 'monthly'
      }));
      
      // If we have a payment link, redirect to it
      if (orderResponse.data?.payment_link || orderResponse.data?.paymentLink) {
        window.location.href = orderResponse.data.payment_link || orderResponse.data.paymentLink;
        return;
      }

      // For one-time payments, initialize the widget
      await initializeCashfreeWidget({
        amount: plan.basePrice,
        appId: process.env.NEXT_PUBLIC_CASHFREE_APP_ID || '',
        orderId: orderId,
        customerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        customerEmail: user?.email || '',
        customerPhone: customerPhone,
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

    // Helper function to render the subscription plan selection UI
  const renderSubscriptionUI = () => {
    return (
      <div className="mt-4 border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Choose a Subscription Plan</h3>
        
        <div className="space-y-4">
          {AVAILABLE_PLANS.map((planItem) => (
            <div 
              key={planItem.id} 
              className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedPlanId === planItem.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}
              onClick={() => setSelectedPlanId(planItem.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{planItem.name}</h4>
                  <p className="text-sm text-gray-600">{planItem.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{planItem.price}</p>
                  <p className="text-xs text-gray-500">{planItem.interval}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Phone input for subscription */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="subscription-phone">
            Phone Number (required for payment)
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              type="tel"
              id="subscription-phone"
              placeholder="10-digit phone number"
              value={customerPhone || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setCustomerPhone(value);
                setPhoneError(null);
              }}
              maxLength={10}
              pattern="[0-9]{10}"
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
          </div>
          
          {phoneSaved && (
            <span className="text-green-600 text-xs ml-2">Saved!</span>
          )}
          {phoneError && (
            <span className="text-red-600 text-xs ml-2">{phoneError}</span>
          )}
          
          <p className="text-xs text-muted-foreground">Required for Cashfree payments. Must be exactly 10 digits.</p>
          {customerPhone && customerPhone.length !== 10 && (
            <p className="text-xs text-red-500">{10 - customerPhone.length} {10 - customerPhone.length === 1 ? 'digit' : 'digits'} {customerPhone.length < 10 ? 'more' : 'less'} needed</p>
          )}
        </div>

        {/* Subscription button */}
        <div className="mt-6">
          <Button 
            className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
            size="lg"
            onClick={handleSubscribe}
            disabled={isSubscribing || !customerPhone || !/^\d{10}$/.test(customerPhone)}
          >
            {isSubscribing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Subscribe Now</>
            )}
          </Button>
        </div>

        {subscriptionError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{subscriptionError}</p>
          </div>
        )}
      </div>
    );
  };


  // Helper function to render the one-time payment UI
  const renderOneTimePaymentUI = () => {
    return (
      <div className="mt-4">
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
                setPhoneError(null);
              }}
              placeholder="Enter your phone number"
              maxLength={10}
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
          </div>
          
          {phoneSaved && (
            <span className="text-green-600 text-xs ml-2">Saved!</span>
          )}
          {phoneError && (
            <span className="text-red-600 text-xs ml-2">{phoneError}</span>
          )}
          
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
              Pay {plan?.oneTimePrice || '₹0'}
            </>
          )}
        </Button>

        <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
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
  
  return (
    <div className="space-y-4">
      {/* Select the appropriate UI based on payment type */}
      {paymentType === 'subscription' ? 
        renderSubscriptionUI() : 
        renderOneTimePaymentUI()
      }
    </div>
  );
};
