// src/app/pricing/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard, Loader2, AlertCircle } from 'lucide-react';
// import type { SubscriptionPlan } from '@/types/'; 
import { detectUserCountry } from '@/lib/utils/country';
import { createClient } from '@/utils/supabase/client'; 

// Footer is now global

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  duration?: string; 
  order: number;
  features: string[];
  highlight?: boolean;
  type: 'subscription' | 'one_time'; 
}

export const plans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    duration: '/ week',
    order: 1,
    features: [
      '✨ 100 AI Interactions per day',
      '🔮 Smart Suggestions',
      'Basic AI Model',
      'Standard Support',
      'Track Your Progress',
      'Ad-Free Experience'
    ],
    type: 'subscription',
  },
  {
    id: 'monthly',
    name: 'Monthly Saver',
    price: '₹699',
    duration: '/ month',
    order: 2,
    features: [
      '✨ 500 AI Interactions per day',
      '🔮 Smart Suggestions',
      '⚡ Genius Mode',
      'Premium AI Model',
      'Priority Support',
      'Advanced Analytics'
    ],
    highlight: false, 
    type: 'subscription',
  },
  {
    id: 'quarterly',
    name: 'Quarterly Pro',
    price: '₹1999',
    duration: '/ 3 months',
    order: 3,
    features: [
      '✨ 1,500 AI Interactions per day',
      '🔮 Smart Suggestions',
      '⚡ Genius Mode',
      'Premium AI Model',
      'Priority Support',
      'Advanced Analytics',
      'Early Access to New Features'
    ],
    type: 'subscription',
  },
];

const INSTITUTE_CONTACT_EMAIL = "aolbeam@outlook.com";

export default function PricingPage() {
  const [userCountry, setUserCountry] = useState<string>('IN');
  const [isLoading, setIsLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);

        if (session) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
          } else if (profile) {
            setUserSubscription(profile);
          }
        }

        const country = await detectUserCountry();
        setUserCountry(country);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const getPlanOrder = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.order : 0; 
  };

  const canUpgrade = (targetPlanId: string) => {
    if (!isLoggedIn) return true; 

    const currentUserPlanOrder = userSubscription?.is_subscribed
      ? getPlanOrder(userSubscription.subscription_plan_id)
      : 0; 

    const targetPlanOrder = getPlanOrder(targetPlanId);

    return targetPlanOrder > currentUserPlanOrder;
  };

  const getButtonText = (planId: string) => {
    if (!isLoggedIn) return `Choose ${plans.find(p => p.id === planId)?.name}`;

    const currentUserPlanOrder = userSubscription?.is_subscribed
      ? getPlanOrder(userSubscription.subscription_plan_id)
      : 0;
    const targetPlanOrder = getPlanOrder(planId);

    if (targetPlanOrder > currentUserPlanOrder) {
      return `Upgrade to ${plans.find(p => p.id === planId)?.name}`;
    } else if (targetPlanOrder === currentUserPlanOrder && userSubscription?.is_subscribed) {
      return 'Current Plan';
    } else if (targetPlanOrder < currentUserPlanOrder && userSubscription?.is_subscribed) {
      return 'Downgrade (Not Allowed)';
    } else {
      return `Choose ${plans.find(p => p.id === planId)?.name}`;
    }
  };

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
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-primary">
              AOLBEAM
            </h1>
          </div>
          <h2 className="text-3xl font-semibold mb-4">
            Choose Your Learning Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan to unlock unlimited learning and achieve your exam goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.highlight ? 'border-primary shadow-xl ring-2 ring-primary' : 'shadow-lg'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <PlanCardDescription className="text-3xl font-bold text-primary">
                  {plan.price} {plan.duration && <span className="text-lg font-normal text-muted-foreground">{plan.duration}</span>}
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
                  onClick={() => {
                    router.push(`/checkout?plan=${plan.id}`);
                  }}
                  className={`w-full text-lg py-3 ${plan.highlight ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
                  disabled={!canUpgrade(plan.id)}
                >
                  <CreditCard className="mr-2 h-5 w-5" /> {getButtonText(plan.id)}
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

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          We are working on implementing secure payment options. For now, please contact us for any payment processing issue encounters.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Our automated payment system will be rebust soon!
        </p>
      </div>
    </>
  );
}