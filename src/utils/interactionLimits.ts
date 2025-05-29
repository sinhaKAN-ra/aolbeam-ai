import { InteractionType } from '@/types/interaction';

/**
 * Utility function to check and handle interaction limits before performing an action
 * @param interactionType The type of interaction to check (evaluate or insight)
 * @param interactionLimitHook The useInteractionLimit hook instance
 * @param onLimitReached Callback function to execute when the limit is reached
 * @param onSuccess Callback function to execute when the interaction is allowed
 */
export async function checkInteractionLimit(
  interactionType: InteractionType,
  interactionLimitHook: ReturnType<typeof import('@/hooks/useInteractionLimit').useInteractionLimit>,
  onLimitReached?: (result: import('@/types/interaction').InteractionLimitResult) => void,
  onSuccess?: () => void
): Promise<boolean> {
  try {
    // Check if the user has remaining interactions
    const result = await interactionLimitHook.requireInteraction(interactionType);
    
    if (!result.allowed) {
      // If the user has reached their limit, call the onLimitReached callback
      onLimitReached?.(result);
      return false;
    }
    
    // If the user has remaining interactions, call the onSuccess callback
    onSuccess?.();
    return true;
  } catch (error) {
    console.error('Error checking interaction limit:', error);
    return false;
  }
}

/**
 * Utility function to get a user-friendly message based on the interaction limit result
 * @param result The interaction limit result
 * @param interactionType The type of interaction
 * @returns A user-friendly message
 */
export function getInteractionLimitMessage(
  result: import('@/types/interaction').InteractionLimitResult,
  interactionType: InteractionType
): string {
  const actionType = interactionType === 'evaluate' ? 'problem evaluations' : 'topic insights';
  
  if (!result.isLoggedIn) {
    return `Please log in to access ${actionType}.`;
  }
  
  if (result.limit === -1 || result.remaining === -1) {
    return `You have unlimited ${actionType} with your premium plan.`;
  }
  
  if (result.remaining === 0) {
    return `You've reached your daily limit for ${actionType}. Upgrade for unlimited access.`;
  }
  
  return `You have ${result.remaining} ${actionType} remaining today.`;
}
