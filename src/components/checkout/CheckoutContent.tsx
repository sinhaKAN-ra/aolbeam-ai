import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentMethods } from './PaymentMethods';
import { PaymentType } from './PaymentType';
import { CashfreePayment } from './CashfreePayment';
import { LemonSqueezyPayment } from './LemonSqueezyPayment';
import { ManualPayment } from './ManualPayment';
import { ConvertedPlan, PaymentMethod, PaymentType as PaymentTypeEnum } from '@/app/checkout/types';

interface CheckoutContentProps {
  plan: ConvertedPlan | null;
  isLoading: boolean;
  countryCode: string | null;
}

export const CheckoutContent: React.FC<CheckoutContentProps> = ({
  plan,
  isLoading,
  countryCode,
}) => {
  const router = useRouter();
  const supabase = useSupabase();
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [paymentType, setPaymentType] = useState<PaymentTypeEnum>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Set default payment method to Cashfree if not set
  useEffect(() => {
    if (!paymentMethod) {
      setPaymentMethod('cashfree');
    }
  }, [paymentMethod]);

  // Set default payment type based on plan
  useEffect(() => {
    if (plan) {
      // Default to subscription if available, otherwise one-time
      setPaymentType(plan.subscriptionEnabled ? 'subscription' : 'one-time');
    }
  }, [plan]);

  // Load user and session
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user) {
        setUser(data.session.user);
        // Pre-populate phone from user metadata if available
        if (data.session.user.phone) {
          setCustomerPhone(data.session.user.phone);
        }
      }
    };
    getSession();
  }, [supabase]);

  if (isLoading || !plan) {
    return (
      <div className="flex items-center justify-center h-[400px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderPaymentComponent = () => {
    if (!paymentMethod || !paymentType) return null;

    // Common props for all payment components
    const paymentProps = {
      plan,
      paymentType,
      customerPhone, 
      setPaymentError,
      setIsPaymentProcessing,
      user,
      session
    };

    switch (paymentMethod) {
      case 'cashfree':
        return (
          <CashfreePayment 
            {...paymentProps} 
            setCustomerPhone={setCustomerPhone} 
          />
        );
      case 'lemonsqueezy':
        return <LemonSqueezyPayment {...paymentProps} />;
      case 'manual':
        return <ManualPayment {...paymentProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="w-full shadow-lg border-border/40">
        <CardHeader>
          <CardTitle className="text-2xl">{plan.name} Plan</CardTitle>
          <CardDescription>
            {plan.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Payment Type Selection */}
            <PaymentType 
              paymentType={paymentType} 
              setPaymentType={setPaymentType} 
              plan={plan} 
            />

            {/* Payment Method Selection */}
            <PaymentMethods
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              countryCode={countryCode}
            />

            {/* Display error if any */}
            {paymentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}

            {/* Payment Component */}
            {renderPaymentComponent()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
