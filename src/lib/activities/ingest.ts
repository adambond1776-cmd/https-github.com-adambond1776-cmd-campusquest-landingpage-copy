/**
 * Turning source feeds into directory rows.
 *
 * `reconcile` is deliberately pure and separate from anything that touches the
 * network or the database, because the rules it encodes are the ones most
 * likely to be wrong in a way nobody notices for a month: what a re-sync is
 * allowed to overwrite, and when a row that has quietly vanished from its
 * source should stop being shown to students.
 */

import type {
  Activity,
  ActivityDraft,
  ActivityStatus,
  SourceId,
} from '@/lib/activities/types';
import { STALE_AFTER_DAYS } from '@/lib/activities/types';
import { getActivityAdminStore } from '@/lib/activities/store';
import { ATHLETICS_FEEDS, fetchAthletics } from '@/lib/activities/sources/athletics';
import { LOCALIST_FEEDS, fetchLocalist } from '@/lib/activities/sources/localist';
import { ENGAGE_FEEDS, fetchEngage } from '@/lib/activities/sources/engage';
import {
  CURATED_DIRECTORIES,
  applyOverlay,
  type CuratedDirectory,
} from '@/lib/activities/sources/curated';

export type IngestReport = {
  source: SourceId;
  campus_id: string;
  fetched: number;
  added: number;
  updated: number;
  staled: number;
  /** Registered organizations the hand-compiled list does not confirm. */
  unconfirmed?: number;
  /** Curated clubs that matched nothing but resemble a registered one. */
  review?: { club: string; candidates: string[] }[];
  /** Set when the feed failed. One bad source must not abort the others. */
  error?: string;
};

/**
 * Fields a human owns. A re-sync must never clobber these.
 *
 * The source is authoritative about when the game starts. It knows nothing
 * about whether someone confirmed the club still meets, which working words fit
 * it, or whether an operator deliberately hid it.
 */
type HumanOwned = Pick<
  Activity,
  'status' | 'verified_at' | 'verified_by' | 'working_words' | 'low_commitment_entry'
>;

/**
 * What status a returning row should carry.
 *
 * A verified row stays verified: the source changing a start time does not
 * invalidate a person's judgement that the club is real. A hidden row stays
 * hidden, or an operator's decision would be undone by the next cron run. A
 * stale row that reappears is demoted to `listed` rather than restored to
 * `verified`, because we no longer know the confirmation still holds.
 */
function statusOnResync(previous: ActivityStatus, needsReview: boolean): ActivityStatus {
  if (previous === 'hidden' || previous === 'pending') return previous;
  if (previous === 'verified') return 'verified';
  if (needsReview) return 'pending';
  return 'listed';
}

function carryOver(existing: Activity, draft: ActivityDraft): HumanOwned {
  return {
    status: statusOnResync(existing.status, draft.needs_review ?? false),
    verified_at: existing.verified_at,
    verified_by: existing.verified_by,
    // A person's tags win. An adapter default only fills a genuine blank.
    working_words:
      existing.working_words.length > 0 ? existing.working_words : draft.working_words ?? [],
    low_commitment_entry:
      existing.low_commitment_entry !== null
        ? existing.low_commitment_entry
        : draft.low_commitment_entry ?? null,
  };
}

function fromDraft(draft: ActivityDraft, now: string): Activity {
  const { needs_review, working_words, low_commitment_entry, verified_by, ...rest } = draft;

  return {
    ...rest,
    first_seen: now,
    last_seen: now,
    status: verified_by ? 'verified' : needs_review ? 'pending' : 'listed',
    verified_at: verified_by ? now : null,
    verified_by: verified_by ?? null,
    working_words: working_words ?? [],
    low_commitment_entry: low_commitment_entry ?? null,
  };
}

export type ReconcileResult = {
  rows: Activity[];
  added: number;
  updated: number;
  staled: number;
};

/**
 * Merge a fresh pull into what we already hold.
 *
 * `existing` should be scoped to the same source and campus as `drafts`, since
 * absence from the pull is what marks a row stale and rows from another feed
 * were never going to be in it.
 */
/**
 * Collapse repeated drafts for the same activity, keeping the soonest.
 *
 * A recurring event comes back from Localist once per occurrence inside the
 * window, so a weekly coffee hour arrives fifteen times. Without this the row
 * counts in the report are inflated and, worse, the last copy wins the write —
 * which means a series running until October would advertise its final session
 * instead of the one this Thursday.
 */
function dedupeDrafts(drafts: ActivityDraft[]): ActivityDraft[] {
  const byId = new Map<string, ActivityDraft>();

  for (const draft of drafts) {
    const held = byId.get(draft.id);
    if (!held) {
      byId.set(draft.id, draft);
      continue;
    }

    const incoming = draft.starts_at;
    const current = held.starts_at;
    if (incoming && (!current || incoming < current)) byId.set(draft.id, draft);
  }

  return [...byId.values()];
}

