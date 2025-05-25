'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Check, 
  ArrowLeft, 
  Loader2, 
  Shield, 
  Lock, 
  CreditCard, 
  IndianRupee, 
  Globe, 
  AlertCircle,
  X,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { detectUserCountry } from '@/lib/utils/country';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Mock data - replace with actual data fetching
const PLANS = {
  weekly: {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    originalPrice: '₹499',
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
    price: '₹699',
    originalPrice: '₹999',
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
    price: '₹1999',
    originalPrice: '₹2997',
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

type PlanId = keyof typeof PLANS;
type PaymentMethod = 'cashfree' | 'paypal' | null;

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // State for the component
  const planId = searchParams.get('plan') as PlanId | null;
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [userCountry, setUserCountry] = useState<string>('IN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  
  // Get the plan based on the URL parameter
  const plan = planId ? PLANS[planId] : null;
  const isIndia = userCountry === 'IN';

  // Handle authentication state
  useEffect(() => {
    // If user is not authenticated, AuthGuard will handle redirection
    if (!isAuthLoading) {
      setIsPageLoading(false);
    }
  }, [isAuthLoading]);

  // Auto-select payment method based on country
  useEffect(() => {
    if (isIndia) {
      setSelectedMethod('cashfree');
    } else {
      setSelectedMethod('paypal');
    }
  }, [isIndia]);

  // Detect user's country on component mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const country = await detectUserCountry();
        setUserCountry(country);
      } catch (error) {
        console.error('Error detecting country:', error);
      } finally {
        setIsCountryLoading(false);
      }
    };

    detectCountry();
  }, []);

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

  const handlePayment = async () => {
    if (!selectedMethod || !plan) return;
    
    setIsProcessing(true);
    try {
      if (selectedMethod === 'cashfree') {
        // Handle Cashfree payment
        const response = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: plan.id,
            amount: plan.price.replace(/[^0-9]/g, ''),
            currency: 'INR',
          }),
        });

        const data = await response.json();
        if (data.payment_link) {
          window.location.href = data.payment_link;
        }
      } else if (selectedMethod === 'paypal') {
        // Handle PayPal payment
        const response = await fetch('/api/payments/create-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: plan.id,
            amount: plan.price.replace(/[^0-9]/g, ''),
            currency: 'USD',
          }),
        });

        const data = await response.json();
        if (data.approval_url) {
          window.location.href = data.approval_url;
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Handle error (show toast or error message)
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCountryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "min-h-screen py-12 transition-colors duration-200",
      isDark ? "bg-gray-900" : "bg-gray-50"
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
                        <p className="text-sm text-muted-foreground line-through">
                          {plan.originalPrice}
                        </p>
                      </div>
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
                      {isIndia && (
                        <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50">
                          <RadioGroupItem value="cashfree" id="cashfree" className="mt-0.5" />
                          <Label htmlFor="cashfree" className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <IndianRupee className="h-5 w-5 text-orange-600" />
                                <span>Pay with UPI/Cards/NetBanking</span>
                              </div>
                              {selectedMethod === 'cashfree' && <Check className="h-5 w-5 text-green-500" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Secured by Cashfree (For Indian users)
                            </p>
                          </Label>
                        </div>
                      )}

                      <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50">
                        <RadioGroupItem value="paypal" id="paypal" className="mt-0.5" />
                        <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Globe className="h-5 w-5 text-blue-600" />
                              <span>PayPal / Credit Card</span>
                            </div>
                            {selectedMethod === 'paypal' && <Check className="h-5 w-5 text-green-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pay with PayPal or any credit/debit card
                          </p>
                        </Label>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{plan.price}</span>
                    </div>
                    <div className="flex justify-between text-lg font-medium">
                      <span>Total</span>
                      <div className="text-right">
                        <div>{plan.price}</div>
                        <div className="text-xs text-muted-foreground">
                          Billed once for {plan.duration}
                        </div>
                      </div>
                    </div>

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
                          Pay {plan.price}
                        </>
                      )}
                    </Button>

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
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutPageContent />
    </AuthGuard>
  );
}
