'use client';

import React from 'react';
import TestAttemptPage from '@/components/tests/TestAttemptPage';

interface TakeTestPageProps {
  params: {
    id: string;
  };
}

const TakeTestPage: React.FC<TakeTestPageProps> = ({ params }) => {
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
