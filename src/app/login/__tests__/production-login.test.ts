import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/app/login/page';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('production login screen', () => {
  it('does not render the developer test-account control in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CQ_ENABLE_TEST_ACCOUNT_BYPASS', 'true');
    vi.stubEnv('CQ_TEST_ACCOUNT_EMAIL', 'campusquesttest@uri.edu');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).not.toContain('Developer access');
    expect(html).not.toContain('Continue with test account');
    expect(html).not.toContain('local development');
    expect(html).not.toContain('test account');
  });
});
