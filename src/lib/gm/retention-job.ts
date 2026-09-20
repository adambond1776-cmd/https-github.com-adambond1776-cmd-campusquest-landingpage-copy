import { createClient } from '@supabase/supabase-js';
import {
  DeidentificationError,
  corpusModeFor,
  deidentify,
  markPurged,
  markWarningSent,
  retentionActionDue,
  type CorpusMode,
} from '@hiddengeniuslabs/genius-mining';
import { sendOperatorAlert, sendRetentionWarning } from '@/lib/alerts';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';
import { getStore } from '@/lib/gm/store';
import type { GeniusMiningRecord } from '@/lib/gm/records';

export type JobOutcome = {
  participantCode: string;
  action: 'warn_7' | 'warn_25' | 'purged' | 'purge_blocked' | 'none';
  detail: string;
};

/**
 * The student's email, for the two warnings.
 *
 * Contact details deliberately do not live on the response row, so this reads
 * them from the account at the moment they are needed.
 */
async function resolveEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null;

  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;

  try {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) return null;
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Removes the identified data. Only ever called after the de-identified copy is
 * confirmed in the corpus.
 */
function purged(record: GeniusMiningRecord): GeniusMiningRecord {
  return {
    ...record,
    responses: {},
    profile: null,
    d1_resolution: null,
    retention: markPurged(record.retention),
  };
}

async function handlePurge(
  record: GeniusMiningRecord,
  corpusMode: CorpusMode
): Promise<JobOutcome> {
  const store = getStore();

  if (!record.profile || !record.d1_resolution) {
    // Nothing was ever analyzed, so there is no corpus copy to preserve and
    // nothing to lose by deleting the partial answers.
    await store.save(purged(record));
    return {
      participantCode: record.participant_code,
      action: 'purged',
      detail: 'Purged an unanalyzed record. No corpus copy was possible.',
    };
  }

  // De-identify first, always. If this step fails the purge must not proceed:
  // losing the corpus copy is worse than a late deletion.
  let corpusRecord;
  try {
    corpusRecord = deidentify({
      responses: {
        ...record.responses,
        participant_code: record.participant_code,
        instrument_version: record.instrument_version,
      } as Parameters<typeof deidentify>[0]['responses'],
      primaryWorkingWord: record.profile.primary_working_word,
      confidence: record.profile.confidence,
      d1Resolution: record.d1_resolution,
      thinSpots: record.profile.thin_spots ?? [],
      mode: corpusMode,
    });
  } catch (error) {
    const isDeidentificationProblem = error instanceof DeidentificationError;
    await sendOperatorAlert({
      severity: 'critical',
      subject: 'Purge blocked — de-identification failed',
      participantCode: record.participant_code,
      body: [
        'The de-identify step failed, so the purge did NOT run and the identified data is still',
        'in place. This needs a human. Losing the corpus copy is worse than a late deletion.',
        '',
        `Error${isDeidentificationProblem ? ' (DeidentificationError)' : ''}: ${(error as Error).message}`,
      ].join('\n'),
    });

    return {
      participantCode: record.participant_code,
      action: 'purge_blocked',
      detail: `De-identification failed: ${(error as Error).message}`,
    };
  }

  try {
    await store.writeCorpusRecord(corpusRecord);
  } catch (error) {
    await sendOperatorAlert({
      severity: 'critical',
      subject: 'Purge blocked — corpus write failed',
      participantCode: record.participant_code,
      body: [
        'The corpus record was built but could not be written, so the purge did NOT run.',
        '',
        (error as Error).message,
      ].join('\n'),
    });

    return {
      participantCode: record.participant_code,
      action: 'purge_blocked',
      detail: `Corpus write failed: ${(error as Error).message}`,
    };
  }

  await store.save(purged(record));

  return {
    participantCode: record.participant_code,
    action: 'purged',
    detail: `De-identified to ${corpusRecord.corpus_id} (${corpusMode}), then purged.`,
  };
}

/**
 * Runs the same de-identify-then-purge on one record, on demand.
 *
 * Account deletion goes through here rather than deleting the row directly, so
 * the corpus copy the privacy policy promises is made under exactly the rules
 * the scheduled job uses. If de-identification fails, this refuses and alerts
 * for the same reason the job does: a late deletion is recoverable, a lost or
 * re-identifiable corpus record is not.
 */
export async function purgeOnDemand(record: GeniusMiningRecord): Promise<JobOutcome> {
  const store = getStore();
  return handlePurge(record, corpusModeFor((await store.list()).length));
}

/**
 * One pass of the retention job.
 *
 * Idempotent: each record yields at most one action per pass, and the timestamp
 * for that action is stamped before the next pass looks at it again.
 */
export async function runRetentionJob(now: Date = new Date()): Promise<JobOutcome[]> {
  const store = getStore();
  const records = await store.withRetentionClockRunning();
  const outcomes: JobOutcome[] = [];

  // How much of an answer set the corpus may keep depends on how many students
  // it would be hiding among. Resolved once per pass rather than per record so
  // one job run cannot write two records under different rules.
  const corpusMode = corpusModeFor((await store.list()).length);

  for (const record of records) {
    const due = retentionActionDue(record.retention, now);

    if (due.action === 'none') {
      continue;
    }

    if (due.action === 'warn') {
      const email = await resolveEmail(record.user_id);
      const delivery = email
        ? await sendRetentionWarning({ to: email, day: due.day, daysUntilPurge: due.daysUntilPurge })
        : { delivered: false, detail: 'No email on file for this account.' };

      // The timestamp is stamped either way. A warning that could not be
      // delivered must not wedge the job into resending it every hour; the
      // undelivered case is logged and alerted instead.
      await store.save({
        ...record,
        retention: markWarningSent(record.retention, due.day, now),
      });

      if (!delivery.delivered) {
        await sendOperatorAlert({
          severity: 'warning',
          subject: `Day-${due.day} retention warning was not delivered`,
          participantCode: record.participant_code,
          body: `The warning could not be sent, and the purge is still scheduled.\n\n${delivery.detail}`,
        });
      }

      outcomes.push({
        participantCode: record.participant_code,
        action: due.day === 7 ? 'warn_7' : 'warn_25',
        detail: delivery.detail,
      });
      continue;
    }

    outcomes.push(await handlePurge(record, corpusMode));
  }

  return outcomes;
}
