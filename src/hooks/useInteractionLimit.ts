import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { InteractionType, type InteractionLimitResult, type InteractionCheckResponse } from '@/types/interaction';
import { User } from '@supabase/supabase-js';

export function useInteractionLimit(
  currentUser: User | null,
  guestInteractionCount: number,
  setGuestInteractionCount: (count: number) => void,
  freeInteractionLimit: number,
  isAuthLoading: boolean
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  const checkInteractionLimit = useCallback(async (interactionType: InteractionType): Promise<InteractionLimitResult> => {
    // console.log('[useInteractionLimit] checkInteractionLimit called. AuthLoading:', isAuthLoading, 'CurrentUser:', currentUser ? currentUser.id : 'Guest');
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthLoading) {
        // If auth is still loading, we can't determine interaction limits yet
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          isLoggedIn: false,
          requiresLogin: false,
          requiresUpgrade: false,
          showLoginModal: false,
          showUpgradeModal: false,
          isLoading: true // Indicate that the limit check is still loading
        };
      }

      if (currentUser) {
        // Logged-in user: check interaction limit with the server
        // console.log('[useInteractionLimit] Logged-in user: Fetching from /api/interactions/check');
      const response = await fetch('/api/interactions/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interactionType })
        });

        if (!response.ok) {
          throw new Error('Failed to check interaction limit');
        }

        const data = await response.json() as InteractionCheckResponse;
        // console.log('[useInteractionLimit] API response for logged-in user:', data);

        const requiresUpgrade = data.allowed === false && data.isLoggedIn;
        return {
          ...data,
          requiresLogin: false,
          requiresUpgrade: requiresUpgrade,
          showLoginModal: false, // Logged-in users don't need login modal
          showUpgradeModal: requiresUpgrade // Explicitly set based on requiresUpgrade
        };
      } else {
        // Guest user: check client-side limit
        // console.log(`[useInteractionLimit] Guest check: Count (${guestInteractionCount}) vs Limit (${freeInteractionLimit})`);
        const remaining = freeInteractionLimit - guestInteractionCount;
        if (remaining > 0) {
          // console.log('[useInteractionLimit] Guest limit not reached, returning allowed state');
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
          // console.log('[useInteractionLimit] Guest limit reached, returning not allowed state');
          const result: InteractionLimitResult = { allowed: false, remaining: 0, limit: freeInteractionLimit, isLoggedIn: false, requiresLogin: true, requiresUpgrade: false, showLoginModal: true, showUpgradeModal: false, isLoading: false };
          // console.log('[useInteractionLimit] Guest limit reached:', result);
          return result;
        }
      }
    } catch (err) {
      console.error('Error checking interaction limit:', err);
      setError('Failed to check interaction limit');
      return { allowed: false, remaining: 0, limit: 0, isLoggedIn: false, requiresLogin: false, requiresUpgrade: false, showLoginModal: false, showUpgradeModal: false };
    } finally {
      setIsLoading(false);
    }
  }, [supabase, currentUser, guestInteractionCount, freeInteractionLimit, isAuthLoading]);

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
        // console.log('[useInteractionLimit] Interaction recorded for logged-in user');
        return true;
      } else {
        // Guest user: increment local storage count
        // console.log('[useInteractionLimit] Incrementing guest interaction count');
        setGuestInteractionCount(guestInteractionCount + 1);
        return true;
      }
    } catch (err) {
      console.error('Error recording interaction:', err);
      return false;
    }
  }, [currentUser, guestInteractionCount, setGuestInteractionCount, isAuthLoading]);

  const requireInteraction = useCallback(async (interactionType: InteractionType): Promise<InteractionLimitResult> => {
    // console.log('[useInteractionLimit] requireInteraction called. InteractionType:', interactionType);
    const initialCheckResult = await checkInteractionLimit(interactionType);
    
    // If not allowed from the start, return this result immediately.
    // This result will correctly have showLoginModal or showUpgradeModal set by the server.
    if (!initialCheckResult.allowed) {
      return initialCheckResult;
    }

    // If allowed, attempt to record the interaction.
    const recordedSuccessfully = await recordInteraction(interactionType);
    
    if (!recordedSuccessfully) {
      console.warn('Failed to record interaction. Returning initial allowed state but interaction may not be saved.');
      // Decide on behavior: return initialCheckResult (allowing UI to proceed but interaction not saved)
      // or return an error state. For now, let's return the initial allowed state.
      return { ...initialCheckResult, isLoading: false }; // Ensure isLoading is false
    }

    // If interaction was allowed and successfully recorded, return the initial check result.
    // The UI will reflect the successful interaction. The *next* call to checkInteractionLimit
    // (e.g., on next action or page refresh) will reflect the new count.
    // It's important that THIS successful interaction attempt doesn't immediately trigger a paywall
    // if it was the one that hit the limit. The paywall should trigger on the *next* attempt.
    // However, if the current interaction IS the one that hits the limit, the server response in initialCheckResult
    // for the *next* theoretical interaction (if it were checked immediately after recording) would show allowed:false.
    // The current logic in page.tsx uses the returned 'allowed' status to gate the actual AI call.
    // So, if initialCheckResult.allowed was true, the AI call proceeds.
    // The problem is when initialCheckResult.allowed is true, but this interaction IS the last one.
    // The `page.tsx` needs to know this to show the modal *after* this interaction completes.

    // Let's re-evaluate. If initialCheckResult.allowed is true, we perform the action.
    // After performing, we need to know if *now* the limit is hit to display the correct modal for *next time*.
    // The current structure in page.tsx relies on the result of requireInteraction to show the modal.

    // If initialCheckResult.allowed was true, it means the user *could* perform this action.
    // After recording, we should check again to see if *now* they've hit the limit.
    // This updated check will determine if a modal should be shown for the *next* interaction.
    // However, the `page.tsx` uses the result of `requireInteraction` to decide whether to show the modal *now*.

    // If initialCheckResult.allowed is true, the action proceeds.
    // The responsibility of showing the modal if *this* interaction was the last one
    // falls to the UI to re-check or for this function to provide that info.
    // The current `page.tsx` logic: if `!interactionResult.allowed`, it then checks `showUpgradeModal`.

    // If the interaction was allowed and recorded, the `allowed` field for *this* interaction is true.
    // The modal display flags should reflect the state *after* this interaction for the *next* attempt.
    // This means we might need to return the result of a second check if the first allowed it.

    // Consider the case where the user has 1 interaction left.
    // initialCheckResult: allowed: true, showUpgradeModal: false.
    // recordInteraction: success.
    // Now, if they try *another* interaction, checkInteractionLimit will return allowed: false, showUpgradeModal: true.
    // The `page.tsx` needs `showUpgradeModal: true` if *this* interaction was the one that made them hit the limit.

    // Let's return the result of a check *after* recording, but ensure 'allowed' reflects the initial check for the current action.
    const finalCheckResult = await checkInteractionLimit(interactionType); // Check status *after* recording

    return {
      ...finalCheckResult, // This will have the correct remaining, limit, and showUpgradeModal for the *next* state
      allowed: initialCheckResult.allowed, // But the 'allowed' for *this* action is based on the initial check
      // Ensure isLoading is false if not already set by finalCheckResult
      isLoading: finalCheckResult.isLoading !== undefined ? finalCheckResult.isLoading : false,
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
