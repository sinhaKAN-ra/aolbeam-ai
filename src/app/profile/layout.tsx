import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Profile - AOLBEAM',
  description: 'Review your learning progress, track statistics, and manage your account on AOLBEAM.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
