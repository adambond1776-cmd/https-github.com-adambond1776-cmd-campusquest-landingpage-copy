'use server';

import { sendOperatorAlert } from '@/lib/alerts';
import { CAMPUSES, DEMAND_THRESHOLD, campusName } from '@/lib/campuses';
import { getDemandStore, hashEmail } from '@/lib/gm/demand';
import { validateEmail } from '@/lib/validation';

export type AskResult =
  | { ok: true; count: number; alreadyAsked: boolean }
  | { ok: false; message: string };

/**
 * Records one student asking their school to cover Genius Mining.
 *
 * Returns the campus total so the student sees the number move. Asking twice is
 * not an error and does not double-count — the honest response is the current
 * total and a note that we already had them.
 */
export async function askMySchool(input: {
  campusId: string;
  schoolName: string;
  email: string;
  notify: boolean;
}): Promise<AskResult> {
  const campus = CAMPUSES.find((entry) => entry.id === input.campusId);
  if (!campus) {
    return { ok: false, message: 'Pick your school from the list.' };
  }

  const schoolName = input.schoolName.trim();
  if (campus.id === 'other' && schoolName.length < 3) {
    return { ok: false, message: 'Tell us the name of your school.' };
  }

  const emailError = validateEmail(input.email);
  if (emailError) {
    return { ok: false, message: emailError };
  }

  const email = input.email.trim().toLowerCase();
  const store = getDemandStore();

  let recorded: boolean;
  try {
    recorded = await store.record({
      campus_id: campus.id,
      school_name: campus.id === 'other' ? schoolName : null,
      email_hash: hashEmail(email),
      email: input.notify ? email : null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Genius Mining] recording campus interest failed: ${(error as Error).message}`);
    return { ok: false, message: 'We could not record that just now. Try again in a moment.' };
  }

  const count = await store.countFor(campus.id);

  // The threshold is the point at which the number is worth putting in front of
  // an administration, so crossing it is the one event worth an alert.
  if (recorded && count === DEMAND_THRESHOLD) {
    await sendOperatorAlert({
      severity: 'action_required',
      subject: `${campusName(campus.id)} hit ${DEMAND_THRESHOLD} students`,
      body: [
        `${count} students at ${campusName(campus.id)} have asked their school to cover Genius Mining.`,
        '',
        'That is the number we said we would take to an administration.',
      ].join('\n'),
    });
  }

  return { ok: true, count, alreadyAsked: !recorded };
}
