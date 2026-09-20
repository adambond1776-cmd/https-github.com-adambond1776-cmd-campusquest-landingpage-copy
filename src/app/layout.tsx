import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { siteUrl } from '@/lib/site';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

const title = 'CampusQuest | Discover More of College';
const description =
  'CampusQuest is a personalized discovery layer for college. Students find clubs, events, and opportunities that fit their interests. Organizations get discovered by interested students. Piloting in Rhode Island.';

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CampusQuest',
    url: '/',
    title,
    description:
      'Students discover more. Organizations get discovered. CampusQuest connects you to clubs, events, and opportunities that fit your interests.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CampusQuest — discover more of college. Piloting in Rhode Island.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description:
      'Students discover more. Organizations get discovered. CampusQuest connects you to clubs, events, and opportunities that fit your interests.',
    images: ['/og-image.png'],
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#060e26',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
