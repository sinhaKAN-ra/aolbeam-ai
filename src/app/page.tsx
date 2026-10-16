import type { Metadata } from 'next';
import PracticeWorkspace from '@/components/home/PracticeWorkspace';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/', type: 'website', siteName: 'Aolbeam AI', title: 'Aolbeam AI — practice questions and learn across subjects', description: SITE_DESCRIPTION, images: [{ url: '/assets/logo.png', alt: 'Aolbeam AI' }] },
};

export default function HomePage() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Aolbeam AI', url: SITE_URL, description: SITE_DESCRIPTION },
      { '@type': 'SoftwareApplication', name: 'Aolbeam AI', url: SITE_URL, applicationCategory: 'EducationalApplication', operatingSystem: 'Web browser', description: SITE_DESCRIPTION, featureList: ['AI practice questions across subjects', 'Answer evaluation and feedback', 'AI tutor explanations', 'Personal learning paths with lessons and checkpoints'] },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
    <PracticeWorkspace />
  </>;
}
