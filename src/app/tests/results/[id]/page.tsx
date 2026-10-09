'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import TestResultsPage from '@/components/tests/TestResultsPage';


const ViewTestResultsPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;
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
