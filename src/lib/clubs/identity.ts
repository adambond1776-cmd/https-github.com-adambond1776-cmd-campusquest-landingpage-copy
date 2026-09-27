import { createClient } from '@/lib/supabase/server';
import { accountPrivileges } from '@/lib/account/authorization';
import { loadAccountForSessionUser } from '@/lib/account/profile';
import { ageStore } from '@/lib/age-store';
import { allows } from '@/lib/age';
import { ClubError } from './model';
import { isDemoAccountEmail } from '@/lib/account/demo-account';

export type ClubActor = { id: string; email: string; organization: boolean; reviewer: boolean };
export function assertClubTestMode() {
  if (process.env.CQ_CLUB_MODE !== 'test') throw new ClubError('Club tools are disabled. This build supports test mode only.');
}
export async function clubIdentity(capability: 'owner' | 'join' | 'review' = 'owner'): Promise<ClubActor> {
  assertClubTestMode();
  const db = await createClient();
  if (!db) throw new ClubError('Connect a separate test database to use club accounts.');
  const { data, error } = await db.auth.getUser();
  const user = data.user;
  if (error || !user?.id || !user.email) throw new ClubError('Sign in before using club tools.');
  if (isDemoAccountEmail(user.email)) throw new ClubError('Club tools are not available for this account.');
  const profile = await loadAccountForSessionUser(db, user.id);
  const privileges = accountPrivileges(profile, user.user_metadata ?? {});
  if (!privileges.verified) throw new ClubError('Verify your email before using club tools.');
  const record = await ageStore().get(user.email);
  if (!allows(record, capability === 'join' ? 'contribute' : 'billing').allowed) throw new ClubError('Your age or guardian-consent record does not allow this action.');
  const actor = {
    id: user.id,
    email: user.email,
    // profiles.role is not a club privilege. Ownership is the club row; review is the allowlist.
    organization: false,
    reviewer: (process.env.CQ_CLUB_REVIEWER_IDS ?? '').split(',').map(x => x.trim()).filter(Boolean).includes(user.id),
  };
  if (capability === 'review' && !actor.reviewer) throw new ClubError('Reviewer access is required.');
  return actor;
}
