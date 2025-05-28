'use client';

import dynamicImport from 'next/dynamic';

const PaymentTestWrapper = dynamicImport(() => import('@/components/PaymentTestWrapper'), {
  ssr: false,
});

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function PaymentTestPage() {
  return <PaymentTestWrapper />;
} 