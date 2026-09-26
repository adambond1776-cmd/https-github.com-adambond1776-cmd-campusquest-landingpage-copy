'use server';

import { revalidatePath } from 'next/cache';
import { FOUNDING_OFFERS } from '@/lib/launch-offers';
import { localBasicGrantAllowed, localBasicWindow } from '@/lib/basic/entitlement';
import { isProductionRuntime } from '@/lib/runtime';
import { sessionPrivileges } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type LocalBasicResult = { ok: true; message: string } | { ok: false; message: string };

const ACCESS_TABLE = 'cq_basic_access';
const REFUSED = 'Local Basic testing is unavailable.';

/**
 * Grants the signed-in account a temporary Founding Basic window.
 * Production refuses before any database call. The user id and the end date
 * come from the server, never from the form.
 */
export async function grantLocalBasicAccess(formData: FormData): Promise<LocalBasicResult> {
  const allowed = await localGrantSession();
  if (!allowed.ok) return allowed;

  const now = new Date();
  const window = localBasicWindow(now, FOUNDING_OFFERS.student.days);
  const earlyAccess = formData.get('early_access') === 'on';
  const { error } = await allowed.admin.from(ACCESS_TABLE).upsert(
    {
      user_id: allowed.userId,
      starts_at: window.startsAt,
      ends_at: window.endsAt,
      early_access: earlyAccess,
    },
    { onConflict: 'user_id' }
  );
  if (error) return { ok: false, message: tableMessage(error.code) };
  revalidatePath('/settings');
  revalidatePath('/activities');
  revalidatePath('/saved');
  return {
    ok: true,
    message: earlyAccess
      ? 'Local Founding Basic access is active, including Early Access.'
      : 'Local Founding Basic access is active.',
  };
}

/** Removes only the signed-in account's local access row. */
export async function revokeLocalBasicAccess(): Promise<LocalBasicResult> {
  const allowed = await localGrantSession();
  if (!allowed.ok) return allowed;
  const { error } = await allowed.admin.from(ACCESS_TABLE).delete().eq('user_id', allowed.userId);
  if (error) return { ok: false, message: tableMessage(error.code) };
  revalidatePath('/settings');
  revalidatePath('/activities');
  revalidatePath('/saved');
  return { ok: true, message: 'Local Founding Basic access was removed.' };
}

async function localGrantSession(): Promise<
  | { ok: false; message: string }
  | { ok: true; userId: string; admin: NonNullable<ReturnType<typeof createAdminClient>> }
> {
  if (!localBasicGrantAllowed(isProductionRuntime())) return { ok: false, message: REFUSED };
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') return { ok: false, message: 'Sign in before granting local Basic access.' };
  if (!session.privileges.verified) {
    return { ok: false, message: 'Verify your campus email before granting local Basic access.' };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, message: 'Local database access is not configured.' };
  return { ok: true, userId: session.userId, admin };
}

function tableMessage(code: string | undefined): string {
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') {
    return 'The Basic access table is not installed yet.';
  }
  return 'Local Basic access could not be updated.';
}
