import { signedInUser } from '@/lib/session';
import { redirectIfCampusEmailUnverified, requireGeniusMiningAccess } from '@/lib/gate';
import { loadCurrentRecord } from '@/lib/gm/load';
import { resolveEntitlement } from '@hiddengeniuslabs/genius-mining';
import WelcomeView, { type GeniusMiningAccess } from './welcome-view';

/**
 * Whether to offer the instrument, and in what terms.
 *
 * Age is checked before plan. Telling a 17-year-old to upgrade to reach
 * something they are not allowed to reach at any price would be a worse thing
 * to do than saying nothing.
 */
async function geniusMiningAccess(): Promise<GeniusMiningAccess> {
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return { state: 'hidden' };

  const record = await loadCurrentRecord();
  if (
    record &&
    resolveEntitlement({
      subscription: record.subscription,
      coverage: record.coverage,
      grant: record.admin_grant,
    }).geniusMining
  ) {
    return { state: 'ready' };
  }

  return { state: 'upgrade' };
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The old SPA passed `{ email, isNew }` through router location state. Only
  // the "you just signed up" flag survives as a search param; the email comes
  // from the session so it cannot be spoofed through the URL.
  const params = await searchParams;
  const flag = Array.isArray(params.new) ? params.new[0] : params.new;
  const user = await signedInUser();
  await redirectIfCampusEmailUnverified();

  return (
    <WelcomeView
      isNew={flag === '1'}
      initialUser={user}
      geniusMining={await geniusMiningAccess()}
    />
  );
}
