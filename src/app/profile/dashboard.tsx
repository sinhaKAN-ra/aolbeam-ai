// src/app/profile/dashboard.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// Auth and Data
import { useAuth } from '@/contexts/AuthContext';
import supabaseClient from '@/lib/supabase/client';
import type { Subscription, UsageMetrics, PlanLimit, Payment } from '@/services/subscriptionService';
import { getUserUsageMetrics, getSubscriptionPlan, getPaymentHistory } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart2,
  BookOpen,
  CheckCircle,
  Clock,
  CreditCard,
  Sparkles,
  Zap,
  UserCircle
} from 'lucide-react';

// Types for user profile and stats
interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  total_questions?: number;
  correct_answers?: number;
  average_time?: number;
  accuracy?: number;
  is_subscribed?: boolean;
  subscription_plan?: string | null;
  last_active?: string | null; // Added last_active field
}

interface Stats {
  totalQuestions: number;
  correctAnswers: number;
  averageTime: number;
  accuracy: number;
  topics: Array<{ name: string; count: number }>;
  lastActive: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanLimit | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [hasOneTimePayment, setHasOneTimePayment] = useState(false); // New state for one-time payments
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/profile');
        return;
      }
      
      fetchProfileAndStats();
    }
  }, [user, authLoading, router]);

  const fetchProfileAndStats = useCallback(async () => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }
    
    setIsLoading(true);
    try {
      // First try to get the user's profile
      const { data, error } = await supabaseClient.from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Handle profile data
      if (error) {
        console.error('Error getting profile:', error);
        // Set a default profile if one doesn't exist
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_subscribed: false,
          subscription_plan: null
        });
      } else {
        setProfile(data as UserProfile);
      }

      // Fetch real stats from user_profiles
      const fetchedStats: Stats = {
        totalQuestions: data?.total_questions || 0,
        correctAnswers: data?.correct_answers || 0,
        averageTime: data?.average_time || 0,
        accuracy: data?.accuracy || 0,
        topics: [], // Will fetch real topics below
        lastActive: data?.last_active ? formatDistanceToNow(new Date(data.last_active), { addSuffix: true }) : 'N/A',
      };

      // Fetch topic-wise performance from user_interactions
      const { data: interactionData, error: interactionError } = await supabaseClient
        .from('user_interactions')
        .select('interaction_type, count')
        .eq('user_id', user.id)
        .order('count', { ascending: false });

      if (interactionError) {
        console.error('Error fetching interaction data:', interactionError);
      } else if (interactionData) {
        fetchedStats.topics = interactionData.map(item => ({ name: item.interaction_type, count: item.count }));
      }

      setStats(fetchedStats);

      // Now fetch the subscription data and usage metrics
      await fetchSubscriptionAndUsage();
    } catch (error) {
      console.error('Error fetching profile and stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const fetchSubscriptionAndUsage = async () => {
    if (!user) {
      return;
    }
    
    // Get subscription data
    setIsSubscriptionLoading(true);
    setIsUsageLoading(true);
    setUsageError(null);
    
    try {
      // Get subscription and plan info from supabase directly
      const { data: subData, error: subError } = await supabaseClient.from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subError) {
        console.error('Error fetching subscription:', subError);
        // Do not return here, continue to fetch payment history
      }
      
      setSubscription(subData as unknown as Subscription);
      console.log('Dashboard: fetchSubscriptionAndUsage: subscription data', subData);

      // Fetch payment history to check for one-time payments
      try {
        const payments: Payment[] = await getPaymentHistory();
        const oneTimeSuccess = payments.some(
          (p) => p.subscription_id === null && p.status?.toLowerCase() === 'success'
        );
        setHasOneTimePayment(oneTimeSuccess);
        console.log('Dashboard: fetchSubscriptionAndUsage: payment history', payments);
        console.log('Dashboard: fetchSubscriptionAndUsage: hasOneTimePayment calculated as', oneTimeSuccess);
      } catch (paymentsErr) {
        console.error('Dashboard: Error loading payment history:', paymentsErr);
      }

      // Get usage metrics
      try {
        const metrics = await getUserUsageMetrics();
        setUsageMetrics(metrics);
      } catch (usageError) {
        setUsageError('Failed to load usage metrics');
        console.error('Dashboard: Error fetching usage metrics:', usageError);
      } finally {
        setIsUsageLoading(false);
      }
      
      // Get current plan details
      if (subData?.plan_id) {
        const plan = await getSubscriptionPlan(subData.plan_id);
        setCurrentPlan(plan);
      }
      
      setIsSubscriptionLoading(false);
    } catch (error) {
      console.error('Error fetching subscription and usage:', error);
      setIsSubscriptionLoading(false);
      setIsUsageLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
        <UserCircle className="h-12 w-12 text-muted-foreground mb-4"/>
        <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
        <Button onClick={() => router.push('/login?redirect=/profile')}>Login / Sign Up</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <h2 className="text-xl font-semibold">Welcome back, {profile.full_name || 'User'}!</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfileAndStats}>
            <Zap className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/profile/subscriptions">
            <Button size="sm">
              <CreditCard className="mr-2 h-4 w-4" />
              {profile.is_subscribed ? 'Manage Subscription' : 'Upgrade'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Subscription notice (for free users) */}
      {!profile.is_subscribed && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upgrade to Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">Get unlimited access to all features and premium content.</p>
              </div>
            </div>
            <Link href="/pricing">
              <Button>View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2">
            {isLoading ? (
              <div className="flex flex-col space-y-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalQuestions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total questions answered
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col space-y-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.correctAnswers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total correct answers
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col space-y-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.accuracy !== undefined ? `${stats.accuracy.toFixed(2)}%` : 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  Overall accuracy rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time / Question</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col space-y-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.averageTime !== undefined ? `${stats.averageTime.toFixed(2)}s` : 'N/A'}</div>
                <p className="text-xs text-muted-foreground">
                  Average time spent per question
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastActive || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last active time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent progress */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Topics</CardTitle>
            <CardDescription>Your most practiced areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats && stats.topics && stats.topics.length > 0 ? (
                stats.topics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="truncate text-sm font-medium">
                        {topic.name}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {topic.count} questions
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No topics practiced yet</div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Practice More Topics
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Your current plan and usage</CardDescription>
          </CardHeader>
          <CardContent>
            {isSubscriptionLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-40 bg-gray-200 rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Plan</span>
                  <Badge variant={subscription ? "default" : (hasOneTimePayment ? "secondary" : "outline")}>
                    {subscription?.plan_id || (hasOneTimePayment ? 'One-Time Purchase' : 'Free')}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">✨ AI Interactions</span>
                    <span className="text-sm">
                      {!profile ? '15 total' : 
                       !profile.is_subscribed ? '100 / day' :
                       subscription?.plan_id === 'weekly' ? '100 / day' :
                       subscription?.plan_id === 'monthly' ? '500 / day' :
                       subscription?.plan_id === 'quarterly' ? '1,500 / day' : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">🔮 Smart Suggestions</span>
                    <span className="text-sm">
                      {profile?.is_subscribed ? 'Unlimited' : 'Basic only'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">⚡ Genius Mode</span>
                    <span className="text-sm">
                      {profile?.is_subscribed ? 'Full access' : 'Locked'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Link href="/profile/subscriptions" className="w-full">
              <Button variant={subscription ? "outline" : (hasOneTimePayment ? "outline" : "default")} className="w-full">
                {profile?.is_subscribed ? 'Manage Subscription' : 'Upgrade Now'}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
