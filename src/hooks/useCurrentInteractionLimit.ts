"use client";
import { useLocalStorage } from './useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { GUEST_CHAT_TRIAL_LIMIT } from '@/config/limits';
import { useInteractionLimit } from './useInteractionLimit';

export function useCurrentInteractionLimit() {
  const { user, isLoading } = useAuth();
  const [guestCount, setGuestCount] = useLocalStorage<number>('aolbeamGuestInteractionCount', 0);
  return useInteractionLimit(user, guestCount, setGuestCount, GUEST_CHAT_TRIAL_LIMIT, isLoading);
}
