// src/app/pricing/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard, Loader2, AlertCircle, Star, Lock, Users, BarChart3, Share2, TrendingUp } from 'lucide-react';
import type { SubscriptionPlan } from '@/types'; 
import { detectUserCountry } from '@/lib/utils/country';
import { createClient } from '@/utils/supabase/client'; 

// Footer is now global

// Inline SubscriptionPlan interface removed, will use the one from @/types

export const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Tier',
    price: '₹0',
    currency: 'INR',
    duration: '/ forever',
    order: 0,
    features: [
      '🎯 Problem Generation & Insights:',
      '   • Guest: 10 interactions',
      '   • Logged: 20 interactions',
      '💬 Chat Interactions:',
      '   • Guest: Must login',
      '   • Logged: 15 per day',
      '📝 Test Creation:',
      '   • Guest: Must login', 
      '   • Logged: 5 tests',
      '📊 Basic Analytics',
      '✨ Community Support'
    ],
    type: 'free',
    highlight: false,
  },
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    currency: 'INR',
    duration: '/ week',
    order: 1,
    features: [
      '🎯 Unlimited Problem Generation & Insights',
      '💬 50 Chat Interactions per day',
      '📝 Create 10 Tests',
      '📊 Advanced Test Analysis',
      '🔗 Share Tests with Others',
      '📈 Personal Statistics Dashboard',
      '⚡ Fast Response Times',
      '🎨 Ad-Free Experience',
      '💡 Smart Suggestions'
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
      '🎯 Unlimited Problem Generation & Insights',
      '💬 100 Chat Interactions per day',
      '📝 Create 20 Tests',
      '🔮 Genius Mode AI',
      '📊 Advanced Test Analysis',
      '🔗 Share Tests with Others',
      '📈 Detailed Performance Analytics',
      '⚡ Priority Support',
      '🎯 Personalized Study Plans',
      '📚 Premium Content Library'
    ],
    highlight: true, 
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
      '🎯 Unlimited Problem Generation & Insights',
      '💬 200 Chat Interactions per day',
      '📝 Create 30 Tests',
      '🔮 Genius Mode AI',
      '📊 Advanced Test Analysis & AI Insights',
      '🔗 Share Tests & Create Study Groups',
      '📈 Comprehensive Performance Analytics',
      '👥 Collaborative Study Features',
      '🏆 Progress Tracking & Achievements',
      '🚀 Early Access to New Features',
      '💎 Premium Support & Coaching'
    ],
    type: 'subscription',
  },
];

const INSTITUTE_CONTACT_EMAIL = "aolbeam@outlook.com";

const getPlanDetails = (planId: string): SubscriptionPlan | undefined => {
  return plans.find(p => p.id === planId);
};

