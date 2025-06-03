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
                <p>You've used all 15 free AI interactions available to guests.</p>
                <p className="font-medium">Sign up now to get 25 total interactions and unlock more features!</p>
              </div>
            ) : isPaidPlan ? (
              <div className="space-y-2">
                <p>
                  You've used <span className="font-medium text-primary">{limit - remaining}</span> out of your <span className="font-medium text-primary">{limit}</span> daily AI interactions.
                </p>
                <p>Upgrade to our higher tier plan to get even more daily interactions!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  You've used <span className="font-medium text-primary">{limit - remaining}</span> out of your <span className="font-medium text-primary">{limit}</span> total AI interactions.
                </p>
                <p>Upgrade to a premium plan to get <span className="font-medium">100-1,500 interactions per day</span> and unlock ✨ Smart Suggestions and ⚡ Genius Mode!</p>
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
            <Button onClick={handleUpgrade} className="w-full" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Upgrade to Premium
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
