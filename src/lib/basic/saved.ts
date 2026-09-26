import { recommendationCategory } from '@/lib/activities/interest-recommendations';
import { isPublic, type Activity } from '@/lib/activities/types';

export const SAVED_KINDS = ['event', 'club', 'organization'] as const;
export type SavedKind = (typeof SAVED_KINDS)[number];

export const SAVED_REMINDERS = ['off', 'email'] as const;
export type SavedReminder = (typeof SAVED_REMINDERS)[number];

export const EMAIL_REMINDER_NOTE =
  'This stores your preference only. CampusQuest is not sending reminder emails yet.';

export type SavedItemRow = {
  kind: SavedKind;
  target_id: string;
  reminder: SavedReminder;
  created_at: string;
};

export function isSavedKind(value: unknown): value is SavedKind {
  return value === 'event' || value === 'club' || value === 'organization';
}

export function parseSavedReminder(value: unknown): SavedReminder | null {
  return value === 'off' || value === 'email' ? value : null;
}

export function savedItemKey(kind: SavedKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

/** Events include athletics. Clubs and organizations stay separate groups. */
export function savedKindForActivity(activity: Activity): SavedKind | null {
  const category = recommendationCategory(activity);
  if (category === 'events') return 'event';
  if (category === 'clubs') return 'club';
  if (category === 'organizations') return 'organization';
  return null;
}

export function canSaveActivity(activity: Activity | null, kind: SavedKind): boolean {
  if (!activity || !isPublic(activity)) return false;
  return savedKindForActivity(activity) === kind;
}

/** Non-events cannot store an email reminder. */
export function reminderForKind(kind: SavedKind, reminder: SavedReminder): SavedReminder {
  return kind === 'event' ? reminder : 'off';
}

/** Inserts and reminder updates follow the access window. Deletes follow ownership. */
export function savedMutationAllowed(operation: 'insert' | 'update' | 'delete', active: boolean): boolean {
  if (operation === 'delete') return true;
  return active;
}

export function saveDecision(input: {
  signedIn: boolean;
  verified: boolean;
  active: boolean;
  activity: Activity | null;
  kind: SavedKind;
}): { ok: true } | { ok: false; message: string } {
  if (!input.signedIn) {
    return { ok: false, message: 'Sign in to save listings inside CampusQuest.' };
  }
  if (!input.verified) {
    return { ok: false, message: 'Verify your campus email before saving.' };
  }
  if (!input.active) {
    return {
      ok: false,
      message: 'Saving listings inside CampusQuest is part of Founding Basic. Browsing stays free.',
    };
  }
  if (!canSaveActivity(input.activity, input.kind)) {
    return { ok: false, message: 'That listing is not available to save.' };
  }
  return { ok: true };
}
