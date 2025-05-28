'use client';

import dynamic from 'next/dynamic';

// Import the actual component that uses useSearchParams dynamically
const PaymentSuccessPageContent = dynamic(() => import('@/components/PaymentSuccessPageContent'), { ssr: false });

// We will move the original content of this file into a new component file.
// This page file will now only render the dynamically imported component.
export default function PaymentSuccessPage() {
  return <PaymentSuccessPageContent />;
}

// Note: The original content of this file will be moved to a new file, e.g., src/components/PaymentSuccessPageContent.tsx
