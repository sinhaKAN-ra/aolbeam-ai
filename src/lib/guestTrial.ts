import { GUEST_CHAT_TRIAL_LIMIT } from '@/config/limits';

/**
 * Guest free-trial chat counter, stored in localStorage.
 * NOT a security boundary — a funnel nudge. Logged-in users bypass this
 * entirely (their limit is server-authoritative in /api/chat/stream).
 */
const KEY = 'guest-chat-count';

export function getGuestChatCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function guestChatRemaining(): number {
  return Math.max(0, GUEST_CHAT_TRIAL_LIMIT - getGuestChatCount());
}

export function canGuestChat(): boolean {
  return guestChatRemaining() > 0;
}

export function incrementGuestChatCount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(getGuestChatCount() + 1));
}

export const GUEST_LIMIT = GUEST_CHAT_TRIAL_LIMIT;
