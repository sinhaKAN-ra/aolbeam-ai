
// src/app/pricing/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard, Loader2 } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';
import { detectUserCountry } from '@/lib/utils/country';

// Footer is now global

const plans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    duration: '/ week',
    features: ['Unlimited Topic Searches', 'Unlimited Problem Generation', 'Track Your Progress', 'Ad-Free Experience'],
  },
  {
    id: 'monthly',
    name: 'Monthly Saver',
    price: '₹699',
    duration: '/ month',
    features: ['Unlimited Topic Searches', 'Unlimited Problem Generation', 'Track Your Progress', 'Ad-Free Experience', 'Priority Support'],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Pro',
    price: '₹1999',
    duration: '/ 3 months',
    features: ['Unlimited Topic Searches', 'Unlimited Problem Generation', 'Track Your Progress', 'Ad-Free Experience', 'Priority Support', 'Early Access to New Features'],
  },
];

const INSTITUTE_CONTACT_EMAIL = "aolbeam@outlook.com";

export default function PricingPage() {
  const [userCountry, setUserCountry] = useState<string>('IN');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Detect user's country on component mount
    const detectCountry = async () => {
      try {
        const country = await detectUserCountry();
        setUserCountry(country);
      } catch (error) {
        console.error('Error detecting country:', error);
      } finally {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-primary flex items-center justify-center gap-2">
            <Zap className="w-10 h-10" /> AOLBEAM Pricing Plans
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose a plan to unlock unlimited learning and achieve your exam goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.highlight ? 'border-primary shadow-xl ring-2 ring-primary' : 'shadow-lg'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <PlanCardDescription className="text-3xl font-bold text-primary">
                  {plan.price} <span className="text-lg font-normal text-muted-foreground">{plan.duration}</span>
                </PlanCardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-4 mt-auto">
                <Button
                  onClick={() => router.push(`/checkout?plan=${plan.id}`)}
                  className={`w-full text-lg py-3 ${plan.highlight ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
                >
                  <CreditCard className="mr-2 h-5 w-5" /> Choose {plan.name}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mt-16 max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Info className="text-primary"/> For Educational Institutes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                AOLBEAM offers tailored solutions including custom test series, bulk student packages, and dedicated support for educational institutions. Enhance your students' preparation with our AI-powered platform.
              </p>
              <Button variant="outline" asChild>
                <Link href="/contact-us">Contact Institute Sales</Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                (You can also reach us directly at{' '}
                <a 
                  href={`mailto:${INSTITUTE_CONTACT_EMAIL}?subject=Institute Inquiry`} 
                  className="text-primary hover:underline"
                >
                  {INSTITUTE_CONTACT_EMAIL}
                </a>)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout is now handled on a separate page */}
      
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Payments are processed securely via Cashfree. For details, please refer to the checkout process.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (Other payment options may be added in the future).
        </p>
      </div>
    </>
  );
}
