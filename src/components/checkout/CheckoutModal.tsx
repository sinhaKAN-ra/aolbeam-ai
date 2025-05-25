'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Globe, IndianRupee, Check } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';

type PaymentMethod = 'cashfree' | 'paypal' | null;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  userCountry: string;
}

export function CheckoutModal({ isOpen, onClose, plan, userCountry }: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isIndia = userCountry === 'IN';

  useEffect(() => {
    // Auto-select payment method based on country
    if (isIndia) {
      setSelectedMethod('cashfree');
    } else {
      setSelectedMethod('paypal');
    }
  }, [isIndia]);

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setIsLoading(true);
    try {
      if (selectedMethod === 'cashfree') {
        // Handle Cashfree payment
        const response = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: plan.id,
            amount: plan.price.replace(/[^0-9]/g, ''), // Extract numbers from price string
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
          headers: {
            'Content-Type': 'application/json',
          },
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
      alert('Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to subscribe to {plan.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">Plan: {plan.name}</h4>
            <p className="text-2xl font-bold">{plan.price}</p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Select Payment Method</h4>
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

          <div className="pt-4">
            <Button 
              onClick={handlePayment}
              disabled={!selectedMethod || isLoading}
              className="w-full"
            >
              {isLoading ? (
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
