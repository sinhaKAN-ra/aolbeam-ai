import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useRouter } from 'next/navigation';
import { InteractionType, type InteractionLimitResult, type InteractionCheckResponse } from '@/types/interaction';

export function useInteractionLimit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter();

  const checkInteractionLimit = useCallback(async (interactionType: InteractionType): Promise<InteractionLimitResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current session to check if user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If not logged in, return limited access
      if (sessionError || !session) {
        return { 
          allowed: false, 
          remaining: 0, 
          limit: 5, // This will be handled by the server for actual limits
          isLoggedIn: false,
          requiresLogin: true,
          requiresUpgrade: false,
          showLoginModal: true,
          showUpgradeModal: false
        };
      }

      // Check interaction limit with the server
      const response = await fetch('/api/interactions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionType })
      });

      if (!response.ok) {
        throw new Error('Failed to check interaction limit');
      }

      const result: InteractionCheckResponse = await response.json();
      
      // Convert API response to InteractionLimitResult
      return {
        ...result,
        requiresLogin: false,
        requiresUpgrade: result.allowed === false && result.isLoggedIn
      };

    } catch (err) {
      console.error('Error checking interaction limit:', err);
      setError('Failed to check interaction limit');
      // Default to not allowing if there's an error
      return { allowed: false, remaining: 0, limit: 0, isLoggedIn: false, requiresLogin: false, requiresUpgrade: false, showLoginModal: false, showUpgradeModal: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const recordInteraction = useCallback(async (interactionType: InteractionType) => {
    try {
      const response = await fetch('/api/interactions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionType })
      });

      if (!response.ok) {
        throw new Error('Failed to record interaction');
      }

      return true;
    } catch (err) {
      console.error('Error recording interaction:', err);
      return false;
    }
  }, []);

  const requireInteraction = useCallback(async (interactionType: InteractionType): Promise<InteractionLimitResult> => {
    const result = await checkInteractionLimit(interactionType);
    
    // If not allowed, return the result directly. The result object will now contain
    // showLoginModal or showUpgradeModal set to true if needed by the server response.
    if (!result.allowed) {
      return result;
    }

    // If allowed, record the interaction
    const recorded = await recordInteraction(interactionType);
    if (!recorded) {
      console.warn('Failed to record interaction');
    }

    // Get updated count after recording the interaction
    const updatedResult = await checkInteractionLimit(interactionType);
    
    // Ensure that if allowed, no modals are shown
    return { 
      ...updatedResult,
      allowed: true, // Explicitly set to true as interaction was allowed and recorded
      showLoginModal: false,
      showUpgradeModal: false
    };
  }, [checkInteractionLimit, recordInteraction]);

  return {
    checkInteractionLimit,
    recordInteraction,
    requireInteraction,
    isLoading,
    error
  };
}
