'use client';

import React from 'react';
import TestSeriesForm from '@/components/tests/TestSeriesForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

const CreateTestSeriesPage: React.FC = () => {
  return (
    <div className="container mx-auto max-w-screen-lg">
      <div className="py-4">
        <div className="border rounded-lg p-6 bg-white">
          <TestSeriesForm />
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