const FeatureIcon = ({ feature }: { feature: string }) => {
  if (feature.includes('Must login')) {
    return <Lock className="w-4 h-4 text-orange-500 mt-1 shrink-0" />;
  }
  return <Check className="w-4 h-4 text-green-500 mt-1 shrink-0" />;
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
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);

        if (user) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
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
    if (!targetPlan) return { text: "Plan Unavailable", enabled: false, isCurrent: false };

    // Special handling for free tier
    if (targetPlan.id === 'free') {
      if (!isLoggedIn) {
        return { text: "Get Started Free", enabled: true, isCurrent: false };
      }
      
      // Check if user is on free tier (no subscription or expired subscription)
      if (!userSubscription?.subscription_plan_id || !userSubscription.is_subscribed) {
        return { text: "Current Plan", enabled: false, isCurrent: true };
      }
      
      return { text: "Downgrade to Free", enabled: true, isCurrent: false };
    }

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

  const handlePlanAction = (planId: string) => {
    if (planId === 'free') {
      if (!isLoggedIn) {
        router.push('/auth/signup');
      } else {
        // Handle downgrade to free if needed
        // This might require additional logic based on your backend
        console.log('Switching to free plan');
      }
    } else {
      router.push(`/checkout?plan=${planId}`);
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
            Start free and upgrade as you grow. Select the perfect plan to unlock unlimited learning and achieve your exam goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col relative ${
              plan.highlight 
                ? 'border-primary shadow-xl ring-2 ring-primary scale-105' 
                : plan.id === 'free' 
                  ? 'border-green-200 shadow-lg bg-gradient-to-b from-green-50 to-white' 
                  : 'shadow-lg hover:shadow-xl transition-shadow'
            }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}
              {plan.id === 'free' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Get Started
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  {plan.id === 'free' && <Zap className="w-5 h-5 text-green-500" />}
                  {plan.name}
                </CardTitle>
                <PlanCardDescription className="text-3xl font-bold text-primary">
                  {plan.price} 
                  {plan.duration && <span className="text-lg font-normal text-muted-foreground">{plan.duration}</span>}
                </PlanCardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow space-y-3">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${
                      feature.startsWith('   •') ? 'ml-4 text-muted-foreground' : ''
                    }`}>
                      {!feature.startsWith('   •') && !feature.endsWith(':') && (
                        <FeatureIcon feature={feature} />
                      )}
                      <span className={`${
                        feature.endsWith(':') ? 'font-semibold text-foreground' : ''
                      } ${feature.includes('Must login') ? 'text-orange-600' : ''}`}>
                        {feature}
                      </span>
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
                          handlePlanAction(plan.id);
                        }
                      }}
                      className={`w-full text-sm py-3 ${
                        plan.highlight 
                          ? '' 
                          : plan.id === 'free'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-accent text-accent-foreground hover:bg-accent/90'
                      } ${!action.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!action.enabled || action.isCurrent}
                    >
                      {plan.id === 'free' ? (
                        <Zap className="mr-2 h-4 w-4" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      {action.text}
                    </Button>
                  );
                })()}
              </div>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Section */}
        <div className="mt-16">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="text-primary"/> Feature Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 w-full sm:w-1/5">Feature</th>
                      <th className="text-center py-2 w-full sm:w-1/5">Free</th>
                      <th className="text-center py-2 w-full sm:w-1/5">Weekly</th>
                      <th className="text-center py-2 w-full sm:w-1/5">Monthly</th>
                      <th className="text-center py-2 w-full sm:w-1/5">Quarterly</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 w-full sm:w-1/5">Problem Generation (Guest/Logged)</td>
                      <td className="text-center py-2 w-full sm:w-1/5">10/20</td>
                      <td className="text-center py-2 w-full sm:w-1/5">Unlimited</td>
                      <td className="text-center py-2 w-full sm:w-1/5">Unlimited</td>
                      <td className="text-center py-2 w-full sm:w-1/5">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 w-full sm:w-1/5">Chat Interactions/day</td>
                      <td className="text-center py-2 w-full sm:w-1/5">0/15</td>
                      <td className="text-center py-2 w-full sm:w-1/5">50</td>
                      <td className="text-center py-2 w-full sm:w-1/5">100</td>
                      <td className="text-center py-2 w-full sm:w-1/5">200</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 w-full sm:w-1/5">Test Creation</td>
                      <td className="text-center py-2 w-full sm:w-1/5">0/5</td>
                      <td className="text-center py-2 w-full sm:w-1/5">10</td>
                      <td className="text-center py-2 w-full sm:w-1/5">20</td>
                      <td className="text-center py-2 w-full sm:w-1/5">30</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 w-full sm:w-1/5">Advanced Analytics</td>
                      <td className="text-center py-2 w-full sm:w-1/5">Basic</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 w-full sm:w-1/5">Share Tests & Study Groups</td>
                      <td className="text-center py-2 w-full sm:w-1/5">-</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                      <td className="text-center py-2 w-full sm:w-1/5">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/contact-us">
                    <Users className="mr-2 h-4 w-4" />
                    Contact Institute Sales
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/demo">
                    <Share2 className="mr-2 h-4 w-4" />
                    Schedule Demo
                  </Link>
                </Button>
              </div>
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
          Our automated payment system will be robust soon!
        </p>
      </div>
    </>
  );
}