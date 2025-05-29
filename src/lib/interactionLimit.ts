import { useInteractionLimit } from '@/hooks/useInteractionLimit';
import { useState } from 'react';

type InteractionType = 'evaluate' | 'insight';

interface InteractionLimitResult {
  execute: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useLimitedInteraction(interactionType: InteractionType): InteractionLimitResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requireInteraction } = useInteractionLimit();

  const execute = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await requireInteraction(interactionType);
      
      if (!result.allowed) {
        // The modal will be shown by the hook
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error in limited interaction:', err);
      setError('An error occurred while checking interaction limits');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}

// Higher-order function to wrap any async function with interaction limit checking
export function withInteractionLimit<T extends any[]>(fn: (...args: T) => Promise<void>, interactionType: InteractionType) {
  return async function wrappedFunction(...args: T): Promise<boolean> {
    try {
      // We'll use the hook in the component that calls this function
      // This is just a placeholder that will be replaced by the actual implementation
      return true;
    } catch (error) {
      console.error('Error in wrapped function:', error);
      return false;
    }
  };
}
