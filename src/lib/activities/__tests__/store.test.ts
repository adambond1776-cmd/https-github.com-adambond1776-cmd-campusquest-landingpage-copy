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

describe('getActivityStore', () => {
  it('opens the public directory with the anon key, not the service role', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projecta.supabase.co');
    const anon =
      `header.${Buffer.from(JSON.stringify({ ref: 'projecta', role: 'anon' })).toString('base64url')}.sig`;
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-must-not-be-used-for-reads');

    const query = {
      eq: vi.fn(),
      then: (resolve: (value: { data: unknown; error: null }) => void) =>
        resolve({ data: [], error: null }),
    };
    query.eq.mockReturnValue(query);

    createClient.mockReturnValue({
      from: () => ({
        select: () => query,
      }),
    });

    const { getActivityStore } = await import('@/lib/activities/store');
    const store = getActivityStore();
    expect(store.kind).toBe('supabase');
    expect(createClient).toHaveBeenCalledTimes(1);
    const [, key] = createClient.mock.calls[0] as [string, string];
    expect(key).toBe(anon);
    expect(key).not.toBe('service-role-must-not-be-used-for-reads');
  });

  it('does not surface Invalid API key to the public page', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://projecta.supabase.co');
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      `header.${Buffer.from(JSON.stringify({ ref: 'projecta', role: 'anon' })).toString('base64url')}.sig`
    );

    const query = {
      eq: vi.fn(),
      then: (resolve: (value: { data: null; error: { message: string } }) => void) =>
        resolve({ data: null, error: { message: 'Invalid API key' } }),
    };
    query.eq.mockReturnValue(query);

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
