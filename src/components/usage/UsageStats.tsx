import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UsageStatsProps {
  feature: 'chat' | 'test_creation';
  used: number;
  limit: number;
  isLoading?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

const featureConfig = {
  chat: {
    title: 'Chat Messages',
    description: 'Daily message limit',
    icon: <Zap className="h-4 w-4 text-blue-500" />,
  },
  test_creation: {
    title: 'Test Creations',
    description: 'Daily test creation limit',
    icon: <Zap className="h-4 w-4 text-purple-500" />,
  },
};

export const UsageStats = ({
  feature,
  used,
  limit,
  isLoading = false,
  onUpgrade,
  className = '',
}: UsageStatsProps) => {
  const { title, description, icon } = featureConfig[feature];
  const percentage = Math.min(Math.round((used / limit) * 100), 100);
  const remaining = Math.max(0, limit - used);
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isLimitReached = percentage >= 100;

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Loading usage...</CardTitle>
            <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200"></div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={0} className="h-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">
              {description}
            </CardDescription>
          </div>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {used} of {limit} used
            </span>
            <span className="font-medium">{remaining} remaining</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
      {(isNearLimit || isLimitReached) && (
        <CardFooter className="flex flex-col items-start space-y-2 pt-0">
          <div className={`flex w-full items-center rounded-md p-3 text-sm ${
            isLimitReached ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {isLimitReached ? (
              <AlertCircle className="mr-2 h-4 w-4" />
            ) : (
              <Info className="mr-2 h-4 w-4" />
            )}
            <span>
              {isLimitReached 
                ? `You've reached your ${title.toLowerCase()} limit.`
                : `You're almost out of ${title.toLowerCase()}!`}
            </span>
          </div>
          <Button 
            variant={isLimitReached ? 'destructive' : 'outline'}
            size="sm" 
            className="w-full"
            onClick={onUpgrade}
            asChild
          >
            <Link href="/pricing">
              {isLimitReached ? 'Upgrade Now' : 'Upgrade for More'}
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export const UsageStatsWithTooltip = (props: UsageStatsProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <UsageStats {...props} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">
          {props.used} of {props.limit} {props.feature === 'chat' ? 'messages' : 'tests'} used today. 
          {props.limit - props.used > 0 
            ? ` ${props.limit - props.used} remaining.` 
            : ' You\'ve reached your limit.'}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default UsageStats;
