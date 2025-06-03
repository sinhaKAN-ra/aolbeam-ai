import { Suspense } from 'react';
import SubscriptionCallbackClient from './SubscriptionCallbackClient';

export default function SubscriptionCallbackPage() {
  return (
    <Suspense fallback={<div>Loading subscription status...</div>}>
      <SubscriptionCallbackClient />
    </Suspense>
  );
}
