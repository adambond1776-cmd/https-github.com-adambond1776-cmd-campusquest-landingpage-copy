'use server';

import { revalidatePath } from 'next/cache';
import { canUseAccountFeatures } from '@/lib/account/authorization';
import { loadAccountForSessionUser } from '@/lib/account/profile';
import { isCanonicalRecordId } from '@/lib/activities/canonical';
import { getActivityStore } from '@/lib/activities/store';
import { loadOwnBasicEntitlement } from '@/lib/basic/store';
import { isSavedKind, parseSavedReminder, saveDecision, savedMutationAllowed } from '@/lib/basic/saved';
import { createClient } from '@/lib/supabase/server';

export type BasicActionResult = { ok: true } | { ok: false; message: string };

const SAVED_TABLE = 'cq_saved_items';
const UNAVAILABLE = 'Saving is not available until the Basic tables are installed.';

export async function setSavedItem(input: {
  kind: string;
  targetId: string;
  saved: boolean;
}): Promise<BasicActionResult> {
  if (!isSavedKind(input.kind) || !isCanonicalRecordId(input.targetId)) {
    return { ok: false, message: 'That listing is not available to save.' };
  }
  const session = await requireSaver();
  if (!session.ok) return session;
  if (!input.saved) {
    const removed = await session.supabase
      .from(SAVED_TABLE)
      .delete()
      .eq('user_id', session.userId)
      .eq('kind', input.kind)
      .eq('target_id', input.targetId);
    if (removed.error) return { ok: false, message: writeMessage(removed.error.code) };
    revalidatePath('/activities');
    revalidatePath('/saved');
    return { ok: true };
  }
  if (!savedMutationAllowed('insert', session.entitlement.active)) {
    return saveDecision({
      signedIn: true,
      verified: true,
      active: false,
      activity: null,
      kind: input.kind,
    });
  }

  const activity = await getActivityStore().get(input.targetId);
  const decision = saveDecision({
    signedIn: true,
    verified: true,
    active: true,
    activity,
    kind: input.kind,
  });
  if (!decision.ok) return decision;

  const write = await session.supabase.from(SAVED_TABLE).upsert(
    {
      user_id: session.userId,
      kind: input.kind,
      target_id: input.targetId,
      reminder: 'off',
    },
    { onConflict: 'user_id,kind,target_id', ignoreDuplicates: true }
  );
  if (write.error) return { ok: false, message: writeMessage(write.error.code) };
  revalidatePath('/activities');
  revalidatePath('/saved');
  return { ok: true };
}

export async function setSavedEventReminder(input: {
  targetId: string;
  reminder: string;
}): Promise<BasicActionResult> {
  const reminder = parseSavedReminder(input.reminder);
  if (!reminder || !isCanonicalRecordId(input.targetId)) {
    return { ok: false, message: 'Choose off or email for this saved event.' };
  }
  const session = await requireSaver();
  if (!session.ok) return session;
  if (!savedMutationAllowed('update', session.entitlement.active)) {
    return {
      ok: false,
      message: 'Saving listings inside CampusQuest is part of Founding Basic. Browsing stays free.',
    };
  }

  const { data, error } = await session.supabase
    .from(SAVED_TABLE)
    .update({ reminder })
    .eq('user_id', session.userId)
    .eq('kind', 'event')
    .eq('target_id', input.targetId)
    .select('target_id');
  if (error) return { ok: false, message: writeMessage(error.code) };
  if (!data || data.length === 0) {
    return { ok: false, message: 'Save the event before choosing a reminder preference.' };
  }
  revalidatePath('/saved');
  return { ok: true };
}

async function requireSaver(): Promise<
  | { ok: false; message: string }
  | {
      ok: true;
      userId: string;
      supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
      entitlement: Awaited<ReturnType<typeof loadOwnBasicEntitlement>>;
    }
> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: 'Accounts are not connected in this environment.' };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    return { ok: false, message: 'Sign in to save listings inside CampusQuest.' };
  }
  const profile = await loadAccountForSessionUser(supabase, data.user.id);
  if (!canUseAccountFeatures(profile)) {
    return { ok: false, message: 'Verify your campus email before saving.' };
  }
  const entitlement = await loadOwnBasicEntitlement();
  if (!entitlement.known) return { ok: false, message: UNAVAILABLE };
  return { ok: true, userId: data.user.id, supabase, entitlement };
}

function writeMessage(code: string | undefined): string {
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return UNAVAILABLE;
  return 'That save could not be updated. Please try again.';
}