export function reconcile(
  existing: Activity[],
  incoming: ActivityDraft[],
  now: Date = new Date()
): ReconcileResult {
  const iso = now.toISOString();
  const drafts = dedupeDrafts(incoming);
  const byId = new Map(existing.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const rows: Activity[] = [];

  let added = 0;
  let updated = 0;
  let staled = 0;

  for (const draft of drafts) {
    seen.add(draft.id);
    const previous = byId.get(draft.id);

    if (!previous) {
      rows.push(fromDraft(draft, iso));
      added += 1;
      continue;
    }

    const {
      needs_review: _needsReview,
      working_words: _ww,
      low_commitment_entry: _lce,
      verified_by: _vb,
      ...fields
    } = draft;

    rows.push({
      ...fields,
      ...carryOver(previous, draft),
      first_seen: previous.first_seen,
      last_seen: iso,
    });
    updated += 1;
  }

  // Rows the feed stopped returning. Curated and student-submitted rows have no
  // feed backing them, so their absence means nothing and they are left alone.
  const cutoff = new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);

  for (const row of existing) {
    if (seen.has(row.id)) continue;
    if (row.source === 'curated' || row.source === 'submitted') {
      rows.push(row);
      continue;
    }

    const missingSince = new Date(row.last_seen);
    const expired = Number.isNaN(missingSince.getTime()) || missingSince < cutoff;

    if (expired && row.status !== 'stale' && row.status !== 'hidden') {
      rows.push({ ...row, status: 'stale' });
      staled += 1;
    } else {
      rows.push(row);
    }
  }

  return { rows, added, updated, staled };
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

type Puller = { source: SourceId; campus_id: string; pull: () => Promise<ActivityDraft[]> };

function pullersFor(campusId: string): Puller[] {
  const pullers: Puller[] = [];

  const athletics = ATHLETICS_FEEDS[campusId];
  if (athletics) {
    pullers.push({ source: 'athletics', campus_id: campusId, pull: () => fetchAthletics(athletics) });
  }

  const localist = LOCALIST_FEEDS[campusId];
  if (localist) {
    pullers.push({ source: 'localist', campus_id: campusId, pull: () => fetchLocalist(localist) });
  }

  const engage = ENGAGE_FEEDS[campusId];
  if (engage) {
    pullers.push({ source: 'engage', campus_id: campusId, pull: () => fetchEngage(engage) });
  }

  return pullers;
}

export function campusesWithFeeds(): string[] {
  return [
    ...new Set([
      ...Object.keys(ATHLETICS_FEEDS),
      ...Object.keys(LOCALIST_FEEDS),
      ...Object.keys(ENGAGE_FEEDS),
      ...Object.keys(CURATED_DIRECTORIES),
    ]),
  ];
}

/**
 * Sync every configured feed for a campus.
 *
 * Sources are pulled independently and a failure is recorded rather than
 * thrown: an athletics outage should not stop the events calendar from
 * refreshing, and a half-updated directory beats a stale one.
 */
export async function runIngest(campusId: string, now: Date = new Date()): Promise<IngestReport[]> {
  const store = getActivityAdminStore();
  const existing = await store.all(campusId);
  const reports: IngestReport[] = [];
  let feedsSucceeded = false;

  for (const puller of pullersFor(campusId)) {
    const base: IngestReport = {
      source: puller.source,
      campus_id: campusId,
      fetched: 0,
      added: 0,
      updated: 0,
      staled: 0,
    };

    try {
      const drafts = await puller.pull();
      const scoped = existing.filter((row) => row.source === puller.source);
      const result = reconcile(scoped, drafts, now);

      await store.upsert(result.rows);
      feedsSucceeded = true;
      reports.push({
        ...base,
        // Distinct activities, not raw feed entries: a recurring event arrives
        // once per occurrence and collapses to a single row.
        fetched: result.added + result.updated,
        added: result.added,
        updated: result.updated,
        staled: result.staled,
      });
    } catch (error) {
      reports.push({
        ...base,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // The overlay runs last, over whatever the feeds just wrote. Skipped when
  // every feed failed, since there would be nothing fresh to verify against.
  const directory = CURATED_DIRECTORIES[campusId];
  if (directory && feedsSucceeded) {
    reports.push(await applyCuratedOverlay(campusId, directory, now));
  }

  return reports;
}

async function applyCuratedOverlay(
  campusId: string,
  directory: CuratedDirectory,
  now: Date
): Promise<IngestReport> {
  const store = getActivityAdminStore();
  const base: IngestReport = {
    source: 'curated',
    campus_id: campusId,
    fetched: directory.clubs.length,
    added: 0,
    updated: 0,
    staled: 0,
  };

  try {
    const current = await store.all(campusId);
    const overlay = applyOverlay(current, directory, now);

    const existingCurated = current.filter((row) => row.source === 'curated');
    const merged = reconcile(existingCurated, overlay.added, now);

    await store.upsert([...overlay.verified, ...merged.rows]);

    return {
      ...base,
      added: merged.added,
      updated: overlay.verified.length,
      unconfirmed: overlay.unconfirmed,
      review: overlay.review,
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : String(error) };
  }
}
