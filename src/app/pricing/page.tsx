// src/app/pricing/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import type { SubscriptionPlan } from '@/types'; 
import { detectUserCountry } from '@/lib/utils/country';
import { createClient } from '@/utils/supabase/client'; 

// Footer is now global

// Inline SubscriptionPlan interface removed, will use the one from @/types

export const plans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    currency: 'INR',
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
    currency: 'INR',
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
    currency: 'INR',
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
  // Example of a one-time plan, ensure it also has currency
  // {
  //   id: 'one_time_small',
  //   name: 'Token Pack Small',
  //   price: '₹99',
  //   currency: 'INR',
  //   order: 10, // Order can be used to group or sort one-time plans if needed
  //   features: [
  //     '✨ 50 AI Interactions (valid for 30 days)',
  //     'Basic AI Model'
  //   ],
  //   type: 'one_time',
  //   description: 'A small pack of interactions for light users.'
  // }
];

const INSTITUTE_CONTACT_EMAIL = "aolbeam@outlook.com";

const getPlanDetails = (planId: string): SubscriptionPlan | undefined => {
  return plans.find(p => p.id === planId);
};

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

  const determinePlanAction = (targetPlanId: string): { text: string; enabled: boolean; isCurrent: boolean } => {
    const targetPlan = getPlanDetails(targetPlanId);
    if (!targetPlan) return { text: "Plan Unavailable", enabled: false, isCurrent: false }; // Should not happen

    // Case 1: User is not logged in, or has no subscription history
    if (!isLoggedIn || !userSubscription?.subscription_plan_id) {
      return { text: `Choose ${targetPlan.name}`, enabled: true, isCurrent: false };
    }

    // Case 2: User is logged in and has a subscription_plan_id
    const currentPlan = getPlanDetails(userSubscription.subscription_plan_id);
    if (!currentPlan) {
      // User has a subscription_plan_id but it's not in our `plans` array (data inconsistency?)
      return { text: `Choose ${targetPlan.name}`, enabled: true, isCurrent: false }; 
    }

    // If the user is not marked as 'is_subscribed' (e.g. plan expired/canceled), they can choose any plan.
    // This check might need refinement based on actual subscription statuses from the 'subscriptions' table if 'is_subscribed' isn't sufficient.
    if (!userSubscription.is_subscribed) {
        return { text: `Choose ${targetPlan.name}`, enabled: true, isCurrent: false };
    }

    // Case 2a: Target plan is the same as the current plan
    if (currentPlan.id === targetPlan.id) {
      return { text: "Current Plan", enabled: false, isCurrent: true };
    }

    // Case 2b: User has an active subscription, evaluating change options
    if (currentPlan.type === 'subscription') {
      if (targetPlan.type === 'subscription') {
        const orderDiff = targetPlan.order - currentPlan.order;
        if (orderDiff === 1) {
          return { text: `Upgrade to ${targetPlan.name}`, enabled: true, isCurrent: false };
        }
        if (orderDiff === -1) {
          return { text: `Downgrade to ${targetPlan.name}`, enabled: true, isCurrent: false };
        }
        // Not an adjacent plan
        return { text: targetPlan.name, enabled: false, isCurrent: false }; 
      } else {
        // Trying to switch from subscription to one-time (currently not allowed by spec)
        return { text: targetPlan.name, enabled: false, isCurrent: false }; 
      }
    } else if (currentPlan.type === 'one_time') {
      if (targetPlan.type === 'subscription') {
        // Upgrading from one-time to any subscription
        return { text: `Switch to ${targetPlan.name}`, enabled: true, isCurrent: false };
      }
      // One-time to one-time (not specified, assume not an 'upgrade/downgrade' action, but a new purchase)
      // Or if it's the same one-time plan, it would have been caught by 'isCurrent'
      return { text: `Choose ${targetPlan.name}`, enabled: true, isCurrent: false }; 
    }

    // Fallback: Should ideally be covered by above logic
    return { text: `View ${targetPlan.name}`, enabled: false, isCurrent: false };
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
      <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-primary">
                AOLBEAM
              </h1>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold">
              Choose Your Learning Plan
            </h2>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan to unlock unlimited learning and achieve your exam goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                {(() => {
                  const action = determinePlanAction(plan.id);
                  return (
                    <Button
                      onClick={() => {
                        if (action.enabled) {
                          router.push(`/checkout?plan=${plan.id}`);
                        }
                      }}
                      className={`w-full text-lg py-3 ${plan.highlight ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'} ${!action.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!action.enabled || action.isCurrent}
                    >
                      <CreditCard className="mr-2 h-5 w-5" /> {action.text}
                    </Button>
                  );
                })()}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16">
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