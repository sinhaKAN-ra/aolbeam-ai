'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface CheckoutToastWrapperProps {
  error: string | null;
  success: string | null;
}

export default function CheckoutToastWrapper({ error, success }: CheckoutToastWrapperProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error,
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (success) {
      toast({
        title: "Success",
        description: success,
      });
    }
  }, [success, toast]);

  return null;
} 