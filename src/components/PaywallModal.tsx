"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (planId: string) => void;
  onLoginRegister: () => void;
  displayContext: 'guestLimitReached' | 'loggedInLimitReached' | 'mandatoryOnboarding' | null;
}
export function PaywallModal({ isOpen, onClose, onLoginRegister, displayContext }: PaywallModalProps) {
  if (!displayContext) return null;
  const guest = displayContext === 'guestLimitReached';
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent><DialogHeader>
      <DialogTitle>{guest ? 'Continue learning' : 'Daily limit reached'}</DialogTitle>
      <DialogDescription>{guest ? 'Sign in to continue learning and save your progress.' : 'Your daily allowance resets tomorrow. You can still review your saved practice and learning paths.'}</DialogDescription>
    </DialogHeader><DialogFooter>
      {guest && <Button onClick={onLoginRegister}>Sign in</Button>}
      <Button variant="outline" onClick={onClose}>Close</Button>
    </DialogFooter></DialogContent>
  </Dialog>;
}
