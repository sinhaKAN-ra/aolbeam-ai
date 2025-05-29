import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface InteractionLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  limit: number;
  isLoggedIn: boolean;
}

export function InteractionLimitModal({
  open,
  onOpenChange,
  remaining,
  limit,
  isLoggedIn,
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
          <DialogTitle>Interaction Limit Reached</DialogTitle>
          <DialogDescription className="pt-2">
            {!isLoggedIn ? (
              <p>Please log in to access more interactions.</p>
            ) : (
              <p>
                You've used {limit - remaining} out of {limit} free interactions today. 
                Upgrade to a premium plan for unlimited access.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {!isLoggedIn ? (
            <Button onClick={handleLogin} className="w-full">
              Log In / Sign Up
            </Button>
          ) : (
            <Button onClick={handleUpgrade} className="w-full">
              Upgrade Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
