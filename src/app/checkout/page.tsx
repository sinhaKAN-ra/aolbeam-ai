'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import type { ReactPayPalScriptOptions } from "@paypal/react-paypal-js";
import { getCurrencyDetails, convertAmount, formatCurrency, getExchangeRates } from '@/lib/utils/currency';
import { loadCashfree } from '@/services/cashfree';
import { loadLemonSqueezy, initializeLemonSqueezy, openCheckout } from '@/services/lemonsqueezy';

// Base prices in INR
const BASE_PLANS = {
  weekly: {
    id: 'weekly',
    name: 'Weekly Pass',
    basePrice: 249,
    baseOriginalPrice: 249,
    oneTimePrice: 249,
    duration: 'week',
    features: [
      'Unlimited Topic Searches',
      'Unlimited Problem Generation',
      'Track Your Progress',
      'Ad-Free Experience'
    ],
    description: 'Perfect for short-term exam preparation.'
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Saver',
    basePrice: 699,
    baseOriginalPrice: 699,
    oneTimePrice: 699,
    duration: 'month',
    features: [
      'Everything in Weekly',
      'Priority Support',
      'Detailed Performance Analytics',
      'Early Access to New Features'
    ],
    description: 'Ideal for comprehensive exam preparation.'
  },
  quarterly: {
    id: 'quarterly',
    name: 'Quarterly Pro',
    basePrice: 1999,
    baseOriginalPrice: 1999,
    oneTimePrice: 1999,
    duration: '3 months',
    features: [
      'Everything in Monthly',
      'Save 33% vs Monthly',
      'Dedicated Account Manager',
      'Custom Study Plans'
    ],
    description: 'Best value for long-term learning and mastery.'
  }
} as const;

type PlanId = keyof typeof BASE_PLANS;
type PaymentMethod = 'paypal' | 'lemonsqueezy' | 'manual' | null;
type PaymentType = 'subscription' | 'one-time' | null;

