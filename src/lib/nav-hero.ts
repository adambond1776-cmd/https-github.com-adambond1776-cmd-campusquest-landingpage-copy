/** Marks the homepage hero so the sticky navbar can track it. */
export const HERO_NAV_SELECTOR = '[data-cq-hero]';

/**
 * True while any part of the hero still sits below the sticky navbar.
 * Used for the initial layout read; IntersectionObserver keeps it in sync.
 */
export function heroCoversNavbar(heroBottom: number, navHeight: number): boolean {
  return heroBottom > navHeight;
}
