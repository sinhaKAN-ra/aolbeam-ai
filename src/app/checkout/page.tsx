'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// Supabase client is managed by AuthContext. Do not initialize here.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Loader2, 
  AlertCircle, 
  Lock, 
  Shield, 
  Globe, 
  IndianRupee, 
  CheckCircle2,
  X,
  LogIn,
  MessageSquare,
  Mail
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { detectUserCountry } from '@/lib/utils/country';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
// Payment providers
import { PayPalButton } from '@/components/PayPalButton';
import { getCurrencyDetails, convertAmount, formatCurrency, getExchangeRates } from '@/lib/utils/currency';
import { loadCashfree, initializePayment, createCashfreeOrder } from '@/services/cashfree';
import { loadLemonSqueezy, initializeLemonSqueezy, openCheckout } from '@/services/lemonsqueezy';
import { useSupabase } from '@/hooks/useSupabase';
import { PayPalScriptProvider, ReactPayPalScriptOptions } from '@paypal/react-paypal-js';

// Base prices in INR
const BASE_PLANS = {
  weekly: {
    id: 'weekly',
    name: 'Weekly Pass',
    basePrice: 249,
    baseOriginalPrice: 249,
    oneTimePrice: 349, // One-time price is higher than subscription
    duration: 'week',
    interval: 'weekly',
    features: [
      'Unlimited Topic Searches',
      'Unlimited Problem Generation',
      'Track Your Progress',
      'Ad-Free Experience'
    ],
    description: 'Perfect for short-term exam preparation.',
    subscriptionEnabled: true
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Saver',
    basePrice: 699,
    baseOriginalPrice: 899,
    oneTimePrice: 999, // One-time price is higher than subscription
    duration: 'month',
    interval: 'monthly',
    features: [
      'Everything in Weekly',
      'Priority Support',
      'Detailed Performance Analytics',
      'Early Access to New Features'
    ],
    description: 'Ideal for comprehensive exam preparation.',
    subscriptionEnabled: true
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly Pro',
    basePrice: 1999,
    baseOriginalPrice: 2499,
    oneTimePrice: 2799, // One-time price is higher than subscription
    duration: '3 months',
    interval: 'quarterly',
    features: [
      'Everything in Monthly',
      'Save 33% vs Monthly',
      'Dedicated Account Manager',
      'Custom Study Plans'
    ],
    description: 'Best value for long-term learning and mastery.',
    subscriptionEnabled: true
  }
} as const;

type PlanId = keyof typeof BASE_PLANS;
type PaymentMethod = 'paypal' | 'lemonsqueezy' | 'cashfree' | 'manual' | null;
type PaymentType = 'subscription' | 'one-time' | null;
type PaymentProvider = 'cashfree' | 'lemonsqueezy';
type SubscriptionInterval = 'weekly' | 'monthly' | 'quarterly';

interface ConvertedPlan extends Omit<typeof BASE_PLANS[PlanId], 'basePrice' | 'baseOriginalPrice' | 'oneTimePrice' | 'features'> {
  price: string;
  originalPrice: string;
  oneTimePrice: string;
  basePrice: number;
  baseOriginalPrice: number;
  subscriptionPrice: string;
  provider: PaymentProvider;
  features: readonly string[];
}

type ConvertedPlans = {
  [K in PlanId]: ConvertedPlan;
};

// Add Lemon Squeezy checkout URLs
const LEMON_SQUEEZY_CHECKOUT_URLS = {
  weekly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_WEEKLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/weekly-variant-id',
  monthly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/monthly-variant-id',
  quarterly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_QUARTERLY_URL || 'https://your-store.lemonsqueezy.com/checkout/buy/quarterly-variant-id',
} as const;

// Export the ConvertedPlan type for use in other components
export type { ConvertedPlan };

