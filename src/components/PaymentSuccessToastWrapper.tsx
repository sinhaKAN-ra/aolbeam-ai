'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentSuccessToastWrapperProps {
  paymentStatus: string | null;
  paymentMethod: string | null;
  orderId: string | null;
}

export default function PaymentSuccessToastWrapper({ 
  paymentStatus, 
  paymentMethod, 
  orderId 
}: PaymentSuccessToastWrapperProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (paymentStatus && paymentMethod && orderId) {
      if (paymentStatus === 'SUCCESS') {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully. Thank you for your subscription!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "We couldn't process your payment. Please try again or contact support.",
        });
      }
    }
  }, [paymentStatus, paymentMethod, orderId, toast]);

  return null;
} 