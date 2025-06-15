'use client';

import React from 'react';
import TestResultsPage from '@/components/tests/TestResultsPage';

interface TestResultsPageProps {
  params: {
    id: string;
  };
}

const ViewTestResultsPage: React.FC<TestResultsPageProps> = ({ params }) => {
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="py-4">
        <div className="border border-gray-200 rounded-lg p-2">
          <TestResultsPage attemptId={params.id} />
        </div>
      </div>
    </div>
  );
};

export default ViewTestResultsPage;
