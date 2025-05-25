'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/hooks/useSupabase';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const { toast } = useToast();
  const supabase = useSupabase();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderId = searchParams.get('order_id');
        const paymentId = searchParams.get('payment_id');

        if (!orderId) {
          throw new Error('No order ID found in URL');
        }

        // Verify payment with your backend
        const response = await fetch(`/api/payments/verify?order_id=${orderId}&payment_id=${paymentId || ''}`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to verify payment');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
          setStatus('success');
          setMessage('Your payment was successful!');
          
          // Refresh user session to get updated subscription status
          await supabase.auth.refreshSession();
        } else {
          setStatus('error');
          setMessage(data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An error occurred while verifying your payment');
        
        toast({
          variant: 'destructive',
          title: 'Verification Error',
          description: 'There was an error verifying your payment. Please contact support if the issue persists.',
        });
      }
    };

    verifyPayment();
  }, [searchParams, toast, supabase.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          {status === 'loading' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 text-blue-500">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 text-green-500">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="mx-auto flex items-center justify-center h-12 w-12 text-red-500">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}
          
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === 'loading' ? 'Processing...' : 
             status === 'success' ? 'Payment Successful!' : 'Payment Error'}
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
          
          <div className="mt-6">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {status === 'success' ? 'Go to Dashboard' : 'Back to Home'}
            </Button>
            
            {status === 'error' && (
              <Button
                variant="outline"
                className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
