'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // Wait for auth to be ready
        if (isAuthLoading) {
          console.log('Waiting for auth to be ready...');
          return;
        }

        // Validate required parameters
        const paymentStatus = searchParams.get('payment_status');
        const paymentMethod = searchParams.get('payment_method')?.toLowerCase();
        const orderId = searchParams.get('token');
        const planId = searchParams.get('plan_id');
        const amount = searchParams.get('amount');
        const currency = searchParams.get('currency')?.toUpperCase();

        console.log('Payment success parameters:', {
          paymentStatus,
          paymentMethod,
          orderId,
          planId,
          amount,
          currency,
          userId: user?.id,
          isAuthLoading
        });

        // Validate all required fields
        if (!paymentStatus || !paymentMethod || !orderId || !planId || !amount || !currency) {
          throw new Error('Missing required payment information');
        }

        // Validate payment method
        if (!['cashfree', 'paypal', 'lemonsqueezy'].includes(paymentMethod)) {
          throw new Error('Invalid payment method');
        }

        // Validate payment status
        if (paymentStatus !== 'SUCCESS') {
          throw new Error('Payment was not successful');
        }

        // Validate user authentication
        if (!user?.id) {
          console.error('User not authenticated:', { user, isAuthLoading });
          throw new Error('User not authenticated. Please log in to complete the payment.');
        }

        // Validate amount format
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Invalid payment amount');
        }

        // Check if order already exists
        const { data: existingOrder, error: checkError } = await supabase
          .from('payment_orders')
          .select('id, status')
          .eq('provider_order_id', orderId)
          .eq('payment_provider', paymentMethod)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing order:', checkError);
          throw new Error('Failed to verify payment status');
        }

        if (existingOrder) {
          console.log('Order already exists:', existingOrder);
          // If order exists and is successful, we can proceed
          if (existingOrder.status === 'SUCCESS') {
            console.log('Order already processed successfully');
            setIsLoading(false);
            return;
          }
          // If order exists but failed, we can update it
          if (existingOrder.status === 'FAILED') {
            const { error: updateError } = await supabase
              .from('payment_orders')
              .update({
                status: 'SUCCESS',
                amount: parsedAmount,
                currency: currency,
                metadata: {
                  payment_details: {
                    status: paymentStatus,
                    method: paymentMethod,
                    amount: parsedAmount,
                    currency: currency,
                    timestamp: new Date().toISOString(),
                    raw_params: Object.fromEntries(searchParams.entries())
                  }
                }
              })
              .eq('id', existingOrder.id);

            if (updateError) {
              console.error('Error updating existing order:', updateError);
              throw new Error('Failed to update payment information');
            }

            console.log('Updated existing failed order to success');
            setIsLoading(false);
            return;
          }
        }

        // Store payment information in payment_orders table
        const { error: paymentError } = await supabase
          .from('payment_orders')
          .insert({
            user_id: user.id,
            plan_id: planId,
            amount: parsedAmount,
            currency: currency,
            payment_provider: paymentMethod,
            provider_order_id: orderId,
            status: 'SUCCESS',
            metadata: {
              payment_details: {
                status: paymentStatus,
                method: paymentMethod,
                amount: parsedAmount,
                currency: currency,
                timestamp: new Date().toISOString(),
                raw_params: Object.fromEntries(searchParams.entries())
              }
            }
          });

        if (paymentError) {
          console.error('Error storing payment:', paymentError);
          if (paymentError.code === '23505') {
            // If we get a unique constraint violation, the order was created between our check and insert
            console.log('Order was created by another process, proceeding with success');
            setIsLoading(false);
            return;
          }
          throw new Error('Failed to store payment information');
        }

        console.log('Payment processed successfully');
        setIsLoading(false);
      } catch (error) {
        console.error('Error handling payment success:', error);
        setError(error instanceof Error ? error.message : 'Failed to process payment');
        setIsLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [searchParams, user, isAuthLoading, supabase]);

  // Show loading state while auth is loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-xl text-center">Payment Error</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push('/pricing')}>
              Return to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-xl text-center">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Thank you for your purchase. Your subscription is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Order ID: {searchParams.get('token')}
            </p>
            <p className="text-sm text-muted-foreground">
              Payment Method: {searchParams.get('payment_method')}
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Button onClick={() => router.push('/profile')}>
              Go to Profile
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
