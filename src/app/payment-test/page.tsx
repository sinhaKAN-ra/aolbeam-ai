'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Add type declaration for Cashfree
declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function PaymentTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  const testPlan = {
    id: 'test_plan_1',
    name: 'Test Plan',
    price: 100, // ₹1.00
    description: 'This is a test plan for Cashfree integration'
  };

  const handlePayment = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment.",
        variant: "destructive",
      });
      router.push('/auth/signin');
      return;
    }

    try {
      setIsLoading(true);
      
      // Call our API route to create order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: testPlan.id,
          amount: testPlan.price,
          currency: 'INR',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const data = await response.json();
      
      // Initialize Cashfree payment
      const cashfree = new window.Cashfree({
        orderToken: data.orderToken,
        onSuccess: function(data: any) {
          console.log('Payment success:', data);
          toast({
            title: "Payment Successful",
            description: "Your test payment was successful!",
          });
        },
        onFailure: function(data: any) {
          console.log('Payment failed:', data);
          toast({
            title: "Payment Failed",
            description: "Your test payment failed. Please try again.",
            variant: "destructive",
          });
        },
        onClose: function() {
          console.log('Payment window closed');
        }
      });

      cashfree.drop();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Payment Integration Test</h1>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{testPlan.name}</CardTitle>
          <CardDescription>{testPlan.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">₹{(testPlan.price / 100).toFixed(2)}</p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handlePayment} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Test Payment'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 