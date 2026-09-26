import { afterEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  createClient.mockReset();
});

function queryChain(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

describe('getActivityStore', () => {
  it('opens the public directory with the anon key, not the service role', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projecta.supabase.co');
    const anon =
      `header.${Buffer.from(JSON.stringify({ ref: 'projecta', role: 'anon' })).toString('base64url')}.sig`;
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-must-not-be-used-for-reads');

    const tables: string[] = [];
    const query = queryChain({ data: [], error: null });
    createClient.mockReturnValue({
      from: (table: string) => {
        tables.push(table);
        return { select: () => query };
      },
    });

    const { getActivityStore } = await import('@/lib/activities/store');
    const store = getActivityStore();
    expect(store.kind).toBe('supabase');
    await expect(store.all('uri')).resolves.toEqual([]);
    expect(createClient).toHaveBeenCalledTimes(1);
    const [, key] = createClient.mock.calls[0] as [string, string];
    expect(key).toBe(anon);
    expect(key).not.toBe('service-role-must-not-be-used-for-reads');
    expect(tables).toEqual(['external_events', 'external_organizations']);
    expect(tables).not.toContain('cq_activities');
    expect(query.is).toHaveBeenCalledWith('canonical_event_id', null);
  });

  it('does not surface Invalid API key to the public page', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projecta.supabase.co');
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      `header.${Buffer.from(JSON.stringify({ ref: 'projecta', role: 'anon' })).toString('base64url')}.sig`
    );

    const query = queryChain({ data: null, error: { message: 'Invalid API key' } });
    createClient.mockReturnValue({
      from: () => ({
        select: () => query,
      }),
    });

    const { getActivityStore } = await import('@/lib/activities/store');
    await expect(getActivityStore().all('uri')).rejects.toMatchObject({
      kind: 'invalid_credentials',
    });
  });
});
