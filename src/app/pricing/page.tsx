
// src/app/pricing/page.tsx
"use client";

import Link from 'next/link'; // Keep Link for internal navigation if any
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';
import Footer from '@/components/Footer';

// Metadata removed as it conflicts with "use client"

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
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header is now global */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
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
                    onClick={() => {
                      alert(`Subscribing to ${plan.name} (Placeholder). Full integration coming soon!`);
                    }}
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
                        (You can also reach us directly at <a href={`mailto:${INSTITUTE_CONTACT_EMAIL}?subject=Institute Inquiry`} className="text-primary hover:underline">{INSTITUTE_CONTACT_EMAIL}</a>)
                    </p>
                </CardContent>
            </Card>
        </div>
         <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
                All payments are processed securely. For details on payment providers like PayPal, Cashfree, Lemon Squeezy, or Paddle, please refer to the checkout process.
            </p>
        </div>

      </main>
      <Footer />
    </div>
  );
}
