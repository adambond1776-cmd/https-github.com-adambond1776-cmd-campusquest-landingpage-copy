'use server';

import { isAllowlistedAdminEmail } from '@/lib/account/admin-access';
import { adminEmails } from '@/lib/env';
import { sessionPrivileges } from '@/lib/session';

/** Whether the signed-in session is on GM_ADMIN_EMAILS. The client cannot decide this itself. */
export async function adminNavState(): Promise<{ admin: boolean }> {
  const session = await sessionPrivileges();
  if (session.state !== 'signed-in') return { admin: false };
  return { admin: isAllowlistedAdminEmail(session.email, adminEmails()) };
}
