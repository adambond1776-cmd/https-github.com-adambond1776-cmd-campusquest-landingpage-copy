'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

export default function LogoutButton({
  className,
  label = 'Log out',
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button type="button" onClick={run} disabled={busy} className={className}>
      {busy ? 'Signing out…' : label}
    </button>
  );
}
