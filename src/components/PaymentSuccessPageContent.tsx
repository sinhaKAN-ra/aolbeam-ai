"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/supabase/database.types'; // Import your database types

export default function PaymentSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

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
        const planId = searchParams.get('plan_id'); // Assuming plan_id is passed as a search param
        const amount = searchParams.get('amount'); // Assuming amount is passed as a search param
        const currency = searchParams.get('currency')?.toUpperCase(); // Assuming currency is passed as a search param
        
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
           console.error('Missing required payment information', { paymentStatus, paymentMethod, orderId, planId, amount, currency });
           throw new Error('Missing required payment information');
        }

        // Validate payment method
        if (!['cashfree', 'paypal', 'lemonsqueezy'].includes(paymentMethod)) {
          console.error('Invalid payment method:', paymentMethod);
          throw new Error('Invalid payment method');
        }

        // Validate payment status (assuming SUCCESS is the only status we process here)
        if (paymentStatus !== 'SUCCESS') {
          console.error('Payment status not successful:', paymentStatus);
          throw new Error(`Payment was not successful: ${paymentStatus}`);
        }

        // Validate user authentication
        if (!user?.id) {
          console.error('User not authenticated:', { user, isAuthLoading });
          throw new Error('User not authenticated. Please log in to complete the payment.');
        }

        // Validate amount format
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          console.error('Invalid payment amount:', amount);
          throw new Error('Invalid payment amount');
        }

        // Check if order already exists
        const { data: existingOrder, error: checkError } = await supabase
          .from('payment_orders')
          .select('id, status, metadata')
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
           // If order exists but failed, we can update it (this might happen if user retries)
           if (existingOrder.status === 'FAILED' || existingOrder.status === 'PENDING') {
            console.log(`Updating existing order status from ${existingOrder.status} to SUCCESS`);
            const { error: updateError } = await supabase
              .from('payment_orders')
              .update({
                status: 'SUCCESS',
                // Optionally update amount/currency if passed in URL, though typically not needed on success
                // amount: parsedAmount,
                // currency: currency,
                metadata: {
                  ...(existingOrder.metadata as object || {}), // Keep existing metadata
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
              // Decide whether to throw error or just log and proceed based on severity
              // For now, let's log and proceed as the payment itself was successful
              console.warn('Failed to update existing order status, but payment was successful.');
            }

            setIsLoading(false);
            return; // Exit after handling existing order
          }
        }

        // If order does not exist or was not SUCCESS/FAILED/PENDING, create a new one
        console.log('Creating new payment order entry');
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
          // Check for unique constraint violation in case of near-simultaneous requests
          if (paymentError.code === '23505') { 
             console.warn('Unique constraint violation: Order likely created by a concurrent request. Proceeding as successful.');
             // In a real application, you might want more robust handling here (e.g., refetching to confirm status)
          } else {
            throw new Error('Failed to store payment information');
          }
        }

        console.log('Payment processed and stored successfully');
        setIsLoading(false);

      } catch (error) {
        console.error('Error handling payment success:', error);
        setError(error instanceof Error ? error.message : 'Failed to process payment');
        setIsLoading(false);
      }
    };

    // Only run if user is loaded and not already loading data
    if (!isAuthLoading) {
       handlePaymentSuccess();
    }

  }, [searchParams, user, isAuthLoading, supabase]);

  // Show loading state while auth is loading
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading user data...</p>
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