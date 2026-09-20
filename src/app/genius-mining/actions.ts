'use server';

import { revalidatePath } from 'next/cache';
import {
  SECTION_IDS,
  applyStudentTiebreak,
  assembleProfile,
  canEditProfile,
  canRunAnalysis,
  needsStudentTiebreak,
  recordCall,
  recordEdit,
  resolveD1,
  runAnalysis,
  settleRun,
  transition,
  resolveEntitlement,
  type QuestionnaireResponses,
  type Verb,
} from '@hiddengeniuslabs/genius-mining';
import { sendOperatorAlert } from '@/lib/alerts';
import { defaultCampusId, supabaseConfigured } from '@/lib/env';
import { requireGeniusMiningAccess } from '@/lib/gate';
import { currentIdentity, ensureDevIdentity } from '@/lib/gm/identity';
import { CONSENT_COPY_VERSION, type GeniusMiningRecord } from '@/lib/gm/records';
import { getStore } from '@/lib/gm/store';
import { EngineUnavailableError, resolveEngine } from '@/lib/gm/transport';
import { validateSection } from '@/lib/gm/section-validation';
import { isProductionRuntime } from '@/lib/runtime';

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; errors?: Record<string, string> };

/**
 * Whether this student may use Genius Mining right now.
 *
 * Reads the resolved entitlement rather than the subscription, so a student
 * whose school bought them a seat is not told to go and subscribe.
 */
function entitledToGeniusMining(record: GeniusMiningRecord): boolean {
  return resolveEntitlement({
    subscription: record.subscription,
    coverage: record.coverage,
    grant: record.admin_grant,
  }).geniusMining;
}

async function requireRecord(): Promise<GeniusMiningRecord | { ok: false; message: string }> {
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return { ok: false, message: access.reason };

  let identity;
  if (supabaseConfigured()) {
    identity = await currentIdentity();
  } else if (isProductionRuntime()) {
    return { ok: false, message: 'Sign in to continue.' };
  } else {
    identity = await ensureDevIdentity();
  }
  if (!identity) return { ok: false, message: 'Sign in to continue.' };

  const store = getStore();
  const existing = await store.findByUserId(identity.userId);
  if (existing) return existing;

  return store.createFor(identity.userId, defaultCampusId());
}

function isDenied(
  value: GeniusMiningRecord | { ok: false; message: string }
): value is { ok: false; message: string } {
  return 'ok' in value && value.ok === false;
}

/** Starts a record or picks up the one already in progress. */
export async function startOrResume(): Promise<
  { participantCode: string } | { ok: false; message: string }
> {
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  return { participantCode: loaded.participant_code };
}

/**
 * Records consent. Only ever called from an affirmative action — there is no
 * pre-ticked box and no implicit acceptance — and stamps which version of the
 * copy the student actually agreed to.
 */
export async function acceptConsent(): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  if (record.consent) return { ok: true };

  await store.save({
    ...record,
    consent: { accepted_at: new Date().toISOString(), copy_version: CONSENT_COPY_VERSION },
  });

  revalidatePath('/genius-mining');
  return { ok: true };
}

function mergeResponses(
  record: GeniusMiningRecord,
  values: Partial<QuestionnaireResponses>
): Partial<QuestionnaireResponses> {
  return { ...record.responses, ...values };
}

function noteSitting(record: GeniusMiningRecord): GeniusMiningRecord['progress'] {
  const now = new Date().toISOString();
  const sittings = [...record.progress.sittings];

  if (sittings.length === 0) {
    sittings.push({ started_at: now, last_saved_at: now });
    return { ...record.progress, sittings };
  }

  const last = sittings[sittings.length - 1];
  const hoursSinceLastSave = (Date.parse(now) - Date.parse(last.last_saved_at)) / 3_600_000;

  // A gap of a few hours is a new sitting. The instrument is designed around two
  // of them and Adam wants each timestamped.
  if (hoursSinceLastSave > 3) {
    sittings.push({ started_at: now, last_saved_at: now });
  } else {
    sittings[sittings.length - 1] = { ...last, last_saved_at: now };
  }

  return { ...record.progress, sittings };
}

/**
 * Autosave. Writes whatever the student has typed without validating it.
 *
 * Continuous rather than on-submit: C3 is a long answer that students write on a
 * phone, and losing it to a backgrounded tab would lose the single heaviest input
 * in the instrument.
 */
