'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), {
  ssr: false,
});

export default function HeaderWrapper() {
  const router = useRouter();
  const { refreshSession } = useAuth();

  return <Header />;
}
