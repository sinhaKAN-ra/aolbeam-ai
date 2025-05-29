import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useInteractionLimit } from '@/hooks/useInteractionLimit';
import { InteractionType } from '@/types/interaction';
import { Loader2 } from 'lucide-react';

interface InteractionUsageProps {
  type: InteractionType;
  title: string;
  description: string;
}

export function InteractionUsage({ type, title, description }: InteractionUsageProps) {
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
    isUnlimited: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { checkInteractionLimit } = useInteractionLimit();

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

  const getProgressValue = () => {
    if (!usage) return 0;
    if (usage.isUnlimited) return 100;
    return Math.max(0, Math.min(100, ((usage.limit - usage.remaining) / usage.limit) * 100));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : usage ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {usage.isUnlimited ? (
                  'Unlimited Access'
                ) : (
                  `${usage.limit - usage.remaining} / ${usage.limit} used today`
                )}
              </span>
              {!usage.isUnlimited && (
                <span className="font-medium">
                  {usage.remaining} remaining
                </span>
              )}
            </div>
            <Progress value={getProgressValue()} className="h-2" />
            {!usage.isUnlimited && usage.remaining === 0 && (
              <p className="text-xs text-destructive mt-1">
                You've reached your daily limit. Upgrade for unlimited access.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load usage data</p>
        )}
      </CardContent>
    </Card>
  );
}
