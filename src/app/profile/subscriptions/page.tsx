'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

// Utility functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Auth and Data Services
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  getUserSubscription, 
  cancelSubscription,
  getSubscriptionPlan,
  getUserUsageMetrics,
  getPaymentHistory,
  changePlan,
  availablePlans
} from '@/services/subscriptionService';
import type { 
  Subscription, 
  PlanLimit, 
  UsageMetrics, 
  Payment
} from '@/services/subscriptionService';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Icons
import { 
  Loader2, AlertCircle, CheckCircle, Calendar, CreditCard, Clock, ArrowRight, ShieldCheck, XCircle,
  BarChart, RefreshCcw, PlusCircle, MinusCircle, Activity, Zap, Package, Award, CreditCard as CreditCardIcon,
  Download, ChevronUp, ChevronDown, DollarSign, PieChart, Users, Gauge
} from 'lucide-react';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Plan details state
  const [currentPlan, setCurrentPlan] = useState<PlanLimit | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  
  // Usage metrics state
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState(true);
  
  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [isPaymentHistoryLoading, setIsPaymentHistoryLoading] = useState(true);
  
  // Plan change state
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Check for payment success parameters in URL
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    subscriptionId?: string;
    orderId?: string;
  } | null>(null);
  const [hasOneTimePayment, setHasOneTimePayment] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login?redirect=/profile/subscriptions');
      return;
    }

    if (user) {
      fetchSubscription();
    }
  }, [user, isAuthLoading, router]);
  
  // Refresh data when needed
  const refreshData = () => {
    fetchSubscription();
  };

  const handleChangePlan = async (planId: string) => {
    if (isChangingPlan) return;
    
    setIsChangingPlan(true);
    setSelectedPlan(planId);
    
    try {
      const result = await changePlan(planId);
      
      if (result.success) {
        if (result.redirectUrl) {
          // Redirect to payment page
          window.location.href = result.redirectUrl;
        } else {
          // If no redirect, assume plan change was synchronous and refresh data
          toast({
            title: 'Success',
            description: 'Your plan has been updated successfully.',
            variant: 'default',
          });
          refreshData();
        }
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to change plan. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  const fetchSubscription = async () => {
    setIsLoading(true);
    setError(null);
    setIsPlanLoading(true);
    setIsUsageLoading(true);
    setIsPaymentHistoryLoading(true);
    
    try {
      // Fetch subscription data
      const sub = await getUserSubscription();
      setSubscription(sub);
      console.log('fetchSubscription: subscription data', sub);
      
      // Fetch plan details if subscription exists
      if (sub) {
        try {
          const plan = await getSubscriptionPlan(sub.plan_id);
          setCurrentPlan(plan);
        } catch (planErr) {
          console.error('Error loading plan details:', planErr);
        } finally {
          setIsPlanLoading(false);
        }

        // Fetch usage metrics
        try {
          const metrics = await getUserUsageMetrics();
          setUsageMetrics(metrics);
        } catch (metricsErr) {
          console.error('Error loading usage metrics:', metricsErr);
        } finally {
          setIsUsageLoading(false);
        }


      } else {
        // Reset all states if no subscription
        setCurrentPlan(null);
        setUsageMetrics(null);
        setIsPlanLoading(false);
        setIsUsageLoading(false);
      }
      
      // Fetch payment history (moved outside the if (sub) block)
      try {
        const payments = await getPaymentHistory();
        setPaymentHistory(payments);
        // Check for successful one-time payments
        const oneTimeSuccess = payments.some(
          (p) => p.subscription_id === null && p.status?.toLowerCase() === 'success'
        );
        setHasOneTimePayment(oneTimeSuccess);
        console.log('fetchSubscription: payment history', payments);
        console.log('fetchSubscription: hasOneTimePayment calculated as', oneTimeSuccess);
        console.log('fetchSubscription: final hasOneTimePayment state', hasOneTimePayment); // Note: This might log the old state due to setState async nature
      } catch (paymentsErr) {
        console.error('Error loading payment history:', paymentsErr);
      } finally {
        setIsPaymentHistoryLoading(false);
      }
      
      // Check for payment success parameters in URL
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const subscriptionId = urlParams.get('subscription_id');
        const orderId = urlParams.get('order_id');
        
        if (status === 'success' && subscriptionId) {
          setPaymentSuccess(true);
          setPaymentInfo({
            subscriptionId,
            orderId: orderId || undefined
          });
          
          // Show success toast
          toast({
            title: 'Subscription Activated',
            description: 'Your subscription has been successfully activated. Welcome to premium!',
            variant: 'default',
          });
          
          // Clear the URL parameters after processing
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription information. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load your subscription details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    setIsCancelling(true);
    setCancelError(null);
    setCancelSuccess(false);
    
    try {
      const result = await cancelSubscription(subscription.id);
      if (result.success) {
        setCancelSuccess(true);
        setSubscription({
          ...subscription,
          cancel_at_period_end: true
        });
        
        toast({
          title: 'Subscription Cancelled',
          description: 'Your subscription has been cancelled. You will continue to have access until the end of your current billing period.',
          variant: 'default',
        });
      } else {
        setCancelError(result.message || 'Failed to cancel subscription');
        toast({
          title: 'Error',
          description: result.message || 'Failed to cancel your subscription. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setCancelError('An unexpected error occurred. Please try again later.');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while cancelling your subscription. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPP');
  };
  
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'CANCELED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Canceled</Badge>;
      case 'PAST_DUE':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Past Due</Badge>;
      case 'PENDING':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${amount}`;
    } else {
      return `$${amount}`;
    }
  };
  
  const getInterval = (interval: string) => {
    switch (interval.toLowerCase()) {
      case 'month':
      case 'monthly':
        return 'month';
      case 'year':
      case 'yearly':
        return 'year';
      case 'week':
      case 'weekly':
        return 'week';
      default:
        return interval;
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container max-w-5xl py-6">
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AOLBEAM subscription plan and billing details.
          </p>
        </div>
        
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {paymentSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Payment Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your subscription has been activated successfully. Thank you for subscribing to AOLBEAM!
                  {paymentInfo?.orderId && (
                    <span className="block mt-1">Order ID: {paymentInfo.orderId}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {cancelSuccess && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Subscription Cancelled</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Your subscription has been cancelled. You will continue to have access until the end of your current billing period.
                </AlertDescription>
              </Alert>
            )}
            
            {cancelError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}
            
            {!subscription && !hasOneTimePayment ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Active Subscription</CardTitle>
                  <CardDescription>
                    You don't have an active subscription plan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-10 w-10 text-primary/80" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Upgrade to Premium</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get unlimited access to all premium features and enhance your learning experience.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/pricing">View Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Display one-time payment message if no active subscription but has one-time payment */}
                {!subscription && hasOneTimePayment && (
                  <Card>
                    <CardHeader>
                      <CardTitle>One-Time Purchase Confirmed</CardTitle>
                      <CardDescription>
                        Thank you for your one-time purchase! Your access to premium features is active.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Enjoy Your Features</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your one-time purchase grants you access to specific premium features.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Existing subscription details card */}
                {subscription && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {currentPlan?.name || (subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1))} Plan
                        </CardTitle>
                        <CardDescription>Current subscription details</CardDescription>
                      </div>
                      {getStatusBadge(subscription.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Status</p>
                          <div className="flex items-center space-x-2">
                            {subscription.status === 'ACTIVE' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <p className="text-sm">{subscription.status}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Payment Method</p>
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4" />
                            <p className="text-sm capitalize">{subscription.provider || 'Credit Card'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Billing Amount</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(subscription.amount || 0, subscription.currency || 'USD')} 
                            / {getInterval(subscription.interval || 'month')}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Started On</p>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <p className="text-sm">{formatDate(subscription.created_at)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatTimeAgo(subscription.created_at)}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Current Billing Period</h4>
                        <div className="flex items-center gap-x-2 text-sm">
                          <p>{formatDate(subscription.current_period_start)}</p>
                          <ArrowRight className="h-3.5 w-3.5" />
                          <p>{formatDate(subscription.current_period_end)}</p>
                        </div>
                        
                        {subscription.current_period_end && (
                          <p className="text-xs text-muted-foreground">
                            Next billing date: {formatDate(subscription.current_period_end)}
                          </p>
                        )}
                      </div>
                      
                      {subscription.cancel_at_period_end && (
                        <Alert className="bg-amber-50 border-amber-200">
                          <Clock className="h-4 w-4" />
                          <AlertTitle className="text-amber-800">Subscription Ending</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            Your subscription is set to cancel at the end of the current billing period. 
                            You will continue to have access until {formatDate(subscription.current_period_end)}.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                  {hasOneTimePayment && (
                    <CardContent>
                      <Separator className="my-4" />
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>You also have one or more one-time purchases. See Payment History for details.</span>
                      </div>
                    </CardContent>
                  )}
                  <CardFooter className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center border-t pt-6">
                    {!subscription.cancel_at_period_end && subscription.status === 'ACTIVE' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            Cancel Subscription
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your subscription will remain active until the end of the current billing period. 
                              After that, you will lose access to premium features.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancelSubscription}
                              disabled={isCancelling}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              {isCancelling ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Yes, Cancel'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    <Button asChild className="flex-1">
                      <Link href="/pricing">
                        {subscription.cancel_at_period_end ? 'Reactivate Subscription' : 'Manage Plan'}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
                )}
                
                {/* Usage metrics */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl">Usage Metrics</CardTitle>
                    <CardDescription>Your current subscription usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isUsageLoading ? (
                      <div className="flex justify-center items-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !usageMetrics ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">
                          No usage data available. Subscribe to a plan to see your usage metrics.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Questions Used</span>
                            <span className="text-sm font-medium">{usageMetrics.questionsUsed} / {currentPlan?.maxQuestions || 'Unlimited'}</span>
                          </div>
                          <Progress value={usageMetrics.percentageUsed} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {usageMetrics.percentageUsed}% of your plan used
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Problem generation - Usage</span>
                            <span className="text-sm font-medium">{usageMetrics.feature1Used} / {currentPlan?.maxFeature1 || 'Unlimited'}</span>
                          </div>
                          <Progress 
                            value={Math.min(100, (usageMetrics.feature1Used / (currentPlan?.maxFeature1 || 1)) * 100)} 
                            className="h-2" 
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Problem insight - Usage</span>
                            <span className="text-sm font-medium">{usageMetrics.feature2Used} / {currentPlan?.maxFeature2 || 'Unlimited'}</span>
                          </div>
                          <Progress 
                            value={Math.min(100, (usageMetrics.feature2Used / (currentPlan?.maxFeature2 || 1)) * 100)} 
                            className="h-2" 
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-md p-3">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {usageMetrics.daysRemaining} days remaining in current billing cycle
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Available Plans */}
                {/* <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl">Available Plans</CardTitle>
                    <CardDescription>Choose the right plan for your needs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      {availablePlans.map((plan) => (
                        <div 
                          key={plan.id} 
                          className={`border rounded-lg p-4 transition-all ${
                            currentPlan?.id === plan.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                {plan.name}
                                {plan.isFeatured && (
                                  <Badge className="ml-2">Popular</Badge>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="text-sm">
                                {plan.id === 'free' ? '15 total AI interactions' : 
                                 plan.id === 'basic' ? '25 total AI interactions' : 
                                 plan.id === 'weekly' ? '100 AI interactions/day' : 
                                 plan.id === 'monthly' ? '500 AI interactions/day' : 
                                 plan.id === 'quarterly' ? '1,500 AI interactions/day' : 
                                 'Unlimited interactions'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Gauge className="h-4 w-4 text-primary" />
                              <span className="text-sm">{plan.id === 'free' || plan.id === 'basic' ? 'Basic AI model' : 'Premium AI model'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              <span className="text-sm">{plan.id === 'free' || plan.id === 'basic' ? 'Standard support' : 'Priority support'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-primary" />
                              <span className="text-sm">{plan.id === 'free' || plan.id === 'basic' ? 'Basic insights' : 'Advanced analytics'}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-2">
                            {currentPlan?.id === plan.id ? (
                              <Button variant="outline" disabled>
                                Current Plan
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleChangePlan(plan.id)}
                                disabled={isChangingPlan || (currentPlan?.id === plan.id)}
                                variant={currentPlan?.id === plan.id ? "outline" : "default"}
                              >
                                {isChangingPlan && selectedPlan === plan.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : currentPlan?.id === plan.id ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Current Plan
                                  </>
                                ) : (
                                  <>
                                    <Zap className="mr-2 h-4 w-4" />
                                    {subscription ? 'Switch to this plan' : 'Select this plan'}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Payment History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Payment History</CardTitle>
                    <CardDescription>Recent transactions and billing history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isPaymentHistoryLoading ? (
                      <div className="flex justify-center items-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : paymentHistory.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">
                          No payment history available yet.
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md">
                        <div className="grid grid-cols-4 gap-4 p-4 font-medium border-b">
                          <div>Date</div>
                          <div>Amount</div>
                          <div>Status</div>
                          <div>Invoice</div>
                        </div>
                        {paymentHistory.map((payment) => (
                          <div key={payment.id} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0">
                            <div className="text-sm">{formatDate(payment.created_at)}</div>
                            <div className="text-sm">{formatCurrency(payment.amount, payment.currency)}</div>
                            <div>
                              {payment.status?.toLowerCase() === 'success' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Paid
                                </Badge>
                              ) : payment.status?.toLowerCase() === 'pending' ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                  Pending
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {payment.status}
                                </Badge>
                              )}
                              <span className="block text-xs text-muted-foreground mt-1">
                                {payment.subscription_id ? 'Subscription' : 'One-Time Purchase'}
                              </span>
                            </div>
                            <div>
                              {payment.invoice_url ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-1" />
                                    Invoice
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
