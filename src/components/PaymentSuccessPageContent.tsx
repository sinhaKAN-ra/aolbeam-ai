"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr'; // Correct for client-side usage
import { SupabaseClient } from '@supabase/supabase-js'; // Correct for SupabaseClient type
import { Database } from '@/lib/supabase/database.types';

// Define types for table rows and inserts for clarity, using Supabase generated types
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];
type PaymentOrder = Database['public']['Tables']['payment_orders']['Row'];
type PaymentOrderInsert = Database['public']['Tables']['payment_orders']['Insert'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

export default function PaymentSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [displayOrderId, setDisplayOrderId] = useState<string | null>(null);
  const [displayPlanId, setDisplayPlanId] = useState<string | null>(null);
  const [displaySubscriptionEndDate, setDisplaySubscriptionEndDate] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Explicitly type supabase client
  const supabase: SupabaseClient<Database> = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  const handlePaymentSuccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!user) {
      setError('User not authenticated. Please log in.');
      setIsLoading(false);
      return;
    }

    if (!searchParams) {
      setError('Missing payment details from URL.');
      setIsLoading(false);
      return;
    }

    const orderId = searchParams.get('order_id') || searchParams.get('id') || searchParams.get('token');
    const paymentStatusParam = searchParams.get('status') || 'SUCCESS';
    const paymentProvider = searchParams.get('payment_method') || searchParams.get('provider') || 'cashfree';
    const amountStr = searchParams.get('amount');
    const currency = searchParams.get('currency') || 'INR';
    const planId = searchParams.get('plan_id');

    // Set display values early for UI
    setDisplayOrderId(orderId);
    setDisplayPlanId(planId);

    if (!orderId || !planId) {
      setError('Invalid payment details: Missing order ID or plan ID. Please contact support.');
      setIsLoading(false);
      return;
    }

    console.log('Payment success parameters:', {
      orderId, paymentStatusParam, paymentProvider, amountStr, currency, planId, userId: user.id
    });

    let paymentOrderRecord: PaymentOrder | null = null;
    let subscriptionRecord: Subscription | null = null;

    try {
      // 1. Process Payment Order
      const { data: existingPo, error: poCheckError } = await supabase
        .from('payment_orders')
        .select('*') // Select all fields for the record
        .eq('provider_order_id', orderId)
        .eq('payment_provider', paymentProvider)
        .maybeSingle();

      if (poCheckError) {
        console.error('Error checking existing payment order:', poCheckError);
        throw new Error('Failed to verify payment order status.');
      }

      // If payment is already fully processed (has status SUCCESS and a subscription_id)
      if (existingPo?.status === 'SUCCESS' && existingPo?.subscription_id) {
        console.log('Payment already fully processed:', existingPo);
        setSuccessMessage('Your payment has already been processed successfully.');
        paymentOrderRecord = existingPo;
        // Attempt to fetch the linked subscription to display its details
        if (existingPo.subscription_id) {
          const { data: linkedSub, error: linkedSubError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', existingPo.subscription_id)
            .single();
          if (linkedSubError) console.error('Error fetching linked subscription:', linkedSubError);
          if (linkedSub) {
            subscriptionRecord = linkedSub;
            setDisplaySubscriptionEndDate(new Date(linkedSub.current_period_end!).toLocaleDateString());
          }
        }
        setIsLoading(false);
        return;
      }
      
      paymentOrderRecord = existingPo; // Could be null or an incomplete order

      // Upsert payment order if it doesn't exist or isn't marked SUCCESS
      if (!paymentOrderRecord || paymentOrderRecord.status !== 'SUCCESS') {
        const parsedAmount = amountStr ? parseFloat(amountStr) : null;
        const paymentOrderData: PaymentOrderInsert = {
          user_id: user.id,
          plan_id: planId,
          provider_order_id: orderId,
          payment_provider: paymentProvider,
          amount: parsedAmount,
          currency: currency,
          status: paymentStatusParam, // Use the status from params
          metadata: {
            raw_params: Object.fromEntries(searchParams.entries()),
            processed_at: new Date().toISOString(),
          },
          // subscription_id will be linked later
        };

        const { data: upsertedPo, error: poUpsertError } = await supabase
          .from('payment_orders')
          .upsert(paymentOrderData, { onConflict: 'provider_order_id,payment_provider', ignoreDuplicates: false })
          .select()
          .single();

        if (poUpsertError) {
           if (poUpsertError.code === '23505') { 
              console.warn('Payment order upsert conflict (23505), fetching existing:', poUpsertError);
              const { data: conflictPo, error: conflictPoError } = await supabase
                  .from('payment_orders')
                  .select('*')
                  .eq('provider_order_id', orderId)
                  .eq('payment_provider', paymentProvider)
                  .single(); // Expect single as it's a conflict on unique keys
              if (conflictPoError) {
                  console.error('Failed to fetch conflicting payment order after 23505:', conflictPoError);
                  throw new Error('Failed to fetch conflicting payment order.');
              }
              if (!conflictPo) {
                console.error('Conflicting payment order not found after 23505 error.');
                throw new Error('Conflicting payment order not found after 23505.');
              }
              paymentOrderRecord = conflictPo;
          } else {
              console.error('Error upserting payment order:', poUpsertError);
              throw new Error('Failed to save payment information.');
          }
        } else {
          paymentOrderRecord = upsertedPo;
        }
      }
      if (!paymentOrderRecord) {
        console.error('Payment order record is null after processing attempts.');
        throw new Error('Payment order record could not be established.');
      }
      console.log('Payment order processed:', paymentOrderRecord);

      // 2. Process Subscription
      const now = new Date();
      let periodEnd = new Date(now);
      let interval: 'weekly' | 'monthly' | 'quarterly' = 'monthly'; // Default

      if (planId.includes('weekly')) {
        periodEnd.setDate(now.getDate() + 7);
        interval = 'weekly';
      } else if (planId.includes('monthly')) {
        periodEnd.setMonth(now.getMonth() + 1);
        interval = 'monthly';
      } else if (planId.includes('quarterly')) {
        periodEnd.setMonth(now.getMonth() + 3);
        interval = 'quarterly';
      } else {
        console.warn(`Could not determine interval from planId: ${planId}, defaulting to monthly.`);
        periodEnd.setMonth(now.getMonth() + 1);
      }

      // Prepare base data for subscription insert/update
      // Explicitly type to satisfy Omit and ensure all fields are covered
      const subscriptionBaseData: Omit<SubscriptionInsert, 'created_at' | 'id'> & { updated_at: string } = {
        user_id: user.id,
        plan_id: planId,
        provider: paymentProvider,
        provider_subscription_id: orderId, 
        status: 'ACTIVE',
        amount: paymentOrderRecord?.amount, // Use amount from confirmed payment order
        currency: paymentOrderRecord?.currency, // Use currency from confirmed payment order
        interval: interval,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        metadata: {
          payment_order_id: paymentOrderRecord?.id, // Use the ID from the processed paymentOrderRecord
          raw_params: Object.fromEntries(searchParams.entries()),
        },
        updated_at: new Date().toISOString(),
      };

      // Check for existing subscriptions
      const { data: existingSubscriptions, error: subCheckError } = await supabase
        .from('subscriptions')
        .select('*')
        // Corrected OR logic: one condition for provider match, another for user+plan match
        .or(`and(provider.eq.${paymentProvider},provider_subscription_id.eq.${orderId}),and(user_id.eq.${user.id},plan_id.eq.${planId})`)
        .order('created_at', { ascending: false });

      if (subCheckError) {
        console.error('Error checking existing subscriptions:', subCheckError);
        throw new Error('Failed to check for existing subscriptions.');
      }

      // Type sub parameter in find callbacks
      const exactSubscriptionMatch = existingSubscriptions?.find(
        (sub: Subscription) => sub.provider === paymentProvider && sub.provider_subscription_id === orderId
      );
      const userPlanSubscriptionMatch = existingSubscriptions?.find(
        (sub: Subscription) => sub.user_id === user.id && sub.plan_id === planId
      );

      const preferredExistingSubscription = exactSubscriptionMatch || userPlanSubscriptionMatch;

      if (preferredExistingSubscription) {
        console.log('Updating existing subscription:', preferredExistingSubscription.id);
        // Ensure all fields from subscriptionBaseData are included in the update
        const subscriptionUpdateData: SubscriptionUpdate = { ...subscriptionBaseData };
        const { data: updatedSub, error: subUpdateError } = await supabase
          .from('subscriptions')
          .update(subscriptionUpdateData)
          .eq('id', preferredExistingSubscription.id)
          .select()
          .single();
        if (subUpdateError) {
          console.error('Error updating subscription:', subUpdateError);
          throw new Error('Failed to update subscription.');
        }
        subscriptionRecord = updatedSub;
      } else {
        console.log('Creating new subscription.');
        // Add created_at for new subscriptions
        const subscriptionInsertData: SubscriptionInsert = {
           ...subscriptionBaseData,
            created_at: new Date().toISOString(), // Add created_at for new record
        }; 
        const { data: newSub, error: subInsertError } = await supabase
          .from('subscriptions')
          .insert(subscriptionInsertData)
          .select()
          .single();

        if (subInsertError) {
          // Handle unique constraint violation (23505) during insert (race condition)
          if (subInsertError.code === '23505') {
            console.warn('Subscription insert conflict (23505), attempting to fetch and update existing:', subInsertError);
            // Re-fetch based on the same criteria to find the conflicting record
            const { data: conflictSubs, error: conflictSubFetchError } = await supabase
              .from('subscriptions')
              .select('*')
              .or(`and(provider.eq.${paymentProvider},provider_subscription_id.eq.${orderId}),and(user_id.eq.${user.id},plan_id.eq.${planId})`)
              .order('created_at', { ascending: false }) // Get the latest if multiple somehow exist
              .limit(1); // Expecting one due to unique constraints
            
            if (conflictSubFetchError) {
              console.error('Failed to fetch conflicting subscription after 23505:', conflictSubFetchError);
              throw new Error('Failed to fetch conflicting subscription after 23505.');
            }
            const conflictingSubToUpdate = conflictSubs?.[0];

            if (conflictingSubToUpdate) {
              console.log('Found conflicting subscription to update:', conflictingSubToUpdate.id);
              const subscriptionUpdateDataRetry: SubscriptionUpdate = { ...subscriptionBaseData };
              const { data: updatedConflictSub, error: conflictSubUpdateError } = await supabase
                .from('subscriptions')
                .update(subscriptionUpdateDataRetry)
                .eq('id', conflictingSubToUpdate.id)
                .select()
                .single();
              if (conflictSubUpdateError) {
                  console.error('Failed to update the conflicting subscription after 23505:', conflictSubUpdateError);
                  throw new Error('Failed to update the conflicting subscription.');
              }
              subscriptionRecord = updatedConflictSub;
            } else {
              // This case should ideally not be reached if 23505 occurred due to these keys
              console.error('Subscription conflict (23505) but could not find the conflicting record to update.');
              throw new Error('Subscription conflict (23505) but could not find the conflicting record to update.');
            }
          } else {
            console.error('Error inserting subscription:', subInsertError);
            throw new Error('Failed to create subscription.');
          }
        } else {
          subscriptionRecord = newSub;
        }
      }
      if (!subscriptionRecord) {
        console.error('Subscription record is null after processing attempts.');
        throw new Error('Subscription record could not be established.');
      }
      console.log('Subscription processed:', subscriptionRecord);
      setDisplaySubscriptionEndDate(new Date(subscriptionRecord.current_period_end!).toLocaleDateString());

      // 3. Link Payment Order to Subscription (if not already linked)
      if (paymentOrderRecord && paymentOrderRecord.id && subscriptionRecord && subscriptionRecord.id && paymentOrderRecord.subscription_id !== subscriptionRecord.id) {
        const { error: linkError } = await supabase
          .from('payment_orders')
          .update({ subscription_id: subscriptionRecord.id, updated_at: new Date().toISOString() })
          .eq('id', paymentOrderRecord.id);
        if (linkError) {
          console.error('Error linking payment order to subscription:', linkError);
          // Non-critical, log and continue, but this indicates a data consistency issue to monitor
        } else {
          console.log(`Linked payment order ${paymentOrderRecord.id} to subscription ${subscriptionRecord.id}`);
        }
      }

      // 4. Update User Profile
      const userProfileData: UserProfileUpdate = {
        // id: user.id, // Not needed for update if using .eq('id', user.id)
        is_subscribed: true,
        subscription_plan_id: planId,
        subscription_status: 'ACTIVE', // Assuming subscription is active upon successful payment
        subscription_started_at: subscriptionRecord?.current_period_start || now.toISOString(),
        subscription_ends_at: subscriptionRecord?.current_period_end || periodEnd.toISOString(),
        last_payment_at: now.toISOString(),
        updated_at: now.toISOString(), // For the user_profile record itself
      };

      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update(userProfileData)
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('Error updating user profile:', profileUpdateError);
        // Non-critical for the payment flow itself, but needs monitoring/logging
      } else {
        console.log('User profile updated successfully for user:', user.id);
      }

      setSuccessMessage('Your payment was successful and your subscription is active!');
      setIsLoading(false);

    } catch (err: any) {
      console.error('Full error in handlePaymentSuccess:', err, err.stack);
      setError(err.message || 'An unexpected error occurred during payment processing.');
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams, router, supabase]); // Dependencies for useCallback. Supabase client is stable.

  useEffect(() => {
    // This effect runs when auth state changes or when handlePaymentSuccess function reference changes
    // (it shouldn't change often due to useCallback unless its dependencies like 'user' change)
    if (!isAuthLoading && user) { // Ensure user is loaded before calling
        handlePaymentSuccess();
    } else if (!isAuthLoading && !user) {
        setError('User not authenticated. Please log in.');
        setIsLoading(false);
    }
    // handlePaymentSuccess is memoized, so it's safe to include.
    // isAuthLoading and user are primary triggers.
  }, [isAuthLoading, user, handlePaymentSuccess]); 

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Processing your payment, please wait...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-xl font-semibold text-center">Payment Processing Error</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-4">
            <Button onClick={() => router.push('/pricing')} className="w-full">Return to Pricing</Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-xl font-semibold text-center">Payment Successful!</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {successMessage || 'Thank you for your purchase. Your subscription is now active.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pt-4">
          <div className="text-center space-y-1 p-4 bg-gray-50 rounded-md w-full">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Order ID:</span> {displayOrderId || 'N/A'}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Plan:</span> {displayPlanId || 'N/A'}
            </p>
             {displaySubscriptionEndDate && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Subscription active until:</span> {displaySubscriptionEndDate}
              </p>
            )}
          </div>
          <Button onClick={() => router.push('/profile/subscriptions')} className="w-full">View Subscription</Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">Go Home</Button>
        </CardContent>
      </Card>
    </div>
  );
}

   