'use client';

import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { ADULT_AGE, MINIMUM_AGE, bracketForBirthYear, type AgeBracket } from '@/lib/age';

/**
 * The age question, asked once during sign-up.
 *
 * Asked as a birth year rather than an "I am over 18" checkbox. A checkbox
 * records that someone clicked a checkbox; a year records what they told us,
 * which is the thing the rule actually turns on. It is still an attestation and
 * still easy to lie about — the point is that the answer is specific enough to
 * act on, so a 17-year-old who answers honestly gets the right experience
 * instead of being turned away at the door.
 *
 * Only the year is collected. A full date of birth is more identifying than the
 * rule needs.
 */

export type AgeAnswer = {
  birthYear: number | null;
  guardianName: string;
  guardianEmail: string;
};

export const EMPTY_AGE: AgeAnswer = { birthYear: null, guardianName: '', guardianEmail: '' };

export function bracketOf(answer: AgeAnswer): AgeBracket {
  return answer.birthYear ? bracketForBirthYear(answer.birthYear) : 'unknown';
}

/** Whether the form can be submitted with this answer. */
export function ageAnswerComplete(answer: AgeAnswer): boolean {
  const bracket = bracketOf(answer);
  if (bracket === 'adult') return true;
  if (bracket === 'minor') {
    return answer.guardianName.trim().length > 1 && /^\S+@\S+\.\S+$/.test(answer.guardianEmail);
  }
  return false;
}

function yearOptions(): number[] {
  const thisYear = new Date().getUTCFullYear();
  // Down to 70 covers returning and mature students; up to 13 lets someone too
  // young answer honestly and be told why, rather than guessing what we want.
  return Array.from({ length: 58 }, (_, i) => thisYear - 13 - i);
}

export default function AgeFields({
  value,
  onChange,
  disabled,
}: {
  value: AgeAnswer;
  onChange: (next: AgeAnswer) => void;
  disabled?: boolean;
}) {
  const bracket = bracketOf(value);

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="birth-year"
          className="block text-sm font-semibold text-white/80 mb-1.5"
        >
          What year were you born?
        </label>
        <select
          id="birth-year"
          value={value.birthYear ?? ''}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...value, birthYear: e.target.value ? Number(e.target.value) : null })
          }
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-brand-400 disabled:opacity-50"
        >
          <option value="" className="bg-brand-950">
            Select a year
          </option>
          {yearOptions().map((year) => (
            <option key={year} value={year} className="bg-brand-950">
              {year}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-white/40">
          The year only. We use it to work out what we are allowed to show you.
        </p>
      </div>

      {bracket === 'under_16' && (
        <div className="flex gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <div className="text-sm leading-relaxed text-red-100">
            <p className="font-semibold">CampusQuest is for students {MINIMUM_AGE} and over.</p>
            <p className="mt-1 text-red-100/80">
              We are sorry to turn you away. Come back when you are {MINIMUM_AGE} and your
              account will be waiting.
            </p>
          </div>
        </div>
      )}

      {bracket === 'minor' && (
        <div className="space-y-4 rounded-xl border border-gold-500/25 bg-gold-500/10 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
            <div className="text-sm leading-relaxed text-white/80">
              <p className="font-semibold text-white">
                We need a parent or guardian to say yes first.
              </p>
              <p className="mt-1 text-white/60">
                We will email them a link. Your account opens as soon as they follow it —
                you will get an email too. Until then you can sign in but the directory
                stays locked.
              </p>
              <p className="mt-2 text-white/60">
                Genius Mining and paid plans are {ADULT_AGE}+, so you will start on the
                free plan.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="guardian-name"
                className="block text-sm font-semibold text-white/80 mb-1.5"
              >
                Their name
              </label>
              <input
                id="guardian-name"
                type="text"
                value={value.guardianName}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guardianName: e.target.value })}
                placeholder="Alex Rivera"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="guardian-email"
                className="block text-sm font-semibold text-white/80 mb-1.5"
              >
                Their email
              </label>
              <input
                id="guardian-email"
                type="email"
                value={value.guardianEmail}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, guardianEmail: e.target.value })}
                placeholder="parent@example.com"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand-400 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
