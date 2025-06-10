'use client';

import React from 'react';
import TestSeriesForm from '@/components/tests/TestSeriesForm';

interface EditTestSeriesPageProps {
  params: {
    id: string;
  };
}

const EditTestSeriesPage: React.FC<EditTestSeriesPageProps> = ({ params }) => {
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="py-16">
        <div className="border border-gray-200 rounded-lg p-6">
          <TestSeriesForm testSeriesId={params.id} />
        </div>
      </div>
    </div>
  );
};

export default EditTestSeriesPage;
