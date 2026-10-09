import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ConvertedPlan } from '@/app/checkout/types';

interface PaymentTypeProps {
  paymentType: 'subscription' | 'one-time' | null;
  setPaymentType: (type: 'subscription' | 'one-time' | null) => void;
  plan: ConvertedPlan | null;
}

export const PaymentType: React.FC<PaymentTypeProps> = ({
  paymentType,
  setPaymentType,
  plan,
}) => {
  if (!plan) return null;

  return (
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
  );
};
