/**
 * The book behind Genius Mining, in one place.
 *
 * Genius Mining v1.3 implements the Genius Mining Starter, Tool 7 of *The
 * Business of Life: Student Edition*. Until now the product never said so
 * anywhere a student could see. An instrument that asks someone to write at
 * length about their life and then hands back a verdict should be able to show
 * its working, and the book is the working.
 *
 * The commercial side is deliberately constrained. See `commerceEnabled`.
 */

export const BOOK = {
  title: 'The Business of Life',
  subtitle: "The Student's Guide to Figuring It Out & Leveling Up",
  edition: 'Student Edition',
  audience: 'For ages 16 to 26',
  author: 'Adam Bond Devereau',
  publisher: 'Hidden Genius Labs LLC',
  year: 2026,
  isbn: '9798258761231',
  asin: 'B0H3STH3XP',
  coverFront: '/book/front.webp',
  coverBack: '/book/back.webp',
  /** The instrument implements this one. */
  tool: { number: 7, name: 'Genius Mining Starter' },
} as const;

/** The four areas the cover lays out as a staircase. */
export const PILLARS = ['Self', 'Health', 'Relationships', 'Work'] as const;

/**
 * The four paths the book opens with.
 *
 * Worth stating plainly on the site: this is not exclusively a four-year
 * product. Trade is a first-class track, and "Figuring It Out" is the group an
 * advising office worries about most.
 */
export const TRACKS = [
  {
    name: 'College',
    detail: 'You are going, or you are already there, and the question is what to do with it.',
  },
  {
    name: 'Work',
    detail: 'You are heading straight into a job and want it to add up to something.',
  },
  {
    name: 'Trade',
    detail: 'You want a skill that pays, and a plan that does not assume a campus.',
  },
  {
    name: 'Figuring It Out',
    detail: 'You do not know yet. This is the track the book was really written for.',
  },
] as const;

/**
 * How the instrument maps onto the book, stated honestly including the gap.
 *
 * The gap is the interesting part and the reason a student who has taken the
 * instrument still has a reason to read: the book asks for operating rules in
 * the student's own words, and the instrument collapses that into a single
 * working word. The word is the better anchor for a computation. The rules are
 * the part you can act on.
 */
export const MAPPING = [
  {
    step: 'Step 1',
    book: 'Pick three moments you handled unusually well.',
    instrument: 'Section A1 — six instances across three moments.',
    covered: true,
  },
  {
    step: 'Step 2',
    book: 'What did you notice that others missed, what options did you see, what made you choose?',
    instrument: 'Sections A2, A3 and C2.',
    covered: true,
  },
  {
    step: 'Step 3',
    book: 'Extract five to nine operating rules in your own words, each starting with "I".',
    instrument: 'Only partly — collapsed into one working word and a single sentence.',
    covered: false,
  },
  {
    step: 'Step 4',
    book: 'Test a principle against something you are facing now.',
    instrument: 'Section E1.',
    covered: true,
  },
] as const;

function str(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Where to buy.
 *
 * The canonical product URL rather than the `a.co` share link the QR on the
 * promotional artwork encodes. That short link carries `social_share` and `ref`
 * parameters minted for one particular share, and it costs an extra redirect.
 * This form is stable, shows the ASIN in the open, and encodes into a sparser
 * QR that scans more easily off a screen.
 */
export const AMAZON_URL = `https://www.amazon.com/dp/${BOOK.asin}`;

export function bookUrl(): string | undefined {
  return str('NEXT_PUBLIC_BOOK_URL') ?? AMAZON_URL;
}

/**
 * Whether to show anything that can be bought.
 *
 * Off by a single environment variable, and that switch exists for a specific
 * conversation. A university paying for CampusQuest could reasonably read a buy
 * button inside a tool it funds as its students being treated as a mailing
 * list, and that objection kills deals quietly. Being able to say "there is a
 * book behind this, and if you would rather your students never see a buy
 * button, that is one setting" turns the objection into a reason to trust us.
 *
 * Provenance never switches off. Where the method came from is not marketing.
 */
export function commerceEnabled(): boolean {
  return str('CQ_BOOK_COMMERCE') !== 'false' && Boolean(bookUrl());
}

/** The disclosure that has to sit next to any buy link. */
export const AUTHOR_DISCLOSURE = `${BOOK.author} wrote this book and earns a royalty on it. Genius Mining is free to use on your plan whether or not you ever buy a copy, and nothing in the questionnaire depends on having read it.`;