function CheckoutPageContent() {
  const supabase = useSupabase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
const [savingPhone, setSavingPhone] = useState(false);
const [phoneSaved, setPhoneSaved] = useState(false);
const [phoneError, setPhoneError] = useState<string | null>(null);
  const { theme } = useTheme();
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>('');
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [convertedPlans, setConvertedPlans] = useState<Partial<ConvertedPlans>>({});
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cashfree'); // Default to cashfree
  const [paymentType, setPaymentType] = useState<PaymentType>('subscription');
  
  const isDark = theme === 'dark';
  const plan = selectedPlan && convertedPlans ? convertedPlans[selectedPlan] : null;

  // Detect user's country and convert prices
  const detectCountryAndConvertPrices = useCallback(async () => {
    setIsPageLoading(true);
    try {
      const countryData = await detectUserCountry();
      setUserCountry(countryData);
      console.log('Detected country:', countryData);
      
      // Get currency exchange rates
      const rates = await getExchangeRates();
      if (!rates) {
        console.error('Failed to get exchange rates');
        setIsPageLoading(false);
        return;
      }
      
      // Convert prices based on user's location
      const currencyDetails = getCurrencyDetails(countryData);
      const convertedPlans: Partial<ConvertedPlans> = {};
      
      for (const planId in BASE_PLANS) {
        const plan = BASE_PLANS[planId as PlanId];
        const convertedAmount = await convertAmount(plan.basePrice, 'INR', currencyDetails.code);
        const convertedOriginalAmount = await convertAmount(plan.baseOriginalPrice, 'INR', currencyDetails.code);
        const convertedOneTimeAmount = await convertAmount(plan.oneTimePrice, 'INR', currencyDetails.code);
        
        // Determine payment provider based on country
        const provider = countryData === 'IN' ? 'cashfree' : 'lemonsqueezy' as const;
        
        convertedPlans[planId as PlanId] = {
          ...plan,
          price: formatCurrency(convertedAmount, currencyDetails.code, currencyDetails.locale),
          originalPrice: formatCurrency(convertedOriginalAmount, currencyDetails.code, currencyDetails.locale),
          oneTimePrice: formatCurrency(convertedOneTimeAmount, currencyDetails.code, currencyDetails.locale),
          subscriptionPrice: formatCurrency(convertedAmount, currencyDetails.code, currencyDetails.locale),
          basePrice: plan.basePrice,
          baseOriginalPrice: plan.baseOriginalPrice,
          provider,
          features: [...plan.features] // Create a mutable copy of features
        };
      }
      
      setConvertedPlans(convertedPlans);
      
      // Set payment method based on country
      if (countryData === 'IN') {
        setPaymentMethod('cashfree');
      } else {
        setPaymentMethod('lemonsqueezy');
      }
      
      // Set default payment type to subscription
      setPaymentType('subscription');
      
      // Determine which plan to pre-select based on URL param
      const planParam = searchParams?.get('plan');
      if (planParam && (planParam === 'weekly' || planParam === 'monthly' || planParam === 'quarterly')) {
        setSelectedPlan(planParam);
      } else {
        setSelectedPlan('monthly'); // Default to monthly plan
      }
    } catch (error) {
      console.error('Error detecting country or converting prices:', error);
      // Fallback to INR prices
      const inrPlans = Object.entries(BASE_PLANS).reduce((acc, [key, plan]) => {
        acc[key as PlanId] = {
          ...plan,
          price: `₹${plan.basePrice}`,
          originalPrice: `₹${plan.baseOriginalPrice}`,
          oneTimePrice: `₹${plan.oneTimePrice}`,
          subscriptionPrice: `₹${plan.basePrice}`,
          basePrice: plan.basePrice,
          baseOriginalPrice: plan.baseOriginalPrice,
          provider: 'cashfree',
          features: [...plan.features]
        } as ConvertedPlan;
        return acc;
      }, {} as ConvertedPlans);
      
      setConvertedPlans(inrPlans);
    } finally {
      setIsPageLoading(false);
      setIsCountryLoading(false);
    }
  }, [searchParams]);

  // Initialize on component mount
  useEffect(() => {
    detectCountryAndConvertPrices();
  }, [detectCountryAndConvertPrices]);
  
  // Handle authentication state
  useEffect(() => {
    if (!isAuthLoading) {
      setIsPageLoading(false);
    }
  }, [isAuthLoading]);

  // Auto-select payment method based on country
  useEffect(() => {
    if (userCountry) {
      if (userCountry === 'IN') {
        setPaymentMethod('cashfree');
      } else {
        setPaymentMethod('lemonsqueezy');
      }
    }
  }, [userCountry]);

  const handlePayment = async () => {
  if (paymentMethod === 'cashfree' && (!customerPhone || customerPhone.trim().length < 10)) {
    setPaymentError('A valid phone number is required for Cashfree payments.');
    setIsPaymentProcessing(false);
    return;
  }
  if (!user || !session) {
    setPaymentError('You must be logged in to make a payment.');
    setIsPaymentProcessing(false);
    return;
  }
  const token = session.access_token;
    if (!paymentMethod || !plan) return;
    
    setIsPaymentProcessing(true);
    setPaymentError(null);
    
    try {
      // Handle LemonSqueezy payments for international users
      if (paymentMethod === 'lemonsqueezy') {
        try {
          // Load Lemon Squeezy SDK
          await loadLemonSqueezy();
          
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
            const existingPayments = JSON.parse(localStorage.getItem('payments') || '[]');
            existingPayments.push(paymentInfo);
            localStorage.setItem('payments', JSON.stringify(existingPayments));

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

            // Set processing to false before redirect
            setIsPaymentProcessing(false);

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
          setIsPaymentProcessing(false);
          throw new Error('Failed to initialize payment. Please try again.');
        }
      }
      // Handle Cashfree payments for Indian users
      else if (paymentMethod === 'cashfree') {
        try {
          // Determine the API endpoint based on payment type
          const endpoint = paymentType === 'subscription' 
            ? '/api/subscriptions/cashfree/create' 
            : '/api/payments/cashfree/create-order';
          
          // Create the order/subscription
          // Initialize Supabase client for getting auth token



// Get the session JWT token directly
const { data: sessionData } = await supabase.auth.getSession();
const token = sessionData?.session?.access_token;

console.log('Auth token available:', !!token); // Debug log

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Pass the token explicitly in the Authorization header
    'Authorization': `Bearer ${token}`,
  },
  credentials: 'include', // Keep this for cookies as well
  body: paymentType === 'subscription'
    ? JSON.stringify({
        orderId: `sub_${plan.id}_${Date.now()}`,
        orderAmount: plan.basePrice * 100, // Convert to paise for Cashfree
        orderCurrency: 'INR',
        customerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        customerEmail: user?.email,
        customerPhone: customerPhone,
        returnUrl: `${window.location.origin}/payment/success`,
        subscriptionDetails: {
          planId: plan.id,
          interval: plan.interval,
        },
      })
    : JSON.stringify({
        planId: plan.id,
        amount: plan.oneTimePrice,
        currency: 'INR',
        interval: plan.interval,
      }),
});

// Improved error logging
if (!response.ok) {
  console.error('API Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries([...response.headers]),
  });
}
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create payment');
          }
          
          const data = await response.json();
          
          // Initialize Cashfree payment
          await loadCashfree();
          
          // For subscriptions, use the subscription API
          if (paymentType === 'subscription') {
            // Handle subscription payment - usually redirects to Cashfree's subscription page
            window.location.href = data.paymentLink;
          } else {
            // For one-time payments, use the regular payment flow
            await initializePayment(
              data, // Payment data from the API
              (successData) => {
                // Success callback
                console.log('Payment Success:', successData);
                router.push(`/payment/success?token=${data.orderId}&payment_status=SUCCESS&payment_method=cashfree&plan_id=${plan.id}&amount=${plan.basePrice}&currency=INR&payment_type=one-time`);
              },
              (errorData) => {
                // Error callback
                console.error('Payment Error:', errorData);
                setPaymentError('Payment failed. Please try again or use a different payment method.');
                setIsPaymentProcessing(false);
              },
              false // Not a subscription payment
            );
          }
        } catch (error) {
          console.error('Cashfree error:', error);
          setPaymentError(
            error instanceof Error 
              ? error.message 
              : 'Failed to initialize Cashfree payment. Please try again.'
          );
          setIsPaymentProcessing(false);
        }
      }
      // PayPal is handled by the PayPalButtons component
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while processing your payment. Please try again.'
      );
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const handleManualPayment = () => {
    if (paymentType === 'subscription') {
      const message = `Hi, I'm interested in purchasing the ${plan?.name} plan for ${plan?.price}.`;
      const whatsappUrl = `https://wa.me/916033240396?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (paymentType === 'one-time') {
      const subject = `Purchase Inquiry: ${plan?.name} Plan`;
      const body = `Hi,\n\nI'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.\n\nPlan Details:\n- Plan: ${plan?.name}\n- Price: ${plan?.oneTimePrice}\n- Features: ${plan?.features.join(', ')}\n\nPlease let me know how to proceed with the payment.\n\nBest regards,`;
      const mailtoUrl = `mailto:support@aolbeam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
    }
  };

  // Wrap the PayPal button with PayPalScriptProvider
  const renderPaymentButton = () => {
    if (paymentMethod === 'paypal' && plan) {
      if (!paymentType) {
        return (
          <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg">
            Please select a payment type (one-time or subscription)
          </div>
        );
      }
      return <PayPalButton plan={plan} paymentType={paymentType} />;
    }

    return (
      <>
        {paymentMethod === 'cashfree' && (
          <div className="flex items-center justify-center mb-2">
            {/* Cashfree logo or badge, replace src with actual logo if available */}
            <img src="https://assets.cashfree.com/prod/images/logo/cashfree-logo-icon.svg" alt="Cashfree Logo" className="h-5 w-5 mr-1" />
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">Cashfree</span>
          </div>
        )}
        {paymentMethod === 'lemonsqueezy' && (
          <div className="flex items-center justify-center mb-2">
            {/* LemonSqueezy logo or badge */}
            <img src="https://app.lemonsqueezy.com/apple-touch-icon.png" alt="LemonSqueezy Logo" className="h-5 w-5 mr-1 rounded" />
            <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">LemonSqueezy</span>
          </div>
        )}
        <Button 
          onClick={handlePayment}
          disabled={!paymentMethod || !paymentType || isPaymentProcessing}
          className="w-full mt-4"
          size="lg"
        >
          {isPaymentProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {paymentMethod === 'cashfree'
                ? `Pay with Cashfree (${paymentType === 'subscription' ? plan?.price : plan?.oneTimePrice})`
                : paymentMethod === 'lemonsqueezy'
                ? `Pay with LemonSqueezy (${paymentType === 'subscription' ? plan?.price : plan?.oneTimePrice})`
                : `Pay ${paymentType === 'subscription' ? plan?.price : plan?.oneTimePrice}`}
            </>
          )}
        </Button>
      </>
    );
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show loading state while detecting country
  if (isCountryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login prompt for unauthenticated users
  if (!user) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-6 hover:bg-accent/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
          </Button>

          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <LogIn className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-xl text-center">Login Required</CardTitle>
              <CardDescription className="text-center">
                Please log in to continue with your purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-center">
                  You need to be logged in to complete your purchase. This helps us keep your subscription details secure and accessible.
                </p>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/login?redirect=/checkout">Login to Continue</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/signup?redirect=/checkout">Create an Account</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Plan Not Found</h1>
        <p className="text-muted-foreground mb-6">The selected plan could not be found. Please choose a valid plan.</p>
        <Button asChild>
          <Link href="/pricing">View Pricing Plans</Link>
        </Button>
      </div>
    );
  }

  // Wrap the entire component with PayPalScriptProvider at the root
  const content = (
  <div className={cn(
    "min-h-screen py-8 md:py-12 transition-colors duration-300",
    isDark ? "bg-background" : "bg-gray-50"
  )}>
    {/* Debug/Info Bar for country and payment method - only in development */}
    {process.env.NODE_ENV === 'development' && (
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-1 rounded bg-muted text-xs text-muted-foreground border border-border shadow-sm">
        <span>Country: <b>{userCountry || 'Detecting...'}</b> | Payment Method: <b>{paymentMethod || 'Detecting...'}</b></span>
      </div>
    )}
    
    <div className="container max-w-5xl mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="hover:bg-accent/50 flex items-center"
          size="sm"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        
        {/* Checkout Steps Indicator */}
        <div className="hidden md:flex items-center justify-center space-x-2">
          <div className="flex items-center">
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</div>
            <span className="ml-2 text-sm font-medium">Plan</span>
          </div>
          <div className="w-8 h-px bg-primary"></div>
          <div className="flex items-center">
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">2</div>
            <span className="ml-2 text-sm font-medium">Payment</span>
          </div>
          <div className="w-8 h-px bg-muted"></div>
          <div className="flex items-center opacity-50">
            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">3</div>
            <span className="ml-2 text-sm font-medium">Confirmation</span>
          </div>
        </div>
        
        <div className="w-10"></div> {/* Empty space for balance */}
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">Complete Your Purchase</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="mb-6 border-border/30 shadow-md overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30 border-b border-border/20">
                  <CardTitle className="text-xl flex items-center">
                    <CreditCard className="mr-2 h-5 w-5 text-primary" />
                    Order Summary
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Review your subscription details</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Selected Plan with Badge */}
                    <div className="flex items-start justify-between bg-muted/20 p-4 rounded-lg border border-border/20">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-lg">{plan.name}</h3>
                          <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                            {plan.interval}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        <ul className="mt-3 space-y-1">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="text-sm flex items-start">
                              <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-primary">
                          {paymentType === 'subscription' ? plan.price : plan.oneTimePrice}
                        </div>
                        {paymentType === 'subscription' && (
                          <p className="text-xs text-muted-foreground">per {plan.duration}</p>
                        )}
                      </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Payment Type Selection - Improved UI */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Payment Type</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div 
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
                            paymentType === 'subscription' 
                              ? "border-primary bg-primary/5" 
                              : "border-border"
                          )}
                          onClick={() => setPaymentType('subscription')}
                        >
                          <div className="flex items-center">
                            <div className={cn(
                              "w-4 h-4 rounded-full border mr-2 flex items-center justify-center",
                              paymentType === 'subscription' ? "border-primary" : "border-muted-foreground"
                            )}>
                              {paymentType === 'subscription' && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">Subscription</div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                {plan.price}
                                <span className="ml-2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  Save {Math.round((1 - Number(plan.basePrice) / Number(plan.oneTimePrice)) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
                            paymentType === 'one-time' 
                              ? "border-primary bg-primary/5" 
                              : "border-border"
                          )}
                          onClick={() => setPaymentType('one-time')}
                        >
                          <div className="flex items-center">
                            <div className={cn(
                              "w-4 h-4 rounded-full border mr-2 flex items-center justify-center",
                              paymentType === 'one-time' ? "border-primary" : "border-muted-foreground"
                            )}>
                              {paymentType === 'one-time' && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">One-time payment</div>
                              <div className="text-sm text-muted-foreground">{plan.oneTimePrice}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-2" />

                    {/* Payment Method Selection - Improved UI */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Payment Method</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {userCountry === 'IN' && (
                          <div 
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
                              paymentMethod === 'cashfree' 
                                ? "border-primary bg-primary/5" 
                                : "border-border"
                            )}
                            onClick={() => setPaymentMethod('cashfree')}
                          >
                            <div className="flex items-center">
                              <div className={cn(
                                "w-4 h-4 rounded-full border mr-2 flex items-center justify-center",
                                paymentMethod === 'cashfree' ? "border-primary" : "border-muted-foreground"
                              )}>
                                {paymentMethod === 'cashfree' && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex items-center">
                                <img src="https://assets.cashfree.com/prod/images/logo/cashfree-logo-icon.svg" alt="Cashfree Logo" className="h-5 w-5 mr-2" />
                                <div>
                                  <div className="font-medium">Cashfree</div>
                                  <div className="text-xs text-muted-foreground">Credit/Debit Card, UPI, Netbanking</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {userCountry !== 'IN' && (
                          <div 
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
                              paymentMethod === 'lemonsqueezy' 
                                ? "border-primary bg-primary/5" 
                                : "border-border"
                            )}
                            onClick={() => setPaymentMethod('lemonsqueezy')}
                          >
                            <div className="flex items-center">
                              <div className={cn(
                                "w-4 h-4 rounded-full border mr-2 flex items-center justify-center",
                                paymentMethod === 'lemonsqueezy' ? "border-primary" : "border-muted-foreground"
                              )}>
                                {paymentMethod === 'lemonsqueezy' && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex items-center">
                                <img src="https://app.lemonsqueezy.com/apple-touch-icon.png" alt="LemonSqueezy Logo" className="h-5 w-5 mr-2 rounded" />
                                <div>
                                  <div className="font-medium">Credit/Debit Card</div>
                                  <div className="text-xs text-muted-foreground">Secure payment via LemonSqueezy</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div 
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
                            paymentMethod === 'manual' 
                              ? "border-primary bg-primary/5" 
                              : "border-border"
                          )}
                          onClick={() => setPaymentMethod('manual')}
                        >
                          <div className="flex items-center">
                            <div className={cn(
                              "w-4 h-4 rounded-full border mr-2 flex items-center justify-center",
                              paymentMethod === 'manual' ? "border-primary" : "border-muted-foreground"
                            )}>
                              {paymentMethod === 'manual' && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">Contact Support</div>
                              <div className="text-xs text-muted-foreground">Get help with your payment</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phone input for Cashfree */}
                    {paymentMethod === 'cashfree' && (
                      <div className="mb-4">
                        <Label htmlFor="customer-phone">Phone Number</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="customer-phone"
                            type="tel"
                            value={customerPhone}
                            onChange={e => {
                              setCustomerPhone(e.target.value);
                              setPhoneSaved(false);
                              setPhoneError(null);
                            }}
                            placeholder="Enter your phone number"
                            maxLength={15}
                            required
                            autoComplete="tel"
                          />
                          {user && customerPhone !== (user.phone || '') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={savingPhone || !/^\d{10,}$/.test(customerPhone)}
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
                        <p className="text-xs text-muted-foreground mt-1">Required for Cashfree payments. 10+ digits.</p>
                      </div>
                    )}
                    {/* Payment Button */}
                    <div className="mt-6">
                      {paymentMethod === 'manual' ? (
                        <Button 
                          onClick={handleManualPayment}
                          className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
                          size="lg"
                        >
                          {paymentType === 'subscription' ? (
                            <>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Contact via WhatsApp
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Contact via Email
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          {renderPaymentButton()}
                          <div className="flex items-center justify-center text-xs text-muted-foreground">
                            <Lock className="h-3 w-3 mr-1.5" />
                            Secure payment. Your information is encrypted.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Error */}
                    {paymentError && (
                      <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-lg flex items-start animate-pulse">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>{paymentError}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="sticky top-6 border-border/30 shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-3 bg-muted/30 border-b border-border/20">
                  <CardTitle className="text-xl flex items-center">
                    <IndianRupee className="mr-2 h-5 w-5 text-primary" />
                    Order Total
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Plan Details */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{plan.name} ({paymentType === 'subscription' ? 'Subscription' : 'One-time'})</span>
                      <span className="font-medium">{paymentType === 'subscription' ? plan.price : plan.oneTimePrice}</span>
                    </div>
                    
                    {/* Original Price if discounted */}
                    {plan.baseOriginalPrice > plan.basePrice && paymentType === 'subscription' && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Original price</span>
                        <span className="line-through text-muted-foreground">{plan.originalPrice}</span>
                      </div>
                    )}
                    
                    {/* Savings if applicable */}
                    {paymentType === 'subscription' && plan.baseOriginalPrice > plan.basePrice && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-600">Your savings</span>
                        <span className="text-green-600 font-medium">
                          {/* Calculate savings without arithmetic operation to avoid type errors */}
                          {userCountry === 'IN' ? `₹${Number(plan.baseOriginalPrice) - Number(plan.basePrice)}` : `$${((Number(plan.baseOriginalPrice) - Number(plan.basePrice)) / 80).toFixed(2)}`}
                        </span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    
                    {/* Total with prominent styling */}
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-xl text-primary">{paymentType === 'subscription' ? plan.price : plan.oneTimePrice}</span>
                    </div>
                    
                    {/* Currency conversion info */}
                    {userCountry !== 'IN' && (
                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md flex items-center">
                        <Globe className="h-3 w-3 mr-1.5 flex-shrink-0" />
                        <span>Converted from ₹{paymentType === 'subscription' ? plan.basePrice : plan.oneTimePrice}</span>
                      </div>
                    )}
                  </div>

                  {/* Trust Badges */}
                  <div className="mt-6 p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="flex flex-col items-center">
                        <Shield className="h-5 w-5 mb-1 text-green-500" />
                        <span className="text-xs">Secure</span>
                      </div>
                      <div className="h-8 w-px bg-border/50" />
                      <div className="flex flex-col items-center">
                        <Lock className="h-5 w-5 mb-1 text-blue-500" />
                        <span className="text-xs">Encrypted</span>
                      </div>
                      <div className="h-8 w-px bg-border/50" />
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="h-5 w-5 mb-1 text-purple-500" />
                        <span className="text-xs">Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal text */}
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      By completing your purchase, you agree to our{' '}
                      <Link href="/terms-of-service" className="text-primary hover:underline">Terms</Link>,{' '}
                      <Link href="/privacy-policy" className="text-primary hover:underline">Privacy</Link>, and{' '}
                      <Link href="/refund-policy" className="text-primary hover:underline">Refund</Link> policies.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Button */}
              <div className="mt-6">
                {paymentMethod === 'manual' ? (
                  <Button 
                    onClick={handlePayment}
                    className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
                    size="lg"
                    disabled={isPaymentProcessing || isAuthLoading || !user || !session}
                  >
                    {paymentType === 'subscription' ? (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Contact via WhatsApp
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Contact via Email
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {renderPaymentButton()}
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 mr-1.5" />
                      Secure payment. Your information is encrypted.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return content;
}

// Simple AuthGuard component
interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/checkout');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default function CheckoutPage() {
  const paypalOptions: ReactPayPalScriptOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    intent: "capture",
    components: "buttons",
    currency: "USD",
    'data-env': 'sandbox'  // Force sandbox environment
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <AuthGuard>
        <CheckoutPageContent />
      </AuthGuard>
    </PayPalScriptProvider>
  );
}