export async function saveDraft(values: Partial<QuestionnaireResponses>): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  await store.save({
    ...record,
    responses: mergeResponses(record, values),
    progress: noteSitting(record),
  });

  return { ok: true };
}

/**
 * Submits a section and advances.
 *
 * Sequential only. A student who can see the eight working words while answering
 * A1 will write toward one, and the instrument stops working, so Section D is
 * never reachable before A through C are in.
 */
export async function submitSection(
  sectionId: string,
  values: Partial<QuestionnaireResponses>
): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  if (!SECTION_IDS.includes(sectionId)) {
    return { ok: false, message: `Unknown section ${sectionId}.` };
  }

  const expectedIndex = record.progress.completed_sections.length;
  const actualIndex = SECTION_IDS.indexOf(sectionId);
  if (actualIndex > expectedIndex) {
    return {
      ok: false,
      message: `Section ${SECTION_IDS[expectedIndex]} has to be finished first.`,
    };
  }

  const merged = mergeResponses(record, values);
  const validation = validateSection(sectionId, merged);
  if (!validation.ok) {
    return { ok: false, message: 'Some answers still need attention.', errors: validation.errors };
  }

  const completed = record.progress.completed_sections.includes(sectionId)
    ? record.progress.completed_sections
    : [...record.progress.completed_sections, sectionId];

  const nextSection = SECTION_IDS[Math.min(completed.length, SECTION_IDS.length - 1)];

  // D1 is computed the moment Section B is in, but it is not shown until D.
  const d1Resolution =
    completed.includes('B') && merged.B?.length
      ? resolveD1(merged.B, merged.C1 ?? [])
      : record.d1_resolution;

  await store.save({
    ...record,
    responses: merged,
    d1_resolution: d1Resolution ?? null,
    progress: { ...noteSitting(record), completed_sections: completed, current_section: nextSection },
  });

  revalidatePath('/genius-mining/questionnaire');
  return { ok: true };
}

/**
 * Records the student's pick when the tally tied and C1 could not break it.
 *
 * The pick is stored beside the resolution, never on top of it: `computed_verb`
 * stays null and `resolution` stays UNRESOLVED so the record keeps saying the
 * tally was thin instead of dressing a coin flip as arithmetic. How often this
 * fires is instrument-design data.
 */
