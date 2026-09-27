import type { Metadata } from 'next';
import DemoLoginView from '@/app/demo-login/demo-login-view';

export const metadata: Metadata = {
  title: 'Demo sign in | CampusQuest',
  robots: { index: false, follow: false },
};

export default function DemoLoginPage() {
  return <DemoLoginView />;
}
