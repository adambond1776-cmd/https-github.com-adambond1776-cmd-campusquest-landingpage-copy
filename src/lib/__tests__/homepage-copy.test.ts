import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const component = (name: string) =>
  readFileSync(new URL(`../../components/${name}.tsx`, import.meta.url), 'utf8')
    .replace(/\s+/g, ' ');

describe('homepage Genius Mining positioning', () => {
  it('does not bundle Genius Mining with the five-dollar plan in the hero', () => {
    const hero = component('Hero');
    expect(hero).not.toContain('/mo with Genius Mining');
    expect(hero).toContain('not included in either plan');
    expect(hero).toContain('PLANS.premium.name');
  });

  it('keeps the assessment and advisor profile out of student plan feature cards', () => {
    const students = component('ForStudents');
    expect(students).not.toContain('Genius Mining, the full session');
    expect(students).not.toContain('A page you can hand to an advisor');
    expect(students).not.toContain('adds Genius Mining');
    expect(students).toContain('<GeniusMiningTeaser />');
    expect(students).toContain('Planned for Plus');
  });

  it('discloses exclusion and unannounced availability outside collapsed details', () => {
    const teaser = component('GeniusMiningTeaser').split('<details')[0];
    expect(teaser).toContain('Coming soon');
    expect(teaser).toContain('not included in Basic or Plus');
    expect(teaser).toContain('Launch timing, availability and pricing will be announced');
  });

  it('does not advertise an available institutional Genius Mining price on the homepage', () => {
    const pricing = component('Pricing');
    expect(pricing).not.toContain('INSTITUTIONAL_SEAT_PRICE');
    expect(pricing).not.toContain('Schools can cover Genius Mining');
    expect(pricing).toContain('not a current offer');
  });
});
