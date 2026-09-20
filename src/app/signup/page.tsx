import { signedInEmail } from '@/lib/session';
import { redirectIfCampusEmailUnverified } from '@/lib/gate';
import Onboarding from './onboarding-view';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const finishFlag = Array.isArray(params.finish) ? params.finish[0] : params.finish;
  const verifyFlag = Array.isArray(params.verify) ? params.verify[0] : params.verify;
  const finishing = finishFlag === '1';
  const verifying = verifyFlag === '1';

  if (finishing) {
    await redirectIfCampusEmailUnverified();
  }

  const needsSessionEmail = finishing || verifying;

  return (
    <Onboarding
      finishing={finishing}
      verifying={verifying}
      sessionEmail={needsSessionEmail ? await signedInEmail() : null}
    />
  );
}
