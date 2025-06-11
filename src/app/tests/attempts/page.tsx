import React, { Suspense } from 'react';
import TestAttemptsClient from './TestAttemptsClient';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-40">
        <span>Loading your test attempts…</span>
      </div>
    }>
      <TestAttemptsClient />
    </Suspense>
  );
}