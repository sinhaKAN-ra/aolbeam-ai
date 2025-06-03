'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { PayPalScriptProvider, ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { CheckoutContent } from '@/components/checkout/CheckoutContent';
import { CheckoutPlanInfo, PlanId, PaymentProvider } from '@/app/checkout/types';
import { SubscriptionPlan } from '@/types';
import { plans } from '@/app/pricing/page'; // Import the plans array from pricing page
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const parsePriceString = (priceStr: string): { numericPrice: number; currencySymbol: string } => {
  const match = priceStr.match(/([₹$])?\s*([\d,.]+)/);
  if (match) {
    const symbol = match[1] || (priceStr.includes('₹') ? '₹' : '$');
    const numericVal = parseFloat(match[2].replace(/,/g, ''));
    return { numericPrice: numericVal, currencySymbol: symbol };
  }
  console.warn(`Could not parse price string: ${priceStr}`);
  return { numericPrice: 0, currencySymbol: '$' }; // Default fallback
};

export default function CheckoutPageClient() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [plan, setPlan] = useState<CheckoutPlanInfo | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const getPlanOrder = useCallback((planId: string) => {
    const p: SubscriptionPlan | undefined = plans.find(p => p.id === planId);
    return p && p.order !== undefined ? p.order : 0; // Ensure it always returns a number
  }, []);

  const fetchPlanAndUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const planId = searchParams?.get('plan');
      if (!planId) {
        console.error('No plan ID found in query parameters.');
        // Optionally redirect to pricing page or show an error
        setIsLoading(false);
        return;
      }

      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        console.error(`Plan with ID ${planId} not found.`);
        // Optionally redirect or show an error
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let currentUserPlanOrder = 0;
      if (session) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('is_subscribed, subscription_plan_id')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        } else if (profile && profile.is_subscribed && profile.subscription_plan_id) {
          currentUserPlanOrder = getPlanOrder(profile.subscription_plan_id);
        }
      }

      const targetPlanOrder: number = getPlanOrder(selectedPlan.id);

      // Enforce upgrade-only flow
      if (session && targetPlanOrder !== undefined && targetPlanOrder <= currentUserPlanOrder) {
        console.error('Cannot downgrade or select current plan.');
        // Redirect to pricing page or show an error
        // For now, setting plan to null and stopping loading
        setPlan(null);
        setIsLoading(false);
        return;
      }

      // Get user's country from IP
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const country = data.country_code || 'US';
      setCountryCode(country);
      
      const { numericPrice, currencySymbol: parsedSymbol } = parsePriceString(selectedPlan.price);
      
      const finalCurrencySymbol = country === 'IN' ? '₹' : parsedSymbol;

      const checkoutPlanInfo: CheckoutPlanInfo = {
        id: selectedPlan.id,
        name: selectedPlan.name,
        features: selectedPlan.features,
        originalType: selectedPlan.type, // 'subscription' or 'one_time' from pricing plan
        countryCode: country,
        currencySymbol: finalCurrencySymbol,
        baseNumericPrice: numericPrice,
        duration: selectedPlan.duration,
      };
      
      setPlan(checkoutPlanInfo);
    } catch (error) {
      console.error('Error in fetchPlanAndUserData:', error);
      setCountryCode('US'); // Fallback
      setPlan(null); // Clear plan on error
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, getPlanOrder, supabase]);

  useEffect(() => {
    setIsClient(true);
    fetchPlanAndUserData();
  }, [fetchPlanAndUserData]);

  if (!isClient) {
    return null;
  }

  const paypalOptions: ReactPayPalScriptOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: 'USD',
    intent: 'capture',
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <AuthGuard>
        <div className="container mx-auto py-6 space-y-6">
          <CheckoutContent 
            plan={plan} // plan is now CheckoutPlanInfo | null
            isLoading={isLoading}
            // countryCode and originalType are now within the plan object passed to CheckoutContent
          />
        </div>
      </AuthGuard>
    </PayPalScriptProvider>
  );
}
