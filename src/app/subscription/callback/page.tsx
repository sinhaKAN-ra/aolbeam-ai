'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing your subscription...');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Extract parameters from URL
        const subscriptionId = searchParams?.get('subscription_id') || ''; // Cashfree subscription ID
        const paymentStatus = searchParams?.get('payment_status') || '';
        const paymentRef = searchParams?.get('cf_payment_id') || '';
        const dbId = searchParams?.get('db_id') || ''; // Database UUID for the subscription
        
        if (!subscriptionId) {
          setStatus('error');
          setMessage('Invalid subscription information. Missing subscription ID.');
          return;
        }
        
        // Check if payment was successful
        if (paymentStatus === 'SUCCESS' || paymentStatus === 'OK') {
          // Optional: Call your backend to verify the subscription with Cashfree API
          const verifyResponse = await fetch('/api/subscriptions/cashfree/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              subscriptionId, // Cashfree subscription ID
              dbId, // Database UUID
              paymentRef 
            })
          });
          
          if (verifyResponse.ok) {
            // Update local UI
            setStatus('success');
            setMessage('Your subscription has been activated successfully!');
            
            // Update user metadata to indicate they have an active subscription
            // This is just a UI enhancement, the actual subscription state is stored in the subscriptions table
            await supabase.auth.updateUser({
              data: { 
                has_active_subscription: true,
                subscription_updated_at: new Date().toISOString()
              }
            });
            
            // The webhook will handle updating the subscription status in the database
          } else {
            setStatus('error');
            setMessage('There was an issue verifying your payment. Please contact support.');
          }
        } else {
          setStatus('error');
          setMessage(`Payment was not successful. Status: ${paymentStatus || 'Unknown'}`);
        }
      } catch (error: any) {
        console.error('Error in subscription callback:', error);
        setStatus('error');
        setMessage(`An unexpected error occurred: ${error.message}`);
      }
    };
    
    verifySubscription();
  }, [searchParams, supabase.auth]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <h2 className="mt-6 text-2xl font-bold text-center">Processing</h2>
            <p className="mt-2 text-center text-gray-600">{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-center text-green-600">Subscription Active!</h2>
            <p className="mt-2 text-center text-gray-600">{message}</p>
            <div className="mt-8">
              <Button
                onClick={() => router.push('/profile/subscriptions')}
                className="w-full"
              >
                View My Subscription
              </Button>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-center text-red-600">Subscription Error</h2>
            <p className="mt-2 text-center text-gray-600">{message}</p>
            <div className="mt-8 space-y-4">
              <Button
                onClick={() => router.push('/checkout')}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push('/support')}
                variant="outline"
                className="w-full"
              >
                Contact Support
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
