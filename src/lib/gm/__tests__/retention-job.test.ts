import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySubscriptionChange,
  initialRetentionState,
  type SubscriptionSnapshot,
} from '@hiddengeniuslabs/genius-mining';
import { newRecord, type GeniusMiningRecord } from '@/lib/gm/records';

vi.mock('@/lib/alerts', () => ({
  sendOperatorAlert: vi.fn(async () => ({ delivered: true, detail: 'stubbed' })),
  sendRetentionWarning: vi.fn(async () => ({ delivered: true, detail: 'stubbed' })),
}));

const LAPSE = new Date('2026-03-01T12:00:00.000Z');
const dayAfterLapse = (days: number) => new Date(LAPSE.getTime() + days * 86_400_000);

const FREE: SubscriptionSnapshot = { tier: 'free', status: 'active' };

let dir: string;
let storePath: string;

async function loadStore() {
  const { getStore, resetStoreForTesting } = await import('@/lib/gm/store');
  resetStoreForTesting();
  return getStore();
}

/** A record that has completed the instrument and had its analysis filed. */
function analyzedRecord(overrides: Partial<GeniusMiningRecord> = {}): GeniusMiningRecord {
  const base = newRecord({
    participantCode: 'GM-100',
    userId: 'user-1',
    campusId: 'uri',
    instrumentVersion: '1.3',
    firstSection: 'A',
  });

  return {
    ...base,
    responses: {
      A1: Array.from({ length: 6 }, (_, index) => ({
        index: index + 1,
        text: `instance ${index + 1}`,
      })),
      A2: 'Marching band, glad to stop the 6am calls.',
      A3: 'Basement of the engineering building at 2am.',
      A4: [{ activity: 'pickup basketball at Mackal', mode: 'do', social: 'few friends', setting: 'indoors' }],
      A4_consent: true,
      B: [
        { instance: 1, verb: 'BUILT' },
        { instance: 2, verb: 'REPAIRED' },
        { instance: 3, verb: 'EXPLAINED' },
        { instance: 4, verb: 'SORTED' },
        { instance: 5, verb: 'REPAIRED' },
        { instance: 6, verb: 'BUILT' },
      ],
      C1: [2, 5],
      C2: 'Chest tightens on the transmitter one.',
      C3: 'Hands were holding a probe and tracing the board, eyes going back and forth to the schematic.',
      D3: "I won't leave a broken thing alone.",
      E3: { answer: 'YES', which_question: 'D3' },
    },
    d1_resolution: { computed_verb: 'REPAIRED', resolution: 'tie_broken_by_C1' },
    profile: {
      participant_code: 'GM-100',
      instrument_version: '1.3',
      engine_version: 'analysis-1.2',
      model: 'claude-sonnet-4-6',
      run_at: LAPSE.toISOString(),
      primary_working_word: 'FIXER',
      evidence: 'You wrote that you kept muttering the signal path out loud while tracing the board.',
      secondary_pattern: { word: 'BUILDER', note: 'Two instances were things you made exist.' },
      disagreement_with_self_tally: { value: false, reason: 'Your tally agreed.' },
      body_signal_read: 'Chest tightening confirms it.',
      confidence: 'HIGH',
      thin_spots: ['E2'],
      for_the_mentor: 'Ask about something broken they walked away from.',
      status: 'accepted',
    },
    retention: applySubscriptionChange(initialRetentionState(), FREE, LAPSE).state,
    subscription: FREE,
    progress: {
      completed_sections: ['A', 'B', 'C', 'D', 'E'],
      current_section: 'E',
      sittings: [{ started_at: LAPSE.toISOString(), last_saved_at: LAPSE.toISOString() }],
    },
    ...overrides,
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'gm-retention-test-'));
  storePath = join(dir, 'records.json');
  process.env.GM_LOCAL_STORE_PATH = storePath;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.GM_LOCAL_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe('the retention job', () => {
  it('does nothing before day 7', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord());

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    expect(await runRetentionJob(dayAfterLapse(3))).toEqual([]);
  });

  it('warns on day 7 and stamps it so it does not fire twice', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord());

    const { runRetentionJob } = await import('@/lib/gm/retention-job');

    const first = await runRetentionJob(dayAfterLapse(7));
    expect(first).toHaveLength(1);
    expect(first[0].action).toBe('warn_7');

    expect((await store.get('GM-100'))?.retention.warning_7_sent_at).not.toBeNull();
    expect(await runRetentionJob(dayAfterLapse(8))).toEqual([]);
  });

  it('warns again on day 25', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord());

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    await runRetentionJob(dayAfterLapse(7));

    const second = await runRetentionJob(dayAfterLapse(25));
    expect(second[0].action).toBe('warn_25');
  });

  it('de-identifies then purges on day 30', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord());

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    const outcomes = await runRetentionJob(dayAfterLapse(30));

    expect(outcomes[0].action).toBe('purged');
    expect(outcomes[0].detail).toMatch(/De-identified to gmc_/);

    const purgedRecord = await store.get('GM-100');
    expect(purgedRecord?.retention.membership_status).toBe('purged');
    expect(purgedRecord?.retention.deidentified_copy_retained).toBe(true);
    expect(purgedRecord?.profile).toBeNull();
    expect(purgedRecord?.responses).toEqual({});
  });

  it('leaves an anonymous corpus copy behind', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord());

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    await runRetentionJob(dayAfterLapse(30));

    const raw = JSON.parse(await readFile(storePath, 'utf8')) as {
      corpus: Record<string, unknown>[];
    };

    expect(raw.corpus).toHaveLength(1);
    const [copy] = raw.corpus;

    // One record in the store is nowhere near the cohort size at which a
    // narrative stops pointing at one person, so the copy is structure only.
    expect(copy.mode).toBe('structured');
    expect(copy.text).toBeUndefined();
    expect(copy.lengths).toBeDefined();
    expect(copy.primary_working_word).toBe('FIXER');
    expect(copy.corpus_id).toMatch(/^gmc_/);

    const serialized = JSON.stringify(copy);
    expect(serialized).not.toContain('GM-100');
    expect(serialized).not.toContain('Mackal');
    expect(serialized).not.toContain('which_question');
  });

  it('blocks the purge and does not delete anything when de-identification fails', async () => {
    const store = await loadStore();
    // C3 empty means there is nothing worth learning from, so the corpus write
    // is refused — and losing the corpus copy is worse than a late deletion.
    await store.save(
      analyzedRecord({
        responses: { ...analyzedRecord().responses, C3: '' },
      })
    );

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    const outcomes = await runRetentionJob(dayAfterLapse(30));

    expect(outcomes[0].action).toBe('purge_blocked');

    const untouched = await store.get('GM-100');
    expect(untouched?.retention.membership_status).not.toBe('purged');
    expect(untouched?.profile).not.toBeNull();
    expect(untouched?.responses.A1).toHaveLength(6);

    const { sendOperatorAlert } = await import('@/lib/alerts');
    expect(sendOperatorAlert).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical', subject: expect.stringMatching(/Purge blocked/) })
    );
  });

  it('purges an unanalyzed record without a corpus copy', async () => {
    const store = await loadStore();
    await store.save(analyzedRecord({ profile: null, d1_resolution: null }));

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    const outcomes = await runRetentionJob(dayAfterLapse(30));

    expect(outcomes[0].action).toBe('purged');
    expect(outcomes[0].detail).toMatch(/No corpus copy was possible/);
  });

  it('ignores a record whose subscription came back', async () => {
    const store = await loadStore();
    const restored = applySubscriptionChange(
      analyzedRecord().retention,
      { tier: 'premium', status: 'active' },
      dayAfterLapse(10)
    );
    await store.save(analyzedRecord({ retention: restored.state }));

    const { runRetentionJob } = await import('@/lib/gm/retention-job');
    expect(await runRetentionJob(dayAfterLapse(40))).toEqual([]);

    expect((await store.get('GM-100'))?.profile).not.toBeNull();
  });
});
