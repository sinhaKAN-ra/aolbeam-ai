import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { loadCashfree, type CashfreeInstance } from '@/services/cashfree';
import { toast } from '@/hooks/use-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    Cashfree: {
      Constructor: new (options: { mode: string }) => CashfreeInstance;
    };
  }
}

export function useSubscription() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize Supabase client with proper environment variables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
  
  // Add type for order data
  interface OrderData {
    order_id: string;
    payment_session_id: string;
    [key: string]: any;
  };

  const subscribe = useCallback(async (planId: string, planName: string, amount: number) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || 'User not authenticated');
      }

      // 2. Create an order with our backend
      const response = await fetch('/api/payments/cashfree/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          planName,
          amount,
          customerId: user.id,
          customerEmail: user.email,
          customerPhone: user.phone || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
      }

      const orderData: OrderData = await response.json();

      // 3. Load Cashfree SDK and get the instance
      const cashfree = await loadCashfree();

      // 4. Initialize payment with Cashfree
      const checkoutOptions = {
        paymentSessionId: orderData.payment_session_id,
        returnUrl: `${window.location.origin}/payment/return?order_id=${orderData.order_id}`,
        redirectTarget: "_modal",
        uiTheme: {
          theme: 'light',
          backgroundColor: '#ffffff',
          primaryColor: '#4f46e5',
          buttonText: '#ffffff',
        },
        customer: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
        },
        onSuccess: (data: any) => {
          console.log('Payment successful:', data);
          // The webhook will handle the actual subscription update
          window.location.href = `/payment/success?order_id=${data.order_id}&payment_id=${data.payment_id}`;
        },
        onFailure: (data: any) => {
          console.error('Payment failed:', data);
          toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: data.payment_message || 'Your payment could not be processed. Please try again.',
          });
        },
        onClose: () => {
          console.log('Checkout closed by user');
        },
      };

      // 5. Initialize the payment
      cashfree.payment.redirect(checkoutOptions);

      return orderData;
    } catch (err) {
      console.error('Subscription error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process subscription';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  return {
    subscribe,
    isLoading,
    error,
  };
}

export function useSubscriptionStatus() {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  const checkStatus = useCallback(async (orderId: string, paymentId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/verify?order_id=${orderId}&payment_id=${paymentId || ''}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify payment status');
      }

      const data = await response.json();
      setSubscription(data.data);
      return data;
    } catch (err) {
      console.error('Subscription status error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subscription status';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(subscription);
      return subscription;
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh subscription');
      return null;
    }
  }, [supabase]);

  return {
    subscription,
    isLoading,
    error,
    checkStatus,
    refreshSubscription,
  };
}
