import { Suspense } from 'react';
import CheckoutPageClient from './CheckoutPageClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutPageClient />
    </Suspense>
  );
}
