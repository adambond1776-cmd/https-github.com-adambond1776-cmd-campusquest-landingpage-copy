import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import { ageStore } from '@/lib/age-store';
import { getReportStore } from '@/lib/activities/report-store';
import { hashReporter } from '@/lib/activities/reports';
import { getDemandStore, hashEmail } from '@/lib/gm/demand';
import { getStore } from '@/lib/gm/store';
import { purgeOnDemand } from '@/lib/gm/retention-job';
import { sendOperatorAlert } from '@/lib/alerts';

/**
 * Deletes everything one account left behind.
 *
 * The terms say deletion is self-service and permanent, so this has to actually
 * find every table rather than the one people remember. Today that is the
 * Genius Mining record, directory corrections, campus interest, the age and
 * guardian record, and the Supabase auth user.
 *
 * Two things deliberately survive, both of which are described in the privacy
 * policy before anyone signs up:
 *
 *   - The de-identified corpus record, which holds the shape of an answer set
 *     and none of its words, carries no name or email, and cannot be traced
 *     back. It is what makes the instrument improvable.
 *   - Directory listings themselves. A student reporting that a club is dead
 *     does not own the fact that the club is dead.
 *
 * Order matters. The Genius Mining purge runs first and is allowed to refuse:
 * if de-identification fails, deleting the rest and leaving the identified
 * answers behind would be the worst of both outcomes.
 */

export type DeletionStep = { table: string; detail: string };

export type DeletionResult =
  | { ok: true; steps: DeletionStep[] }
  | { ok: false; message: string; steps: DeletionStep[] };

export async function deleteAccount(options: {
  email: string;
  userId: string | null;
}): Promise<DeletionResult> {
  const email = options.email.trim().toLowerCase();
  const steps: DeletionStep[] = [];

  // 1. Genius Mining, through the retention job's purge so the corpus copy is
  //    made under the same rules the scheduled job uses.
  try {
    const store = getStore();
    const record = options.userId ? await store.findByUserId(options.userId) : null;

    if (!record) {
      steps.push({ table: 'genius_mining', detail: 'Nothing on file.' });
    } else {
      const outcome = await purgeOnDemand(record);

      if (outcome.action === 'purge_blocked') {
        return {
          ok: false,
          steps,
          message:
            'We could not complete the deletion safely, so we have stopped and changed nothing. Someone has been alerted and will finish it by hand today.',
        };
      }

      await store.remove(record.participant_code);
      steps.push({ table: 'genius_mining', detail: outcome.detail });
    }
  } catch (error) {
    await alertFailure(email, 'genius_mining', error);
    return {
      ok: false,
      steps,
      message:
        'We could not complete the deletion safely, so we have stopped. Someone has been alerted and will finish it by hand today.',
    };
  }

  // 2. Everything else. These are independent, and a failure in one should not
  //    strand the others — anything that fails is reported for manual cleanup.
  const failures: string[] = [];

  await attempt('activity_reports', () => getReportStore().forget(hashReporter(email)), steps, failures);
  await attempt('campus_interest', () => getDemandStore().forget(hashEmail(email)), steps, failures);
  await attempt('age_record', () => ageStore().forget(email), steps, failures);
  await attempt('auth_user', () => deleteAuthUser(options.userId), steps, failures);

  if (failures.length > 0) {
    await sendOperatorAlert({
      severity: 'action_required',
      subject: 'An account deletion did not finish cleanly',
      body: [
        `Account: ${email}`,
        `Left behind: ${failures.join(', ')}`,
        '',
        'The student was told their account is gone. Finish these by hand.',
      ].join('\n'),
    });
  }

  return { ok: true, steps };
}

async function attempt(
  table: string,
  run: () => Promise<void>,
  steps: DeletionStep[],
  failures: string[]
): Promise<void> {
  try {
    await run();
    steps.push({ table, detail: 'Deleted.' });
  } catch (error) {
    failures.push(table);
    steps.push({ table, detail: `Failed: ${(error as Error).message}` });
  }
}

async function deleteAuthUser(userId: string | null): Promise<void> {
  if (!userId) return;

  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return;

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

async function alertFailure(email: string, table: string, error: unknown): Promise<void> {
  await sendOperatorAlert({
    severity: 'critical',
    subject: 'An account deletion failed and was stopped',
    body: [
      `Account: ${email}`,
      `Stopped at: ${table}`,
      `Error: ${(error as Error).message}`,
      '',
      'Nothing was deleted. The student was told to expect it done today.',
    ].join('\n'),
  });
}
