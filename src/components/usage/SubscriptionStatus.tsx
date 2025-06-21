import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Zap, ZapOff } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionStatus } from '@/hooks/useFeatureAccess';

interface PlanDetails {
  name: string;
  features: string[];
  limits: {
    chat: number;
    test_creation: number;
  };
  price: string;
  isPopular?: boolean;
}

const PLANS: Record<string, PlanDetails> = {
  free: {
    name: 'Free',
    features: ['Basic access to features', 'Limited usage'],
    limits: {
      chat: 15,
      test_creation: 5,
    },
    price: '$0',
  },
  weekly: {
    name: 'Weekly',
    features: ['Higher limits', 'Priority support'],
    limits: {
      chat: 50,
      test_creation: 10,
    },
    price: '$4.99',
  },
  monthly: {
    name: 'Monthly',
    features: ['Even higher limits', 'Priority support', 'Advanced features'],
    limits: {
      chat: 100,
      test_creation: 20,
    },
    price: '$14.99',
    isPopular: true,
  },
  quarterly: {
    name: 'Quarterly',
    features: ['Highest limits', 'Priority support', 'All features'],
    limits: {
      chat: 200,
      test_creation: 30,
    },
    price: '$39.99',
  },
};

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  isNearLimit?: boolean;
  isLimitReached?: boolean;
}

const UsageMeter: React.FC<UsageMeterProps> = ({
  label,
  used,
  limit,
  isNearLimit = false,
  isLimitReached = false,
}) => {
  const percentage = Math.min(Math.round((used / limit) * 100), 100);
  const remaining = Math.max(0, limit - used);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit} ({remaining} remaining)
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={`h-2 ${
          isLimitReached ? 'bg-destructive/20' : 
          isNearLimit ? 'bg-amber-100' : 'bg-gray-100'
        }`}
      >
        <div 
          className={`h-full ${
            isLimitReached ? 'bg-destructive' : 
            isNearLimit ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </Progress>
      {isLimitReached && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          You've reached your limit
        </p>
      )}
      {isNearLimit && !isLimitReached && (
        <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          You're almost out of {label.toLowerCase()}
        </p>
      )}
    </div>
  );
};

interface SubscriptionStatusProps {
  className?: string;
  detailedView?: boolean;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  className = '', 
  detailedView = false 
}) => {
  const { plan, isLoading, error, usage } = useSubscriptionStatus();
  
  // Get plan details from PLANS constant or use the plan from the hook
  const planId = plan?.id || 'free';
  const planDetails = PLANS[planId as keyof typeof PLANS] || PLANS.free;
  
  // Get usage data from the plan with defaults
  const chatUsage = {
    used: usage?.chat_interactions_today || 0,
    limit: usage?.chat_limit || 15,
    remaining: usage?.remaining_chats || 15,
    percentage: usage ? Math.round((usage.chat_interactions_today / (usage.chat_limit || 1)) * 100) : 0
  };
  
  const testUsage = {
    used: usage?.tests_created || 0,
    limit: usage?.test_creation_limit || 5,
    remaining: usage?.remaining_tests || 5,
    percentage: usage ? Math.round((usage.tests_created / (usage.test_creation_limit || 1)) * 100) : 0
  };
  
  const isNearChatLimit = chatUsage.percentage >= 80 && chatUsage.percentage < 100;
  const isChatLimitReached = chatUsage.percentage >= 100;
  const isNearTestLimit = testUsage.percentage >= 80 && testUsage.percentage < 100;
  const isTestLimitReached = testUsage.percentage >= 100;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>Failed to load subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || 'Please try again later'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render plan features section
  const renderPlanFeatures = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Plan Features</h4>
      <ul className="space-y-2">
        {planDetails.features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  // Render upgrade prompt when limits are reached or nearly reached
  const renderUpgradePrompt = () => {
    if (!isNearChatLimit && !isNearTestLimit && !isChatLimitReached && !isTestLimitReached) {
      return null;
    }
    
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              {isChatLimitReached || isTestLimitReached 
                ? 'You\'ve reached your limit!' 
                : 'You\'re almost out!'}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {isChatLimitReached || isTestLimitReached
                ? 'Upgrade your plan to continue using all features.'
                : 'Consider upgrading to a higher plan for more capacity.'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300"
              asChild
            >
              <Link href="/pricing">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render action buttons for detailed view
  const renderActionButtons = () => (
    <div className="flex flex-col space-y-2">
      <Button 
        asChild 
        variant={(!plan || plan.id === 'free') ? 'default' : 'outline'}
      >
        <Link href="/pricing">
          {(!plan || plan.id === 'free') ? 'Upgrade Plan' : 'Change Plan'}
        </Link>
      </Button>
      {plan && plan.id !== 'free' && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/account/subscriptions" className="text-sm">
            Manage Subscription
          </Link>
        </Button>
      )}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>Failed to load subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'Please try again later'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Main content
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Your Plan</CardTitle>
            <CardDescription>
              {plan?.name || 'Free'} Plan
              {(!plan || plan.id === 'free') && ' (Trial)'}
            </CardDescription>
          </div>
          <Badge variant={!plan || plan.id === 'free' ? 'outline' : 'default'}>
            {!plan || plan.id === 'free' ? 'Free Tier' : 'Active'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`space-y-6 ${!detailedView ? 'pb-6' : ''}`}>
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Usage this period</h4>
          
          <UsageMeter
            label="Chat Messages"
            used={chatUsage.used}
            limit={chatUsage.limit}
            isNearLimit={isNearChatLimit}
            isLimitReached={isChatLimitReached}
          />

          <UsageMeter
            label="Test Creations"
            used={testUsage.used}
            limit={testUsage.limit}
            isNearLimit={isNearTestLimit}
            isLimitReached={isTestLimitReached}
          />
          
          {plan?.updated_at && (
            <p className="text-xs text-muted-foreground text-right">
              Last updated: {new Date(plan.updated_at).toLocaleString()}
            </p>
          )}
        </div>

        {detailedView ? (
          <>
            {renderPlanFeatures()}
            {renderUpgradePrompt()}
            {renderActionButtons()}
          </>
        ) : (
          // Show a simplified upgrade prompt in compact view
          (isNearChatLimit || isNearTestLimit || isChatLimitReached || isTestLimitReached) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {isChatLimitReached || isTestLimitReached 
                    ? 'You\'ve reached your limit. ' 
                    : 'You\'re almost out! '}
                  <Link href="/pricing" className="font-medium underline">
                    {isChatLimitReached || isTestLimitReached ? 'Upgrade now' : 'Upgrade'}
                  </Link>
                </p>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