export async function chooseTiebreak(verb: Verb): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  if (!record.d1_resolution || !needsStudentTiebreak(record.d1_resolution)) {
    return { ok: false, message: 'There is no tie to break.' };
  }

  try {
    const updated = applyStudentTiebreak(record.d1_resolution, verb);
    await store.save({ ...record, d1_resolution: updated });
    console.info(
      `[Genius Mining] D1 UNRESOLVED tiebreak for ${record.participant_code}: candidates ${updated.candidates?.join('/')}, student chose ${verb}.`
    );
    revalidatePath('/genius-mining/questionnaire');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

/**
 * Runs Engine 1 and files the draft profile.
 *
 * One included analysis per subscription, a paid restart after that, and at most
 * two model calls per run.
 */
export async function runAnalysisAction(
  options: { kind?: 'initial' | 'restart' } = {}
): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  const remaining = SECTION_IDS.filter((id) => !record.progress.completed_sections.includes(id));
  if (remaining.length > 0) {
    return { ok: false, message: `Section ${remaining[0]} is not finished yet.` };
  }

  if (!record.d1_resolution) {
    return { ok: false, message: 'Section B has not been tallied yet.' };
  }

  if (needsStudentTiebreak(record.d1_resolution)) {
    return { ok: false, message: 'Your verb count tied. Pick which one is closer first.' };
  }

  const entitlement = canRunAnalysis({
    ledger: record.ledger,
    kind: options.kind ?? 'initial',
    subscriptionActive: entitledToGeniusMining(record),
  });

  if (!entitlement.allowed) {
    return { ok: false, message: entitlement.reason };
  }

  const responses = {
    ...record.responses,
    participant_code: record.participant_code,
    instrument_version: record.instrument_version,
  } as QuestionnaireResponses;

  let engine;
  try {
    engine = resolveEngine(responses, record.d1_resolution);
  } catch (error) {
    if (error instanceof EngineUnavailableError) {
      await sendOperatorAlert({
        severity: 'action_required',
        subject: 'A student tried to run an analysis with no engine configured',
        participantCode: record.participant_code,
        body: [
          'ANTHROPIC_API_KEY is not set in production, so the analysis was refused',
          'rather than answered with the stand-in engine.',
          '',
          'Their answers are saved and no credit was spent. Set the key and tell them.',
        ].join('\n'),
      });
      return { ok: false, message: error.message };
    }
    throw error;
  }

  const lockedLedger = recordCall(record.ledger);
  await store.save({ ...record, ledger: lockedLedger });

  const releaseLock = async () => {
    await store.save({
      ...record,
      ledger: { ...record.ledger, calls_used_this_run: 0 },
    });
  };

  let result;
  try {
    result = await runAnalysis(responses, record.d1_resolution, engine.transport);
  } catch (error) {
    await releaseLock();
    const message = (error as Error).message;
    const timedOut = /timed out|aborted|TimeoutError|AbortError/i.test(
      `${(error as Error).name} ${message}`
    );
    await sendOperatorAlert({
      severity: 'critical',
      subject: timedOut ? 'Engine 1 call timed out' : 'Engine 1 call failed',
      participantCode: record.participant_code,
      body: `The analysis call threw before returning anything.\n\n${message.slice(0, 500)}`,
    });
    return {
      ok: false,
      message: timedOut
        ? 'The analysis timed out. Your answers are saved and nothing was charged — try again.'
        : 'The analysis could not run. Your answers are saved and nothing was charged.',
    };
  }

  if (!result.ok) {
    await releaseLock();
    await sendOperatorAlert({
      severity: 'critical',
      subject: 'Engine 1 output failed the contract twice',
      participantCode: record.participant_code,
      body: [
        'Both attempts failed validation, so the run is stopped rather than retried again.',
        '',
        ...result.errors,
        '',
        'Raw responses:',
        ...result.attempts.map((attempt, index) => `--- attempt ${index + 1} ---\n${attempt.raw}`),
      ].join('\n'),
    });

    return {
      ok: false,
      message:
        'The analysis came back in a shape we will not file. Nothing has been charged and someone has been alerted.',
    };
  }

  const profile = assembleProfile({
    participantCode: record.participant_code,
    analysis: result.analysis,
    d1Resolution: record.d1_resolution,
    model: engine.model,
  });

  await store.save({
    ...record,
    profile: { ...profile, status: transition(profile.status, 'returned_to_student') },
    ledger: settleRun(lockedLedger, entitlement),
  });

  revalidatePath('/genius-mining/profile');
  return { ok: true };
}

/** The student rewrites a line on their own profile. Free while subscribed. */
export async function editProfileField(field: string, revised: string): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  if (!record.profile) return { ok: false, message: 'There is no profile yet.' };
  if (!canEditProfile(entitledToGeniusMining(record))) {
    return { ok: false, message: 'Editing needs an active membership.' };
  }

  const editable = ['evidence', 'body_signal_read', 'for_the_mentor'];
  if (!editable.includes(field)) {
    return { ok: false, message: `${field} is not editable.` };
  }

  const original = (record.profile as unknown as Record<string, string>)[field] ?? '';
  if (original === revised) return { ok: true };

  const status =
    record.profile.status === 'returned_to_student' || record.profile.status === 'accepted'
      ? transition(record.profile.status, 'edited')
      : record.profile.status;

  await store.save({
    ...record,
    profile: {
      ...record.profile,
      [field]: revised,
      status,
      student_edits: recordEdit(record.profile.student_edits ?? [], field, original, revised),
    },
  });

  revalidatePath('/genius-mining/profile');
  return { ok: true };
}

/** Nothing is filed until the student says it is finished. */
export async function acceptProfile(): Promise<ActionResult> {
  const store = getStore();
  const loaded = await requireRecord();
  if (isDenied(loaded)) return loaded;
  const record = loaded;

  if (!record.profile) return { ok: false, message: 'There is no profile yet.' };

  try {
    await store.save({
      ...record,
      profile: { ...record.profile, status: transition(record.profile.status, 'accepted') },
    });
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  revalidatePath('/genius-mining/profile');
  return { ok: true };
}
