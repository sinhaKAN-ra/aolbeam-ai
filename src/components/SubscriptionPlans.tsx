'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { loadCashfree, createCashfreeOrder, initializePayment } from '@/services/cashfree';
import { Loader2 } from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 299,
    description: 'Perfect for getting started',
    features: [
      'Access to basic problems',
      '5 problem generations per day',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 799,
    description: 'For serious learners',
    features: [
      'Unlimited problem generation',
      'Priority support',
      'Advanced problem types',
      'Detailed solutions',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2499,
    description: 'For educational institutions',
    features: [
      'Everything in Pro',
      'Custom problem sets',
      'Dedicated account manager',
      'API access',
    ],
  },
];

export default function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Load Cashfree script when component mounts
  useEffect(() => {
    const loadScript = async () => {
      try {
        await loadCashfree();
        setScriptLoaded(true);
      } catch (error) {
        console.error('Failed to load Cashfree script:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load payment processor. Please try again later.',
        });
      }
    };

    // Only load the script if it's not already loaded
    if (!scriptLoaded) {
      loadScript();
    }
  }, [toast, scriptLoaded]);

  const handleSubscribe = async (planId: string) => {
    if (!scriptLoaded) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Payment processor is still loading. Please wait a moment and try again.',
      });
      return;
    }

    setIsLoading(true);
    setSelectedPlan(planId);

    try {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('Invalid plan selected');

      // Generate a unique order ID
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create order with Cashfree
      const response = await createCashfreeOrder({
        orderId,
        orderAmount: plan.price,
        orderCurrency: 'INR',
        customerName: 'John Doe', // Replace with actual user data
        customerEmail: 'user@example.com', // Replace with actual user data
        customerPhone: '9876543210', // Replace with actual user data
        returnUrl: `${window.location.origin}/payment/success`,
        orderNote: `Subscription to ${plan.name} plan`,
      });

      // Initialize payment
      initializePayment(
        {
          payment_session_id: response.data.payment_session_id,
          return_url: `${window.location.origin}/payment/success`,
        },
        (data) => {
          console.log('Payment successful:', data);
          router.push('/payment/success');
        },
        (error) => {
          console.error('Payment failed:', error);
          toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: 'There was an error processing your payment. Please try again.',
          });
        }
      );
    } catch (error) {
      console.error('Error during payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process payment',
      });
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Select the plan that best fits your learning needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <Card 
            key={plan.id}
            className={`relative overflow-hidden ${plan.popular ? 'border-2 border-primary' : ''}`}
          >
            {plan.popular && (
              <div className="bg-primary text-white text-xs font-medium px-3 py-1 absolute top-0 right-0 rounded-bl-md">
                POPULAR
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">₹{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading && selectedPlan === plan.id}
              >
                {isLoading && selectedPlan === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
