'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  useEffect(() => {
    console.error('Auth Error Page: Error details:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Authentication Error
          </h1>
          <p className="text-muted-foreground mb-8">
            {error || 'An unexpected error occurred during authentication.'}
          </p>
          <div className="space-y-4">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Return to Home
            </Button>
            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 