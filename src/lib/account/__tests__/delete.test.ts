import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The point of these is coverage of the *set of tables*, not of any one delete.
 *
 * The failure this guards against is a new table being added later and quietly
 * not being wired into deletion, which turns the promise in the terms into a
 * lie without anything going red.
 */

let dir: string;

beforeEach(async () => {
  vi.resetModules();
  dir = await mkdtemp(join(tmpdir(), 'cq-del-'));
  process.env.CQ_LOCAL_AGE_PATH = join(dir, 'ages.json');
  process.env.CQ_LOCAL_REPORTS_PATH = join(dir, 'reports.json');
  process.env.GM_LOCAL_DEMAND_PATH = join(dir, 'demand.json');
  process.env.GM_LOCAL_STORE_PATH = join(dir, 'records.json');
});

afterEach(async () => {
  delete process.env.CQ_LOCAL_AGE_PATH;
  delete process.env.CQ_LOCAL_REPORTS_PATH;
  delete process.env.GM_LOCAL_DEMAND_PATH;
  delete process.env.GM_LOCAL_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

const EMAIL = 'leaver@uri.edu';

describe('account deletion', () => {
  it('erases the age record, the corrections and the campus interest', async () => {
    const { ageStore } = await import('@/lib/age-store');
    const { getReportStore } = await import('@/lib/activities/report-store');
    const { getDemandStore, hashEmail } = await import('@/lib/gm/demand');
    const { hashReporter } = await import('@/lib/activities/reports');
    const { deleteAccount } = await import('@/lib/account/delete');

    await ageStore().attest(EMAIL, 1998);

    await getReportStore().create({
      campus_id: 'uri',
      activity_id: null,
      kind: 'missing',
      detail: 'The knitting society is not listed.',
      suggested_name: 'Knitting Society',
      reporter_hash: hashReporter(EMAIL),
      reporter_email: EMAIL,
      created_at: new Date().toISOString(),
      status: 'pending',
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
      credited: false,
    });

    await getDemandStore().record({
      campus_id: 'uri',
      school_name: 'University of Rhode Island',
      email_hash: hashEmail(EMAIL),
      email: EMAIL,
      created_at: new Date().toISOString(),
    });

    const result = await deleteAccount({ email: EMAIL, userId: null });

    expect(result.ok).toBe(true);
    expect(await ageStore().get(EMAIL)).toBeNull();
    expect(await getReportStore().byReporter(hashReporter(EMAIL))).toHaveLength(0);
    expect(await getDemandStore().countFor('uri')).toBe(0);
  });

  it('reports which table each step touched, so a gap is visible', async () => {
    const { deleteAccount } = await import('@/lib/account/delete');
    const result = await deleteAccount({ email: EMAIL, userId: null });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Every store that holds something keyed to a person has to appear here.
    const touched = result.steps.map((step) => step.table);
    expect(touched).toEqual(
      expect.arrayContaining([
        'genius_mining',
        'activity_reports',
        'campus_interest',
        'age_record',
        'auth_user',
      ])
    );
  });

  it('leaves other students alone', async () => {
    const { ageStore } = await import('@/lib/age-store');
    const { deleteAccount } = await import('@/lib/account/delete');

    await ageStore().attest(EMAIL, 1998);
    await ageStore().attest('stays@uri.edu', 1997);

    await deleteAccount({ email: EMAIL, userId: null });

    expect(await ageStore().get(EMAIL)).toBeNull();
    expect(await ageStore().get('stays@uri.edu')).not.toBeNull();
  });
});
