import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useInteractionLimit } from '@/hooks/useInteractionLimit';
import { InteractionType } from '@/types/interaction';

interface InteractionLimitBannerProps {
  type: InteractionType;
  className?: string;
}

export function InteractionLimitBanner({ type, className = '' }: InteractionLimitBannerProps) {
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
    isUnlimited: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { checkInteractionLimit } = useInteractionLimit();
  const router = useRouter();

  useEffect(() => {
    async function fetchUsage() {
      try {
        setLoading(true);
        const result = await checkInteractionLimit(type);
        
        setUsage({
          remaining: result.remaining,
          limit: result.limit,
          isUnlimited: result.limit === -1 || result.remaining === -1
        });
      } catch (error) {
        console.error(`Error fetching ${type} usage:`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [type, checkInteractionLimit]);

  if (loading || !usage || usage.isUnlimited || usage.remaining > 2) {
    return null;
  }

  const getProgressValue = () => {
    return Math.max(0, Math.min(100, ((usage.limit - usage.remaining) / usage.limit) * 100));
  };

  const actionType = type === 'evaluate' ? 'evaluations' : 'insights';

  return (
    <Alert variant="warning" className={`mb-4 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Usage Limit Approaching</AlertTitle>
      <AlertDescription>
        <div className="mt-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Daily {actionType} usage</span>
            <span className="font-medium">
              {usage.remaining} of {usage.limit} remaining
            </span>
          </div>
          <Progress value={getProgressValue()} className="h-2 mb-3" />
          {usage.remaining === 0 ? (
            <div className="mt-2">
              <p className="text-sm mb-2">You've reached your daily limit for {actionType}.</p>
              <Button 
                onClick={() => router.push('/pricing')} 
                size="sm" 
                variant="outline"
                className="w-full sm:w-auto"
              >
                Upgrade for Unlimited Access
              </Button>
            </div>
          ) : (
            <p className="text-sm">
              You have {usage.remaining} {actionType} remaining today. 
              <Button 
                onClick={() => router.push('/pricing')} 
                variant="link" 
                className="p-0 h-auto font-normal"
              >
                Upgrade for unlimited access
              </Button>
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
