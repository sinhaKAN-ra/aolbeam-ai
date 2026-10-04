/**
 * Single source of truth for usage limits.
 *
 * Previously three places defined chat limits independently and disagreed:
 *   - src/app/api/interactions/check/route.ts
 *   - src/app/api/chat/messages/route.ts
 *   - src/hooks/useFeatureAccess.ts
 * They should all import from here so limits can never drift again.
 *
 * Guests are NOT given a numeric limit — they are gated to the login modal.
 * These numbers apply to LOGGED-IN users only.
 */

export type PlanId = 'free' | 'weekly' | 'monthly' | 'quarterly' | 'one_time_cashfree';

/** Daily chat message limits by plan (logged-in users). */
export const CHAT_LIMITS: Record<PlanId, number> = {
  // Generous free tier so users get real value before paying.
  free: 75,
  weekly: 150,
  monthly: 400,
  quarterly: 800,
  one_time_cashfree: 1200,
};

/**
 * Guest (not logged-in) free-trial allowance. A real taste of the product
 * before the login prompt. Tracked client-side in localStorage — NOT a
 * security boundary, just a funnel nudge (a determined user can clear storage;
 * that's acceptable).
 */
export const GUEST_CHAT_TRIAL_LIMIT = 15;

/** AI problem/insight generation limits by plan (logged-in users). */
export const AI_GENERATION_LIMITS: Record<PlanId, number> = {
  free: 75,
  weekly: 250,
  monthly: 600,
  quarterly: 1200,
  one_time_cashfree: 1500,
};

/** Test creation limits by plan (feature currently hidden, kept for later). */
export const TEST_CREATION_LIMITS: Record<PlanId, number> = {
  free: 5,
  weekly: 10,
  monthly: 20,
  quarterly: 30,
  one_time_cashfree: 50,
};

export function chatLimitFor(planId: string): number {
  return CHAT_LIMITS[(planId as PlanId)] ?? CHAT_LIMITS.free;
}

export function aiGenerationLimitFor(planId: string): number {
  return AI_GENERATION_LIMITS[(planId as PlanId)] ?? AI_GENERATION_LIMITS.free;
}
