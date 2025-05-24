'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [message, setMessage] = useState('Verifying your payment...');
  
  const { checkStatus } = useSubscriptionStatus();

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId) {
        setVerificationStatus('failed');
        setMessage('No order ID found in the URL');
        setIsVerifying(false);
        return;
      }

      try {
        const result = await checkStatus(orderId, paymentId || undefined);
        
        if (result.status === 'success' || result.data?.status === 'ACTIVE') {
          setVerificationStatus('success');
          setMessage('Your payment was successful!');
          
          // Show success toast
          toast({
            title: 'Payment Successful',
            description: 'Your subscription has been activated successfully.',
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          setVerificationStatus('failed');
          setMessage(result.message || 'Payment verification failed');
          
          toast({
            variant: 'destructive',
            title: 'Payment Verification Failed',
            description: result.message || 'There was an issue verifying your payment. Please contact support if the issue persists.',
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setVerificationStatus('failed');
        setMessage('An error occurred while verifying your payment');
        
        toast({
          variant: 'destructive',
          title: 'Verification Error',
          description: 'There was an error verifying your payment. Please check your subscription status or contact support.',
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [orderId, paymentId, status, checkStatus, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        {isVerifying ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Payment</h1>
            <p className="text-gray-600 mb-6">Please wait while we verify your payment details...</p>
          </div>
        ) : (
          <>
            {verificationStatus === 'success' ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500 mb-6">You will be redirected to your dashboard shortly...</p>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Issue</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="space-y-3 w-full">
                  <Button 
                    onClick={() => router.push('/pricing')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    Back to Pricing
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Having trouble? Contact our support team at{' '}
            <a href="mailto:support@aolbeam.ai" className="text-indigo-600 hover:underline">
              support@aolbeam.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
