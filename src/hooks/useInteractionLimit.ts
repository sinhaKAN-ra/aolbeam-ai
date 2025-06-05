import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { InteractionType, type InteractionLimitResult, type InteractionCheckResponse } from '@/types/interaction';
import { User } from '@supabase/supabase-js';

export function useInteractionLimit(
  currentUser: User | null,
  guestInteractionCount: number,
  setGuestInteractionCount: (count: number) => void,
  freeInteractionLimit: number
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  const checkInteractionLimit = useCallback(async (interactionType: InteractionType): Promise<InteractionLimitResult> => {
    setIsLoading(true);
    setError(null);

    try {
      if (currentUser) {
        // Logged-in user: check interaction limit with the server
        const response = await fetch('/api/interactions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactionType })
        });

        if (!response.ok) {
          throw new Error('Failed to check interaction limit');
        }

        const result: InteractionCheckResponse = await response.json();

        return {
          ...result,
          requiresLogin: false,
          requiresUpgrade: result.allowed === false && result.isLoggedIn
        };
      } else {
        // Guest user: check client-side limit
        const remaining = freeInteractionLimit - guestInteractionCount;
        if (remaining > 0) {
          return {
            allowed: true,
            remaining: remaining,
            limit: freeInteractionLimit,
            isLoggedIn: false,
            requiresLogin: false,
            requiresUpgrade: false,
            showLoginModal: false,
            showUpgradeModal: false
          };
        } else {
          // Guest user has reached limit
          return {
            allowed: false,
            remaining: 0,
            limit: freeInteractionLimit,
            isLoggedIn: false,
            requiresLogin: true, // Prompt to login/register
            requiresUpgrade: false,
            showLoginModal: true,
            showUpgradeModal: false
          };
        }
      }
    } catch (err) {
      console.error('Error checking interaction limit:', err);
      setError('Failed to check interaction limit');
      return { allowed: false, remaining: 0, limit: 0, isLoggedIn: false, requiresLogin: false, requiresUpgrade: false, showLoginModal: false, showUpgradeModal: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentUser, guestInteractionCount, freeInteractionLimit]);

  const recordInteraction = useCallback(async (interactionType: InteractionType) => {
    try {
      if (currentUser) {
        // Logged-in user: record interaction with the server
        const response = await fetch('/api/interactions/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactionType })
        });

        if (!response.ok) {
          throw new Error('Failed to record interaction');
        }
        return true;
      } else {
        // Guest user: increment local storage count
        setGuestInteractionCount(guestInteractionCount + 1);
        return true;
      }
    } catch (err) {
      console.error('Error recording interaction:', err);
      return false;
    }
  }, [currentUser, guestInteractionCount, setGuestInteractionCount]);

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
