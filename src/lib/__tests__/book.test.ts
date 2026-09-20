import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAPPING, TRACKS } from '@/lib/book';

async function book() {
  return import('@/lib/book');
}

beforeEach(() => {
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_BOOK_URL;
  delete process.env.CQ_BOOK_COMMERCE;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BOOK_URL;
  delete process.env.CQ_BOOK_COMMERCE;
});

describe('the commerce switch', () => {
  it('falls back to the canonical Amazon listing with nothing configured', async () => {
    const { commerceEnabled, bookUrl, AMAZON_URL, BOOK } = await book();
    expect(bookUrl()).toBe(AMAZON_URL);
    expect(AMAZON_URL).toContain(BOOK.asin);
    // The a.co share link carries one-off tracking parameters and an extra hop.
    expect(bookUrl()).not.toContain('a.co');
    expect(bookUrl()).not.toContain('social_share');
    expect(commerceEnabled()).toBe(true);
  });

  it('lets the listing be overridden without a code change', async () => {
    process.env.NEXT_PUBLIC_BOOK_URL = 'https://example.com/elsewhere';
    const { bookUrl } = await book();
    expect(bookUrl()).toBe('https://example.com/elsewhere');
  });

  it('can be switched off for an institution even with a URL set', async () => {
    // This is the promise made in an institutional pitch: one setting removes
    // every buy button. If it ever stops holding, the pitch becomes a lie.
    process.env.NEXT_PUBLIC_BOOK_URL = 'https://example.com/book';
    process.env.CQ_BOOK_COMMERCE = 'false';
    const { commerceEnabled } = await book();
    expect(commerceEnabled()).toBe(false);
  });

  it('treats anything other than the literal "false" as on', async () => {
    process.env.NEXT_PUBLIC_BOOK_URL = 'https://example.com/book';
    for (const value of ['true', 'TRUE', '1', 'yes', '']) {
      vi.resetModules();
      process.env.CQ_BOOK_COMMERCE = value;
      const { commerceEnabled } = await book();
      expect(commerceEnabled()).toBe(true);
    }
  });
});

describe('what the page claims about the instrument', () => {
  it('admits the step the instrument does not implement', async () => {
    // The mapping is the honest part of the provenance page. If every row were
    // marked covered, the page would be a plug rather than an account.
    const uncovered = MAPPING.filter((row) => !row.covered);
    expect(uncovered).toHaveLength(1);
    expect(uncovered[0].step).toBe('Step 3');
  });

  it('keeps a non-college path in the tracks', async () => {
    // Trade is what makes this not exclusively a four-year product, and
    // "Figuring It Out" is the population an advising office worries about.
    const names = TRACKS.map((track) => track.name);
    expect(names).toContain('Trade');
    expect(names).toContain('Figuring It Out');
  });
});
