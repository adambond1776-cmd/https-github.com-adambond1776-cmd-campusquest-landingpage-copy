import { isAllowlistedAdminEmail } from '@/lib/account/admin-access';
import { adminEmails } from '@/lib/env';
import { signedInEmail } from '@/lib/session';
import { redirectIfCampusEmailUnverified } from '@/lib/gate';
import { safeReturnPath } from '@/lib/return-path';
import { redirect } from 'next/navigation';
import Onboarding from './onboarding-view';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const finishFlag = Array.isArray(params.finish) ? params.finish[0] : params.finish;
  const verifyFlag = Array.isArray(params.verify) ? params.verify[0] : params.verify;
  const nextFlag = Array.isArray(params.next) ? params.next[0] : params.next;
  const finishing = finishFlag === '1';
  const verifying = verifyFlag === '1';
  const returnTo = safeReturnPath(nextFlag);

  const sessionEmail = finishing || verifying ? await signedInEmail() : null;
  if (finishing) {
    if (isAllowlistedAdminEmail(sessionEmail, adminEmails())) redirect('/admin');
    await redirectIfCampusEmailUnverified();
  }

  if (verifying && !sessionEmail) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  return (
    <Onboarding
      finishing={finishing}
      verifying={verifying}
      sessionEmail={sessionEmail}
      returnTo={returnTo}
    />
  );
}