interface ConvertedPlan extends Omit<typeof BASE_PLANS[PlanId], 'basePrice' | 'baseOriginalPrice' | 'oneTimePrice'> {
  price: string;
  originalPrice: string;
  oneTimePrice: string;
  basePrice: number;
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

// PayPal button component with loading state
function PayPalButtonWrapper({ plan }: { plan: ConvertedPlan }) {
  const [{ isPending }] = usePayPalScriptReducer();
  const router = useRouter();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        }}
        createOrder={async (data, actions) => {
          try {
            // Extract numeric value from price string (handles both $ and ₹ formats)
            const priceString = plan.price.replace(/[^0-9.]/g, '');
            const inrAmount = parseFloat(priceString);
            
            if (isNaN(inrAmount)) {
              console.error('Invalid price format:', plan.price);
              throw new Error('Invalid price format');
            }

            // Convert INR to USD using the exchange rate
            const rates = await getExchangeRates();
            // Convert INR to USD (rates.USD is how many USD = 1 INR)
            const usdAmount = inrAmount * rates.USD;
            
            console.log('Creating PayPal order with amounts:', {
              inrAmount,
              usdAmount,
              exchangeRate: rates.USD,
              originalPrice: plan.price
            });

            if (isNaN(usdAmount) || usdAmount <= 0) {
              throw new Error('Invalid USD amount after conversion');
            }

            return actions.order.create({
              intent: 'CAPTURE',
              purchase_units: [{
                amount: {
                  value: usdAmount.toFixed(2),
                  currency_code: 'USD',
                  breakdown: {
                    item_total: {
                      value: usdAmount.toFixed(2),
                      currency_code: 'USD'
                    }
                  }
                },
                description: `Subscription: ${plan.name} (₹${inrAmount})`,
                items: [{
                  name: plan.name || '',
                  description: `${plan.description} (₹${inrAmount})`,
                  quantity: '1',
                  unit_amount: {
                    value: usdAmount.toFixed(2),
                    currency_code: 'USD'
                  },
                  category: 'DIGITAL_GOODS'
                }]
              }],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                brand_name: 'AOLBEAM',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                return_url: `${window.location.origin}/payment/success?payment_method=paypal&plan_id=${plan.id}&amount=${usdAmount.toFixed(2)}&currency=USD&original_amount=${inrAmount}&original_currency=INR`,
                cancel_url: `${window.location.origin}/checkout`
              }
            });
          } catch (error) {
            console.error('Error creating PayPal order:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
            
            // Handle specific error cases
            if (errorMessage.includes('country') || errorMessage.includes('region')) {
              setPaymentError('PayPal is not available in your region. Please use Cashfree or Credit Card payment instead.');
            } else {
              setPaymentError(errorMessage);
            }
            throw error;
          }
        }}
        onApprove={async (data, actions) => {
          try {
            if (!actions.order) {
              throw new Error('Order actions not available');
            }
            const details = await actions.order.capture();
            console.log('Payment completed:', details);
            
            // Store payment info in localStorage
            const paymentInfo = {
              orderId: details.id,
              paymentMethod: 'paypal',
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
              amount: details.purchase_units?.[0]?.amount?.value || '0.00',
              currency: 'USD',
              originalAmount: plan.price.replace(/[^0-9.]/g, ''),
              originalCurrency: 'INR'
            };

            // Get existing payments or initialize empty array
            const existingPayments = JSON.parse(localStorage.getItem('payments') || '[]');
            existingPayments.push(paymentInfo);
            localStorage.setItem('payments', JSON.stringify(existingPayments));

            // Store subscription status
            const subscriptionInfo = {
              orderId: details.id,
              status: 'active',
              startDate: new Date().toISOString(),
              paymentMethod: 'paypal',
              plan: plan.id,
            };
            localStorage.setItem('subscription', JSON.stringify(subscriptionInfo));

            router.push(`/payment/success?token=${details.id}&payment_status=SUCCESS&payment_method=paypal&plan_id=${plan.id}&amount=${details.purchase_units?.[0]?.amount?.value || '0.00'}&currency=USD&original_amount=${plan.price.replace(/[^0-9.]/g, '')}&original_currency=INR`);
          } catch (error) {
            console.error('Payment capture error:', error);
            setPaymentError('Payment processing failed. Please try again or use a different payment method.');
          }
        }}
        onError={(err) => {
          console.error('PayPal Checkout onError', err);
          // Handle specific error cases
          if (typeof err.message === 'string' && (err.message.includes('country') || err.message.includes('region'))) {
            setPaymentError('PayPal is not available in your region. Please use Cashfree or Credit Card payment instead.');
          } else {
            setPaymentError('Payment failed. Please try again or use a different payment method.');
          }
        }}
        onCancel={() => {
          console.log('Payment cancelled by user');
          setPaymentError('Payment was cancelled. Please try again if you wish to complete the purchase.');
        }}
      />
      {paymentError && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Payment Error</p>
              <p className="text-sm text-muted-foreground mt-1">{paymentError}</p>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-sm"
                  onClick={() => setPaymentError(null)}
                >
                  Try Again
                </Button>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-sm"
                  onClick={() => router.push('/checkout?plan=' + plan.id)}
                >
                  Choose Different Payment Method
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { theme } = useTheme();
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>(null);
  const [userCountry, setUserCountry] = useState<string>('IN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [convertedPlans, setConvertedPlans] = useState<ConvertedPlans | null>(null);
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'email' | null>(null);
  
  // Get the plan based on the URL parameter
  const planId = searchParams.get('plan') as PlanId | null;
  const plan = planId ? (convertedPlans?.[planId] || null) : null;
  const isIndia = userCountry === 'IN';
  const isDark = theme === 'dark';

  // Handle authentication state
  useEffect(() => {
    if (!isAuthLoading) {
      setIsPageLoading(false);
    }
  }, [isAuthLoading]);

  // Auto-select payment method based on country
  useEffect(() => {
    if (isIndia) {
      setSelectedMethod('lemonsqueezy');
    } else {
      setSelectedMethod('paypal');
    }
  }, [isIndia]);

  // Detect user's country and convert prices
  useEffect(() => {
    const detectCountryAndConvertPrices = async () => {
      try {
        const country = await detectUserCountry();
        setUserCountry(country);
        
        const currencyDetails = getCurrencyDetails(country);
        const rates = await getExchangeRates();
        
        // Convert all plan prices
        const converted = Object.entries(BASE_PLANS).reduce((acc, [key, plan]) => {
          const convertedPrice = (plan.basePrice * rates[currencyDetails.currency]).toFixed(2);
          
          acc[key as PlanId] = {
            id: plan.id,
            name: plan.name,
            duration: plan.duration,
            features: plan.features,
            description: plan.description,
            price: formatCurrency(parseFloat(convertedPrice), currencyDetails.currency),
            originalPrice: formatCurrency(parseFloat(convertedPrice), currencyDetails.currency),
            oneTimePrice: formatCurrency(parseFloat(convertedPrice), currencyDetails.currency),
            basePrice: plan.basePrice
          };
          return acc;
        }, {} as ConvertedPlans);
        
        setConvertedPlans(converted);
      } catch (error) {
        console.error('Error detecting country or converting prices:', error);
        // Fallback to INR prices
        const inrPlans = Object.entries(BASE_PLANS).reduce((acc, [key, plan]) => {
          acc[key as PlanId] = {
            id: plan.id,
            name: plan.name,
            duration: plan.duration,
            features: plan.features,
            description: plan.description,
            price: `₹${plan.basePrice}`,
            originalPrice: `₹${plan.basePrice}`,
            oneTimePrice: `₹${plan.basePrice}`,
            basePrice: plan.basePrice
          };
          return acc;
        }, {} as ConvertedPlans);
        setConvertedPlans(inrPlans);
      } finally {
        setIsCountryLoading(false);
      }
    };

    detectCountryAndConvertPrices();
  }, []);

  const handlePayment = async () => {
    if (!selectedMethod || !plan) return;
    
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      if (selectedMethod === 'lemonsqueezy') {
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
              amount: orderAttributes.total / 100, // Convert from paise to rupees
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

            // Store subscription status
            const subscriptionInfo = {
              orderId: orderId,
              status: 'active',
              startDate: new Date().toISOString(),
              paymentMethod: 'lemonsqueezy',
              plan: plan.id,
            };
            localStorage.setItem('subscription', JSON.stringify(subscriptionInfo));

            // Set processing to false before redirect
            setIsProcessing(false);

            // Redirect to success page with all necessary parameters
            router.push(`/payment/success?token=${orderId}&payment_status=SUCCESS&payment_method=lemonsqueezy&plan_id=${plan.id}&amount=${orderAttributes.total / 100}&currency=${orderAttributes.currency}`);
          });

          // Open checkout
          const checkoutUrl = LEMON_SQUEEZY_CHECKOUT_URLS[plan.id];
          if (!checkoutUrl) {
            throw new Error('Checkout URL not found for this plan');
          }
          openCheckout(checkoutUrl);
        } catch (error) {
          console.error('Lemon Squeezy error:', error);
          setIsProcessing(false);
          throw new Error('Failed to initialize payment. Please try again.');
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
      setIsProcessing(false);
    }
  };

  const handleManualPayment = () => {
    if (contactMethod === 'whatsapp') {
      const message = `Hi, I'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.`;
      const whatsappUrl = `https://wa.me/916033240396?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (contactMethod === 'email') {
      const subject = `Purchase Inquiry: ${plan?.name} Plan`;
      const body = `Hi,\n\nI'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.\n\nPlan Details:\n- Plan: ${plan?.name}\n- Price: ${plan?.oneTimePrice}\n- Features: ${plan?.features.join(', ')}\n\nPlease let me know how to proceed with the payment.\n\nBest regards,`;
      const mailtoUrl = `mailto:support@aolbeam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
    }
  };

  // Wrap the PayPal button with PayPalScriptProvider
  const renderPaymentButton = () => {
    if (selectedMethod === 'paypal' && plan) {
      return <PayPalButtonWrapper plan={plan} />;
    }

    return (
      <Button 
        onClick={handlePayment}
        disabled={!selectedMethod || isProcessing}
        className="w-full mt-4"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {plan?.price}
          </>
        )}
      </Button>
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
      "min-h-screen py-12 transition-colors duration-200",
      isDark ? "bg-background" : "bg-background"
    )}>
      <div className="container mx-auto px-4">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="mb-6 hover:bg-accent/50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card className="mb-6 border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Order Summary</CardTitle>
                  <CardDescription className="text-muted-foreground">Review your subscription details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start border-b pb-4">
                      <div>
                        <h3 className="font-medium">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{plan.price}</p>
                        {userCountry !== 'IN' && (
                          <p className="text-xs text-muted-foreground">
                            Converted from ₹{plan.basePrice}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Payment Type Selection */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Choose Payment Type:</h4>
                      <RadioGroup
                        value={paymentType || ''}
                        onValueChange={(value) => setPaymentType(value as PaymentType)}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50">
                          <RadioGroupItem value="one-time" id="one-time" className="mt-0.5" />
                          <Label htmlFor="one-time" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CreditCard className="h-5 w-5 text-green-600" />
                                <span>One-Time Payment</span>
                              </div>
                              {paymentType === 'one-time' && <Check className="h-5 w-5 text-green-500" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {plan.oneTimePrice} (one-time)
                            </p>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">What's included:</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Payment Method</CardTitle>
                  <CardDescription className="text-muted-foreground">Choose your preferred payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <RadioGroup
                      value={selectedMethod || ''}
                      onValueChange={(value) => setSelectedMethod(value as PaymentMethod)}
                      className="space-y-3"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50">
                          <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
                          <Label htmlFor="manual" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-5 w-5 text-green-600" />
                                <span>Contact Us for Payment</span>
                              </div>
                              {selectedMethod === 'manual' && <Check className="h-5 w-5 text-green-500" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Choose your preferred contact method
                            </p>
                          </Label>
                        </div>

                        {selectedMethod === 'manual' && (
                          <div className="space-y-3 pl-8">
                            <div 
                              className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                              onClick={() => {
                                setContactMethod('whatsapp');
                                const message = `Hi, I'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.`;
                                const whatsappUrl = `https://wa.me/916033240396?text=${encodeURIComponent(message)}`;
                                window.open(whatsappUrl, '_blank');
                              }}
                            >
                              <MessageSquare className="h-5 w-5 text-green-600" />
                              <div className="flex-1">
                                <div className="font-medium">WhatsApp</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Chat with us on WhatsApp
                                </p>
                              </div>
                            </div>

                            <div 
                              className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                              onClick={() => {
                                setContactMethod('email');
                                const subject = `Purchase Inquiry: ${plan?.name} Plan`;
                                const body = `Hi,\n\nI'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.\n\nPlan Details:\n- Plan: ${plan?.name}\n- Price: ${plan?.oneTimePrice}\n- Features: ${plan?.features.join(', ')}\n\nPlease let me know how to proceed with the payment.\n\nBest regards,`;
                                const mailtoUrl = `mailto:support@aolbeam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                window.open(mailtoUrl, '_blank');
                              }}
                            >
                              <Mail className="h-5 w-5 text-blue-600" />
                              <div className="flex-1">
                                <div className="font-medium">Email</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Send us an email
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Total & Checkout */}
            <div>
              <Card className="sticky top-6 border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">Order Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-lg font-medium">
                      <span>Total</span>
                      <div className="text-right">
                        <div>{plan.price}</div>
                        <div className="text-xs text-muted-foreground">
                          One-time payment
                          {userCountry !== 'IN' && (
                            <span> (Converted from ₹{plan.basePrice})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {renderPaymentButton()}

                    <div className="mt-6 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mb-2">
                        <Lock className="h-3 w-3 mb-6 mt-3 flex-shrink-0" />
                        <span>Secure payment. Your information is encrypted.</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By completing your purchase, you agree to our{' '}
                        <Link href="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>,{' '}
                        <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, and{' '}
                        <Link href="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trust Badges */}
              <div className="mt-6 text-center p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex flex-col items-center">
                    <Shield className={cn("h-7 w-7 mb-1", isDark ? "text-green-400" : "text-green-600")} />
                    <span className="text-xs text-muted-foreground">Secure Payment</span>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex flex-col items-center">
                    <Lock className={cn("h-7 w-7 mb-1", isDark ? "text-blue-400" : "text-blue-600")} />
                    <span className="text-xs text-muted-foreground">SSL Encrypted</span>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className={cn("h-7 w-7 mb-1", isDark ? "text-purple-400" : "text-purple-600")} />
                    <span className="text-xs text-muted-foreground">24/7 Support</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment information is processed securely. We do not store credit card details.
                </p>
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
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
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
