'use client';

import Link from 'next/link';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { FEATURES } from '@/config/features';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function SubscriptionStatus({ className = '', detailedView = false }: { className?: string; detailedView?: boolean }) {
  const { usage, isLoading, error, refetchUsage } = useFeatureAccess();
  return <Card className={className}><CardHeader><CardTitle>Usage today</CardTitle><CardDescription>Your tutor activity</CardDescription></CardHeader><CardContent className="space-y-4">
    {isLoading ? <Skeleton className="h-12 w-full" /> : error ? <div role="alert"><p className="text-sm text-muted-foreground">Could not load usage.</p><Button variant="link" onClick={() => refetchUsage()}>Try again</Button></div> : usage ? <>
      <div><div className="mb-2 flex justify-between text-sm"><span>Tutor messages</span><span>{usage.chat_interactions_today} / {usage.chat_limit}</span></div><Progress aria-label="Tutor message usage" value={usage.chat_limit > 0 ? Math.min(100, usage.chat_interactions_today / usage.chat_limit * 100) : 0} /></div>
      {(FEATURES.tests || FEATURES.testSeries) && <p className="text-sm">Tests created: {usage.tests_created} / {usage.test_creation_limit}</p>}
      {detailedView && <Button variant="outline" asChild><Link href="/profile">View learning activity</Link></Button>}
    </> : <p className="text-sm text-muted-foreground">Sign in to see your activity.</p>}
  </CardContent></Card>;
}
export default SubscriptionStatus;
