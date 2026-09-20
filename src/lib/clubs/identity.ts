import { createClient } from '@/lib/supabase/server';
import { needsCampusEmailVerification } from '@/lib/email-verification';
import { ageStore } from '@/lib/age-store';
import { allows } from '@/lib/age';
import { ClubError } from './model';

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
  if (error || !user?.email) throw new ClubError('Sign in before using club tools.');
  if (!user.email_confirmed_at || needsCampusEmailVerification(user.user_metadata)) throw new ClubError('Verify your email before using club tools.');
  const record = await ageStore().get(user.email);
  if (!allows(record, capability === 'join' ? 'contribute' : 'billing').allowed) throw new ClubError('Your age or guardian-consent record does not allow this action.');
  // A user-editable role is ONLY a signup hint. Approval and ownership are DB facts.
  const actor = { id: user.id, email: user.email, organization: user.user_metadata?.role === 'organization',
    reviewer: (process.env.CQ_CLUB_REVIEWER_IDS ?? '').split(',').map(x => x.trim()).filter(Boolean).includes(user.id) };
  if (capability === 'review' && !actor.reviewer) throw new ClubError('Reviewer access is required.');
  return actor;
}
