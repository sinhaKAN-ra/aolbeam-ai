import React from 'react';
import { RadioGroup } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, MessageSquare, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = 'paypal' | 'lemonsqueezy' | 'cashfree' | 'manual' | null;

interface PaymentMethodsProps {
  paymentMethod: PaymentMethod;
  countryCode: string | null; // Kept for potential future use, though not actively used for rendering now
  planType: 'one-time' | 'subscription' | null; // This determines which block (Cashfree/LemonSqueezy) is shown
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  paymentMethod,
  countryCode,
  planType,
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Payment Method</Label>
      <div className="grid grid-cols-1 gap-3">
        {planType === 'one-time' && (
          <div 
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
              paymentMethod === 'cashfree' 
                ? "border-primary bg-primary/5" 
                : "border-border"
            )}
            // onClick={() => setPaymentMethod('cashfree')} // Removed: selection is handled by parent
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
                {/* <img 
                  src="https://assets.cashfree.com/prod/images/logo/cashfree-logo-icon.svg" 
                  alt="Cashfree Logo" 
                  className="h-5 w-5 mr-2" 
                /> */}
                <div>
                  <div className="font-medium">Cashfree Payment</div>
                  <div className="text-xs text-muted-foreground">Credit/Debit Card, UPI, Netbanking </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {planType === 'subscription' && (
          <div 
            className={cn(
              "border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-primary/70",
              paymentMethod === 'lemonsqueezy' 
                ? "border-primary bg-primary/5" 
                : "border-border"
            )}
            // onClick={() => setPaymentMethod('lemonsqueezy')} // Removed: selection is handled by parent
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
                {/* <img src="https://app.lemonsqueezy.com/apple-touch-icon.png" alt="LemonSqueezy Logo" className="h-5 w-5 mr-2 rounded" /> */}
                <div>
                  <div className="font-medium">LemonSqueezy Payment</div>
                  <div className="text-xs text-muted-foreground">Pay with Credit/Debit Card </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
