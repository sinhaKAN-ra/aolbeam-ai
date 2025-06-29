
"use client"

import { use } from 'react';
import TestSeriesForm from '@/components/tests/TestSeriesForm';

interface EditTestSeriesPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTestSeriesPage({ params }: EditTestSeriesPageProps) {
  const { id } = use(params);
  return (
    <div className="max-w-screen-lg mx-auto">
      <div className="py-16">
        <div className="border border-gray-200 rounded-lg p-6">
          <TestSeriesForm testSeriesId={id} onSuccess={() => {}} />
        </div>
      </div>
    </div>
  );
};
