'use client';

import React from 'react';
import TestSeriesList from '@/components/tests/TestSeriesList';
import { AuthGuard } from '@/components/auth/AuthGuard';

const TestsPage: React.FC = () => {
  return (
    <div className="container mx-auto max-w-screen-lg">
      <div className="py-4">
        <TestSeriesList />
      </div>
    </div>
  );
};

export default function Tests() {
  return (
    <AuthGuard>
      <TestsPage />
    </AuthGuard>
  );
}
