'use client';

import { useEffect, useState, useCallback } from 'react';
import { PayPalScriptProvider, ReactPayPalScriptOptions } from '@paypal/react-paypal-js';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { CheckoutContent } from '@/components/checkout/CheckoutContent';
import { ConvertedPlan, PlanId, PaymentProvider } from '@/app/checkout/types';

// Define plans with basic and premium tiers
const plans: Array<Omit<ConvertedPlan, 'price' | 'originalPrice' | 'oneTimePrice' | 'subscriptionPrice' | 'provider'>> = [
  {
    id: 'weekly' as PlanId,
    name: 'Beam Basic',
    description: 'Access to all Beam features with limited generations',
    basePrice: 9.99,
    baseOriginalPrice: 14.99,
    subscriptionEnabled: true,
    features: [
      'Unlimited chat conversations',
      'Basic content generation',
      'Standard support'
    ],
    duration: '7 days',
    interval: 'weekly'
  },
  {
    id: 'monthly' as PlanId,
    name: 'Beam Premium',
    description: 'Full access to all Beam features with unlimited generations',
    basePrice: 19.99,
    baseOriginalPrice: 29.99,
    subscriptionEnabled: true,
    features: [
      'Unlimited chat conversations',
      'Advanced content generation',
      'Priority support',
      'Early access to new features'
    ],
    duration: '30 days',
    interval: 'monthly'
  }
];

export default function CheckoutPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [plan, setPlan] = useState<ConvertedPlan | null>(null);

  const detectCountryAndConvertPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get user's country from IP
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const country = data.country_code || 'US';
      setCountryCode(country);
      
      // For demo purposes, use the first plan
      // In a real app, you might get this from query params or user selection
      const selectedPlan = plans[0];
      
      // Format price as string with currency symbol based on country
      const formatPrice = (price: number): string => {
        if (country === 'IN') {
          // Use INR symbol and convert price (assuming 1 USD = ~83 INR)
          const inrPrice = Math.round(price * 83); // Convert to INR and round to whole number
          return `₹${inrPrice}`;
        } else {
          return `$${price.toFixed(2)}`;
        }
      };
      
      // Convert currency if needed (simplified version)
      const convertedPlan: ConvertedPlan = {
        ...selectedPlan,
        price: formatPrice(selectedPlan.basePrice),
        originalPrice: formatPrice(selectedPlan.baseOriginalPrice),
        oneTimePrice: formatPrice(selectedPlan.basePrice * 1.2), // Example: one-time price is 20% more
        subscriptionPrice: formatPrice(selectedPlan.basePrice),
        provider: country === 'IN' ? 'cashfree' : 'lemonsqueezy' as PaymentProvider
      };
      
      setPlan(convertedPlan);
    } catch (error) {
      console.error('Error detecting country:', error);
      // Fallback to US
      setCountryCode('US');
      
      // Format price as string with currency symbol (fallback to USD)
      const formatPrice = (price: number): string => {
        return `$${price.toFixed(2)}`;
      };
      
      const fallbackPlan: ConvertedPlan = {
        ...plans[0],
        price: formatPrice(plans[0].basePrice),
        originalPrice: formatPrice(plans[0].baseOriginalPrice),
        oneTimePrice: formatPrice(plans[0].basePrice * 1.2),
        subscriptionPrice: formatPrice(plans[0].basePrice),
        provider: 'lemonsqueezy' as PaymentProvider
      };
      
      setPlan(fallbackPlan);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    detectCountryAndConvertPrices();
  }, [detectCountryAndConvertPrices]);

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
          <CheckoutContent plan={plan} isLoading={isLoading} countryCode={countryCode} />
        </div>
      </AuthGuard>
    </PayPalScriptProvider>
  );
}

