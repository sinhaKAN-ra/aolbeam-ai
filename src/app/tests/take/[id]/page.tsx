'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import TestAttemptPage from '@/components/tests/TestAttemptPage';


const TakeTestPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="py-16">
        <div className="border border-gray-200 rounded-lg p-6">
          <TestAttemptPage testSeriesId={params.id} />
        </div>
      </div>
    </div>
  );
};

export default TakeTestPage;
