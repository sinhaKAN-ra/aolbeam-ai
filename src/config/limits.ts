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
  // Loosened from 15 -> 50 for logged-in free users.
  free: 50,
  weekly: 100,
  monthly: 300,
  quarterly: 600,
  one_time_cashfree: 1000,
};

/** AI problem/insight generation limits by plan (logged-in users). */
export const AI_GENERATION_LIMITS: Record<PlanId, number> = {
  free: 50,
  weekly: 200,
  monthly: 500,
  quarterly: 1000,
  one_time_cashfree: 1000,
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
