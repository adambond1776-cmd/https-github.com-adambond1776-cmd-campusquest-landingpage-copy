import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import { createEmailChallengeStore } from '@/lib/email-verification-store';
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
 * The Auth user is a required step. If it is not deleted, the result is not
 * success, even when other rows were removed. A missing service-role key fails
 * before any row is touched.
 *
 * Genius Mining is attempted first and reported on its own. If that cleanup
 * cannot finish safely, the sign-in is left in place and authUserDeleted stays
 * false. That failure must not be described as a completed account deletion.
 *
 * The de-identified corpus record and directory listings are still kept, as
 * the privacy policy describes.
 */

export type DeletionStep = {
  table: string;
  required: boolean;
  status: 'deleted' | 'empty' | 'failed' | 'blocked';
  detail: string;
};

export type DeletionResult = {
  ok: boolean;
  authUserDeleted: boolean;
  message: string;
  steps: DeletionStep[];
};

export async function deleteAccount(options: {
  email: string;
  userId: string | null;
  /** Tests inject this. Production resolves it from the server environment. */
  admin?: SupabaseClient | null;
}): Promise<DeletionResult> {
  const email = options.email.trim().toLowerCase();
  const admin = options.admin === undefined ? serviceRoleClient() : options.admin;
  if (!admin) {
    return {
      ok: false,
      authUserDeleted: false,
      message:
        'Account deletion is unavailable because the server database key is not configured. Nothing was deleted.',
      steps: [
        {
          table: 'auth_user',
          required: true,
          status: 'failed',
          detail: 'SUPABASE_SERVICE_ROLE_KEY is not configured.',
        },
      ],
    };
  }

  const steps: DeletionStep[] = [];

  try {
    const store = getStore();
    const record = options.userId ? await store.findByUserId(options.userId) : null;

    if (!record) {
      steps.push({
        table: 'genius_mining',
        required: true,
        status: 'empty',
        detail: 'Nothing on file.',
      });
    } else {
      const outcome = await purgeOnDemand(record);
      if (outcome.action === 'purge_blocked') {
        steps.push({
          table: 'genius_mining',
          required: true,
          status: 'blocked',
          detail: outcome.detail,
        });
        return {
          ok: false,
          authUserDeleted: false,
          steps,
          message:
            'Your sign-in was not deleted. Genius Mining cleanup could not finish safely, so the account was left unchanged.',
        };
      }
      await store.remove(record.participant_code);
      steps.push({
        table: 'genius_mining',
        required: true,
        status: 'deleted',
        detail: outcome.detail,
      });
    }
  } catch (error) {
    steps.push({
      table: 'genius_mining',
      required: true,
      status: 'failed',
      detail: (error as Error).message,
    });
    await sendOperatorAlert({
      severity: 'critical',
      subject: 'An account deletion stopped before the login was removed',
      body: [
        `Account: ${email}`,
        'The sign-in was not deleted.',
        `Genius Mining error: ${(error as Error).message}`,
      ].join('\n'),
    });
    return {
      ok: false,
      authUserDeleted: false,
      steps,
      message:
        'Your sign-in was not deleted. Genius Mining cleanup could not finish safely, so the account was left unchanged.',
    };
  }

  await attempt(
    'activity_reports',
    true,
    () => getReportStore().forget(hashReporter(email)),
    steps
  );
  await attempt(
    'campus_interest',
    true,
    () => getDemandStore().forget(hashEmail(email)),
    steps
  );
  await attempt('age_record', true, () => ageStore().forget(email), steps);
  await attempt(
    'verification_challenges',
    true,
    () =>
      createEmailChallengeStore(admin).deleteForAccount(options.userId ?? '', email),
    steps
  );

  let authUserDeleted = false;
  if (!options.userId) {
    steps.push({
      table: 'auth_user',
      required: true,
      status: 'failed',
      detail: 'No auth user id was provided, so the login was not deleted.',
    });
  } else {
    try {
      const { error } = await admin.auth.admin.deleteUser(options.userId);
      if (error) throw new Error(error.message);
      authUserDeleted = true;
      steps.push({
        table: 'auth_user',
        required: true,
        status: 'deleted',
        detail: 'Deleted.',
      });
    } catch (error) {
      steps.push({
        table: 'auth_user',
        required: true,
        status: 'failed',
        detail: (error as Error).message,
      });
    }
  }

  const failed = steps.filter((step) => step.status === 'failed' || step.status === 'blocked');
  if (!authUserDeleted || failed.length > 0) {
    const failedTables = failed.map((step) => step.table).join(', ');
    await sendOperatorAlert({
      severity: 'action_required',
      subject: 'An account deletion did not finish',
      body: [
        `Account: ${email}`,
        `Sign-in deleted: ${authUserDeleted ? 'yes' : 'no'}`,
        `Failed steps: ${failedTables || 'none'}`,
        '',
        'Do not tell the student the account is gone unless the sign-in was deleted.',
      ].join('\n'),
    });
    return {
      ok: false,
      authUserDeleted,
      steps,
      message: authUserDeleted
        ? `Your sign-in was deleted, but some data could not be removed: ${failedTables}.`
        : 'Your sign-in could not be deleted, so this account is not closed.',
    };
  }

  return { ok: true, authUserDeleted: true, message: 'Account deleted.', steps };
}

function serviceRoleClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function attempt(
  table: string,
  required: boolean,
  run: () => Promise<void>,
  steps: DeletionStep[]
): Promise<void> {
  try {
    await run();
    steps.push({ table, required, status: 'deleted', detail: 'Deleted.' });
  } catch (error) {
    steps.push({
      table,
      required,
      status: 'failed',
      detail: (error as Error).message,
    });
  }
}
