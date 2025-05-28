'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Import the content component with no SSR
const PaymentSuccessPageContent = dynamic(
  () => import('@/components/PaymentSuccessPageContent'),
  { ssr: false }
);

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading payment status...</p>
        </div>
      </div>
    }>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}

// Note: The original content of this file will be moved to a new file, e.g., src/components/PaymentSuccessPageContent.tsx
