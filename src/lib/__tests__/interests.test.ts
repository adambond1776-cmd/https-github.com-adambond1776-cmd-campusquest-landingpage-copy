import { describe, expect, it } from 'vitest';
import {
  INTEREST_OPTIONS, INTEREST_GROUPS, INTERESTS, interestLabels,
  normalizeInterestProfile, normalizeInterests, validateInterestProfile, validateInterests,
} from '@/lib/interests';

describe('weighted interest preferences', () => {
  it('offers eighteen unique themes in six groups', () => {
    expect(INTERESTS).toHaveLength(18);
    expect(new Set(INTEREST_OPTIONS.map((option) => option.id)).size).toBe(18);
    expect(INTEREST_GROUPS).toHaveLength(6);
    for (const group of INTEREST_GROUPS) expect(INTEREST_OPTIONS.filter((option) => option.group === group)).toHaveLength(3);
  });
  it('migrates old labels and combined choices without inventing priorities', () => {
    const profile = normalizeInterestProfile(undefined, ['Music', 'Theater', 'Music & Performance', 'Art', 'Photography', 'Sports', 'Tech']);
    expect(profile.selections.map((s) => s.id)).toEqual(['music', 'performance', 'arts', 'play-sports', 'watch-sports', 'technology']);
    expect(profile.selections.every((s) => s.priority === 2 && !s.details.length)).toBe(true);
  });
  it('tolerates corrupt old metadata and removes duplicate selections', () => {
    expect(normalizeInterests(null)).toEqual([]);
    expect(normalizeInterests(['constructor', {}, 1, 'Tech', 'Tech'])).toEqual(['Science, technology & making']);
  });
  it('does not overwrite an explicit empty new profile with legacy choices', () => {
    expect(normalizeInterestProfile({ version: 1, selections: [] }, ['Tech']).selections).toEqual([]);
  });
  it('retains valid weights and details in stable order', () => {
    const profile = normalizeInterestProfile({ version: 1, selections: [
      { id: 'technology', priority: 1, details: ['Coding', 'unknown'] },
      { id: 'arts', priority: 3, details: ['Photography', 'Photography', 'Film'] },
    ] });
    expect(profile.selections).toEqual([
      { id: 'arts', priority: 3, details: ['Photography', 'Film'] },
      { id: 'technology', priority: 1, details: ['Coding'] },
    ]);
  });
  it.each([null, {}, 'Tech', ['Unknown'], [1], ['constructor'], Array(19).fill('Tech')])(
    'rejects malformed legacy writes: %j', (input) => expect(validateInterests(input).ok).toBe(false),
  );
  it.each([
    null, [], { version: 2, selections: [] },
    { version: 1, selections: [], plan: 'premium' },
    { version: 1, selections: [{ id: 'unknown', priority: 2, details: [] }] },
    { version: 1, selections: [{ id: 'arts', priority: 99, details: [] }] },
    { version: 1, selections: [{ id: 'arts', priority: '3', details: [] }] },
    { version: 1, selections: [{ id: 'arts', priority: 3, details: ['Coding'] }] },
    { version: 1, selections: [{ id: 'arts', priority: 3, details: [], userId: 'other' }] },
    { version: 1, selections: Array(2).fill({ id: 'arts', priority: 2, details: [] }) },
  ])('rejects invalid profile writes: %j', (profile) => expect(validateInterestProfile(profile).ok).toBe(false));
  it('allows clearing all choices and every valid theme', () => {
    expect(validateInterestProfile({ version: 1, selections: [] })).toEqual({
      ok: true, interests: [], profile: { version: 1, selections: [] },
    });
    const profile = { version: 1, selections: INTEREST_OPTIONS.map((option) => ({ id: option.id, priority: 2, details: [...option.details] })) };
    const result = validateInterestProfile(profile);
    expect(result.ok).toBe(true);
    if (result.ok) expect(interestLabels(result.profile)).toEqual(INTERESTS);
  });
});
