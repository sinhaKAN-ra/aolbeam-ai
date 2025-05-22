
"use client";

import type * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as PlanCardDescription } from '@/components/ui/card';
import { Check, Info, Zap, CreditCard } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';

// Simple Google Icon SVG
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enableBackground="new 0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.71c-.4-1.2-.62-2.48-.62-3.71s.22-2.51.62-3.71l-7.98-6.19C.92 18.05 0 20.94 0 24c0 3.06.92 5.95 2.56 8.48l7.97-6.77z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (planId: string) => void;
  onLoginRegister: () => void; 
  isMandatory?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    duration: '/ week',
    features: ['Unlimited Topic Searches', 'Track Your Progress', 'Ad-Free Experience'],
  },
  {
    id: 'monthly',
    name: 'Monthly Saver',
    price: '₹699',
    duration: '/ month',
    features: ['Unlimited Topic Searches', 'Track Your Progress', 'Ad-Free Experience', 'Priority Support'],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Pro',
    price: '₹1999',
    duration: '/ 3 months',
    features: ['Unlimited Topic Searches', 'Track Your Progress', 'Ad-Free Experience', 'Priority Support', 'Early Access to New Features'],
  },
];

const INSTITUTE_CONTACT_EMAIL = "aolbeam@outlook.com";

export function PaywallModal({ isOpen, onClose, onSubscribe, onLoginRegister, isMandatory }: PaywallModalProps) {
  if (!isOpen) return null;

  const dialogTitle = isMandatory ? "Welcome! Choose a Plan to Get Started" : "Unlock Full Access";
  const dialogDescriptionText = isMandatory 
    ? "To begin your learning journey with AOLBEAM, please select a subscription plan."
    : "You've reached your free interaction limit. Choose a plan to continue learning without limits!";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isMandatory) onClose(); }}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-3xl font-bold flex items-center gap-2">
            <Zap className="text-primary w-8 h-8" /> {dialogTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {dialogDescriptionText}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.highlight ? 'border-primary shadow-lg ring-2 ring-primary' : 'shadow-md'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <PlanCardDescription className="text-2xl font-bold text-primary">
                  {plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.duration}</span>
                </PlanCardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <ul className="space-y-1.5">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <DialogFooter className="p-4 pt-2 mt-auto">
                 <Button
                    onClick={() => onSubscribe(plan.id)} 
                    className={`w-full ${plan.highlight ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'} flex items-center justify-center`}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Choose {plan.name}
                  </Button>
              </DialogFooter>
            </Card>
          ))}
        </div>

        <div className="px-6 text-center">
            <p className="text-xs text-muted-foreground">
                Secure payments will be processed via Lemon Squeezy, Paddle, Cashfree, or PayPal.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                (Payment provider selection coming soon)
            </p>
        </div>
        
        <div className="px-6 py-4 bg-muted/50 mt-4">
            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="text-primary"/> For Institutes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        We offer custom test series and tailored packages for educational institutions.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = `mailto:${INSTITUTE_CONTACT_EMAIL}?subject=Institute Inquiry`}>
                        Contact Us For Institutes
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row sm:justify-between items-center">
          {!isMandatory && (
            <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
              Already have an account or need to create one?
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            {!isMandatory && (
              <Button variant="outline" onClick={onLoginRegister} className="flex items-center">
                <GoogleIcon className="mr-2 h-4 w-4" /> Login / Register with Google
              </Button>
            )}
            {!isMandatory && <Button variant="ghost" onClick={onClose}>Maybe Later</Button>}
            {isMandatory && <p className="text-xs text-muted-foreground">Account created via Google. Select a plan to activate.</p>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
