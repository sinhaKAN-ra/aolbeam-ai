'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface ToastWrapperProps {
  orderId: string;
  status: string;
}

export default function ToastWrapper({ orderId, status }: ToastWrapperProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (orderId && status) {
      if (status === 'SUCCESS') {
        toast({
          title: "Payment Successful",
          description: "Thank you for your subscription. You now have full access to all features.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "We couldn't process your payment. Please try again or contact support.",
        });
      }
    }
  }, [orderId, status, toast]);

  return null;
} 