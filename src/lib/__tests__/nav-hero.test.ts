import { describe, expect, it } from 'vitest';
import { HERO_NAV_SELECTOR, heroCoversNavbar } from '@/lib/nav-hero';

describe('heroCoversNavbar', () => {
  it('is true while the hero still extends below the navbar', () => {
    expect(heroCoversNavbar(400, 72)).toBe(true);
    expect(heroCoversNavbar(73, 72)).toBe(true);
  });

  it('is false once the hero has scrolled fully under the navbar', () => {
    expect(heroCoversNavbar(72, 72)).toBe(false);
    expect(heroCoversNavbar(20, 72)).toBe(false);
  });
});

describe('HERO_NAV_SELECTOR', () => {
  it('targets the homepage hero marker', () => {
    expect(HERO_NAV_SELECTOR).toBe('[data-cq-hero]');
  });
});
