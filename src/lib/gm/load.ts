import { currentIdentity } from '@/lib/gm/identity';
import { getStore } from '@/lib/gm/store';
import type { GeniusMiningRecord } from '@/lib/gm/records';

/**
 * The signed-in student's record, or null.
 *
 * Read-only: no row is created until the student has actually consented, so
 * loading a page never brings a record into existence.
 */
export async function loadCurrentRecord(): Promise<GeniusMiningRecord | null> {
  const identity = await currentIdentity();
  if (!identity) return null;
  return getStore().findByUserId(identity.userId);
}
