import { describe, expect, it } from 'vitest';
import { canTransition, entersReporting, isEditable, recordEdit, transition } from '../signoff';

describe('the sign-off state machine', () => {
  it('walks draft to filed', () => {
    let status = transition('draft', 'returned_to_student');
    status = transition(status, 'edited');
    status = transition(status, 'accepted');
    status = transition(status, 'filed');

    expect(status).toBe('filed');
  });

  it('lets a student accept without editing anything', () => {
    expect(canTransition('returned_to_student', 'accepted')).toBe(true);
  });

  it('lets a student keep refining, which the paid tier includes', () => {
    expect(canTransition('edited', 'edited')).toBe(true);
    expect(canTransition('accepted', 'edited')).toBe(true);
  });

  it('will not file a profile the student has not accepted', () => {
    expect(() => transition('returned_to_student', 'filed')).toThrow(/Illegal/);
    expect(() => transition('edited', 'filed')).toThrow(/Illegal/);
  });

  it('will not show a draft to the student as finished', () => {
    expect(() => transition('draft', 'accepted')).toThrow(/Illegal/);
  });

  it('treats filed as terminal', () => {
    expect(() => transition('filed', 'edited')).toThrow(/Illegal/);
    expect(isEditable('filed')).toBe(false);
  });
});

describe('what enters reporting', () => {
  it('counts only what the student signed off on', () => {
    expect(entersReporting('draft')).toBe(false);
    expect(entersReporting('returned_to_student')).toBe(false);
    expect(entersReporting('edited')).toBe(false);
    expect(entersReporting('accepted')).toBe(true);
    expect(entersReporting('filed')).toBe(true);
  });
});

describe('recordEdit', () => {
  it('logs what changed and when', () => {
    const edits = recordEdit([], 'evidence', 'old text', 'new text', new Date('2026-09-06T18:00:00Z'));

    expect(edits).toEqual([
      {
        field: 'evidence',
        original: 'old text',
        revised: 'new text',
        edited_at: '2026-09-06T18:00:00.000Z',
      },
    ]);
  });

  it('does not log a no-op edit', () => {
    expect(recordEdit([], 'evidence', 'same', 'same')).toEqual([]);
  });
});
