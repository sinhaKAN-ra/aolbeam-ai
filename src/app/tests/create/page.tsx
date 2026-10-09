'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import TestSeriesForm from '@/components/tests/TestSeriesForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

const CreateTestSeriesPage: React.FC = () => {
  const router = useRouter();
  return (
    <div className="container mx-auto max-w-screen-lg">
      <div className="py-4">
        <div className="border rounded-lg p-6 bg-white">
          <TestSeriesForm onSuccess={() => router.push("/tests")} />
        </div>
      </div>
    </div>
  );
};

export default function CreateTestSeries() {
  return (
    <AuthGuard>
      <CreateTestSeriesPage />
    </AuthGuard>
  );
}
