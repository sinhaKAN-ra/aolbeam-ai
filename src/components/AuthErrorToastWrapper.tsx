'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface AuthErrorToastWrapperProps {
  error: string | null;
}

export default function AuthErrorToastWrapper({ error }: AuthErrorToastWrapperProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error,
      });
    }
  }, [error, toast]);

  return null;
} 