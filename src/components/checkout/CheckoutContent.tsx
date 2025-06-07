// src/components/checkout/CheckoutContent.tsx

import React, { useState, useEffect } from 'react';
import { CheckoutPlanInfo, PaymentType, PaymentProvider } from '@/app/checkout/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2, Shield, CreditCard, Star, Sparkles } from 'lucide-react';
import { PaymentMethods } from './PaymentMethods';
import { LemonSqueezyPayment } from './LemonSqueezyPayment';
import { ManualPayment } from './ManualPayment';
import { initiatePayment } from '@/lib/payment';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutModal } from './CheckoutModal'; // Import CheckoutModal

interface CheckoutContentProps {
  plan: CheckoutPlanInfo | null;
  isLoading: boolean;
}

export const CheckoutContent: React.FC<CheckoutContentProps> = ({ plan, isLoading }) => {
  const { user, session } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false); // Add isModalOpen state
  const [paymentType, setPaymentType] = useState<PaymentType>("subscription");
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPurchaseOption, setSelectedPurchaseOption] = useState<'subscription' | 'oneTime' | null>(null);
  useEffect(() => {
    if (plan) {

      if (plan.originalType === 'one_time') {
        setSelectedPurchaseOption('oneTime');
        setPaymentType('one-time');
        setPaymentMethod('cashfree');
      } else { // originalType is 'subscription'
        // Default to subscription purchase option if not already set or if plan changes
        if (!selectedPurchaseOption || selectedPurchaseOption === 'subscription') {
          setSelectedPurchaseOption('subscription');
          setPaymentType('subscription');
          // For subscriptions, LemonSqueezy is the primary. Cashfree for IN subscriptions can be a future enhancement if needed.
          setPaymentMethod('lemonsqueezy');
        } else { // selectedPurchaseOption is 'oneTime' for an original subscription plan
          setPaymentType('one-time');
          setPaymentMethod('cashfree');
        }
      }
    } else {
      // Reset if no plan
      setSelectedPurchaseOption(null);
      setPaymentType("subscription");
      setPaymentMethod(null);
    }
  }, [plan, selectedPurchaseOption]);



  if (isLoading || !plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Ensure plan is not null for calculations
  const subscriptionPrice = plan.baseNumericPrice;
  const oneTimePriceMarkedUp = parseFloat((plan.baseNumericPrice * 1.20).toFixed(2));

  let displayPrice: number = plan.baseNumericPrice;
  let displayTypeString: string = plan.originalType === 'one_time' ? 'One-Time Purchase' : 'Subscription';
  let finalAmountToCharge: number = plan.baseNumericPrice;

  if (plan.originalType === 'subscription') {
    if (selectedPurchaseOption === 'subscription') {
      displayPrice = subscriptionPrice;
      displayTypeString = 'Subscription';
      finalAmountToCharge = subscriptionPrice;
    } else if (selectedPurchaseOption === 'oneTime') {
      displayPrice = oneTimePriceMarkedUp;
      displayTypeString = 'One-Time Purchase (20% markup)';
      finalAmountToCharge = oneTimePriceMarkedUp;
    }
  } else { // plan.originalType === 'one_time'
    displayPrice = plan.baseNumericPrice;
    displayTypeString = 'One-Time Purchase';
    finalAmountToCharge = plan.baseNumericPrice;
  }

  return (
    <React.Fragment>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Secure Checkout
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied customers and unlock the full potential of {plan.name}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Purchase Options & Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Purchase Options Card */}
              {plan.originalType === 'subscription' && (
                <Card className="border-2 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">Choose Your Plan Type</CardTitle>
                    </div>
                    <CardDescription>Select the option that works best for you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={selectedPurchaseOption || 'subscription'}
                      onValueChange={(value: 'subscription' | 'oneTime') => setSelectedPurchaseOption(value)}
                      className="space-y-4"
                    >
                      {/* Subscription Option */}
                      <div className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${selectedPurchaseOption === 'subscription' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="flex items-start space-x-4">
                          <RadioGroupItem value="subscription" id="option-subscription" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="option-subscription" className="cursor-pointer">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-semibold">Subscription Plan</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  Most Popular
                                </Badge>
                              </div>
                              <div className="text-2xl font-bold text-primary mb-2">
                                {plan.currencySymbol}{subscriptionPrice.toFixed(2)}
                                <span className="text-sm font-normal text-gray-500 ml-1">{plan.duration || ''}</span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Continuous access with regular updates and support
                              </p>
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* One-Time Option */}
                      <div className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${selectedPurchaseOption === 'oneTime' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="flex items-start space-x-4">
                          <RadioGroupItem value="oneTime" id="option-oneTime" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="option-oneTime" className="cursor-pointer">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-semibold">One-Time Purchase</span>
                                <Badge variant="outline">One Time Access</Badge>
                              </div>
                              <div className="text-2xl font-bold text-primary mb-2">
                                {plan.currencySymbol}{oneTimePriceMarkedUp.toFixed(2)}
                              </div>
                              <p className="text-sm text-gray-600">
                                Includes current features with single time access.
                              </p>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Order Summary Card */}
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-semibold">{plan.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="secondary">{displayTypeString}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-2xl text-primary">
                        {plan.currencySymbol}{displayPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      What's Included:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Payment Details */}
            <div className="space-y-6">
              {/* Payment Form Card */}
              <Card className="border-2 shadow-lg sticky top-8">
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>Secure and encrypted payment processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Phone Number Input */}
                  {paymentMethod !== 'lemonsqueezy' && (
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone" className="text-sm font-medium">
                        Phone Number
                      </Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={customerPhone}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (plan?.countryCode === 'IN') {
                            // Remove +91 if present
                            if (value.startsWith('+91')) {
                              value = value.substring(3);
                            }
                            // Limit to 10 digits
                            if (value.length > 10) {
                              value = value.substring(0, 10);
                            }
                          }
                          setCustomerPhone(value);
                        }}
                        className="h-12 text-base"
                        autoComplete="tel"
                      />
                      <p className="text-xs text-gray-500">
                        Required for payment processing and order updates
                      </p>
                    </div>
                  )}

                  {/* Payment Methods */}
                  <div className="space-y-4">
                    {/* <Label className="text-sm font-medium">Payment Method</Label> */}
                    <PaymentMethods 
                      paymentMethod={paymentMethod}
                      countryCode={plan.countryCode}
                      planType={paymentType}
                      onSelectPaymentMethod={setPaymentMethod}
                    />
                  </div>

                  {/* Error Message */}
                  {paymentError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-500 text-sm mt-2">{paymentError}</p>
                      {paymentError && plan && paymentType && ( // Added checks for plan and paymentType
                        <div className="mt-4">
                          <ManualPayment
                            plan={plan}
                            paymentType={paymentType}
                            customerPhone={customerPhone}
                            setPaymentError={setPaymentError}
                            setIsPaymentProcessing={setIsPaymentProcessing}
                            user={user}
                            session={session}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Button */}
                  {paymentMethod === 'lemonsqueezy' ? (
                    <LemonSqueezyPayment
                      plan={plan}
                      paymentType={paymentType}
                      setPaymentError={setPaymentError}
                      setIsPaymentProcessing={setIsPaymentProcessing}
                      user={user}
                      session={session}
                      customerPhone={customerPhone}
                    />
                  ) : (
                    <Button
                      onClick={() => {
                        if ((paymentMethod === 'cashfree' || plan.countryCode === 'IN')) {
                          if (!customerPhone) {
                            setPaymentError('Please enter your phone number for Indian payments.');
                            return;
                          }
                          // Validation for Indian phone numbers: exactly 10 digits
                          const indianPhoneRegex = /^[0-9]{10}$/;
                          if (!indianPhoneRegex.test(customerPhone)) {
                            setPaymentError('Please enter a valid 10-digit Indian phone number.');
                            return;
                          }
                        }
                        setPaymentError(null);
                        setIsPaymentProcessing(true);
                        initiatePayment({
                          plan,
                          paymentType,
                          paymentMethod,
                          customerPhone,
                          setPaymentError,
                          setIsPaymentProcessing,
                          user,
                          session,
                          finalAmount: finalAmountToCharge,
                        });
                      }}
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isPaymentProcessing || !paymentMethod || !selectedPurchaseOption}
                    >
                      {isPaymentProcessing ? (
                        <>
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-3 h-5 w-5" />
                          Complete Secure Payment
                        </>
                      )}
                    </Button>
                  )}

                  {/* Security Notice */}
                  <div className="text-center pt-4 border-t">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>256-bit SSL encryption • Secure payment processing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Trusted by 10,000+ customers worldwide
                    </p>
                    <p className="text-xs text-gray-600">
                      30-day money-back guarantee
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={plan as CheckoutPlanInfo}
        userCountry={plan.countryCode} // Pass userCountry from plan
        selectedPurchaseOption={selectedPurchaseOption || 'subscription'}
      />
    </React.Fragment>
  );
};