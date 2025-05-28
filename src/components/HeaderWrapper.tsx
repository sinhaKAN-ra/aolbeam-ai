'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';

export default function HeaderWrapper() {
  const router = useRouter();
  const { refreshSession } = useAuth();

  return <Header />;
}
