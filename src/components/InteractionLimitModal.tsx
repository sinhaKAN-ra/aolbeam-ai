import { FEATURES } from '@/config/features';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Lock } from 'lucide-react';

interface InteractionLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  limit: number;
  isLoggedIn: boolean;
  isPaidPlan?: boolean;
  isDaily?: boolean;
}

export function InteractionLimitModal({
  open,
  onOpenChange,
  remaining,
  limit,
  isLoggedIn,
  isPaidPlan = false,
  isDaily = false,
}: InteractionLimitModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/pricing');
    onOpenChange(false);
  };

  const handleLogin = () => {
    router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <Lock className="h-5 w-5 text-primary" />
                AI Interaction Limit Reached
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-primary" />
                {remaining <= 0 ? 'AI Interaction Limit Reached' : 'Almost at Your Limit'}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-3">
            {!isLoggedIn ? (
              <div className="space-y-2">
                <p>You've used your guest allowance of {limit} AI interactions.</p>
                <p className="font-medium">Sign in to continue learning and save your progress.</p>
              </div>
            ) : isPaidPlan ? (
              <div className="space-y-2">
                <p>
                  You've used <span className="font-medium text-primary">{limit - remaining}</span> out of your <span className="font-medium text-primary">{limit}</span> daily AI interactions.
                </p>
                <p>Your daily allowance resets tomorrow.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  You've used <span className="font-medium text-primary">{limit - remaining}</span> out of your <span className="font-medium text-primary">{limit}</span> total AI interactions.
                </p>
                <p>Your daily allowance resets tomorrow.</p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {!isLoggedIn ? (
            <Button onClick={handleLogin} className="w-full" size="lg">
              <Zap className="mr-2 h-5 w-5" />
              Sign Up for Free Access
            </Button>
          ) : (
            <Button onClick={FEATURES.payments ? handleUpgrade : () => onOpenChange(false)} className="w-full" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              {FEATURES.payments ? "Upgrade to Premium" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
