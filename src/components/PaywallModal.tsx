
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Info, Zap } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (planId: string) => void;
  onLoginRegister: () => void; 
}

const plans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Pass',
    price: '₹249',
    duration: '/ week',
    features: ['Unlimited Topic Searches', 'Track Your Progress (Coming Soon)', 'Ad-Free Experience'],
  },
  {
    id: 'monthly',
    name: 'Monthly Saver',
    price: '₹699',
    duration: '/ month',
    features: ['Unlimited Topic Searches', 'Track Your Progress (Coming Soon)', 'Ad-Free Experience', 'Priority Support'],
    highlight: true,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Pro',
    price: '₹1999',
    duration: '/ 3 months',
    features: ['Unlimited Topic Searches', 'Track Your Progress (Coming Soon)', 'Ad-Free Experience', 'Priority Support', 'Early Access to New Features'],
  },
];

export function PaywallModal({ isOpen, onClose, onSubscribe, onLoginRegister }: PaywallModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-3xl font-bold flex items-center gap-2">
            <Zap className="text-primary w-8 h-8" /> Unlock Full Access
          </DialogTitle>
          <DialogDescription className="text-base">
            You've reached your free interaction limit. Login or choose a plan to continue learning without limits!
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col ${plan.highlight ? 'border-primary shadow-lg ring-2 ring-primary' : 'shadow-md'}`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">
                  {plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.duration}</span>
                </CardDescription>
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
                    className={`w-full ${plan.highlight ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
                  >
                    Subscribe to {plan.name}
                  </Button>
              </DialogFooter>
            </Card>
          ))}
        </div>
        
        <div className="px-6 py-4 bg-muted/50 rounded-b-lg">
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
                    <Button variant="outline" onClick={() => window.location.href = 'mailto:institutes@aolbeam.com?subject=Institute Inquiry'}>
                        Contact Us For Institutes
                    </Button>
                </CardContent>
            </Card>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row sm:justify-between items-center">
          <p className="text-sm text-muted-foreground mb-2 sm:mb-0">
            Already have an account or need to create one?
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onLoginRegister}>Login / Register with Google</Button>
            <Button variant="ghost" onClick={onClose}>Maybe Later</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
