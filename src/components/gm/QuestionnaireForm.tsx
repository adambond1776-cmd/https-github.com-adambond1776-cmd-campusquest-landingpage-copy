'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Cloud, Loader2, PauseCircle } from 'lucide-react';
import {
  SECTION_IDS,
  applyStudentTiebreak,
  getSection,
  needsStudentTiebreak,
  questionnaire,
  resolveD1,
  type QuestionnaireResponses,
  type Verb,
} from '@hiddengeniuslabs/genius-mining';
import FormAlert from '@/components/FormAlert';
import SupportResources from '@/components/gm/SupportResources';
import SectionA from '@/components/gm/sections/SectionA';
import SectionB from '@/components/gm/sections/SectionB';
import SectionC from '@/components/gm/sections/SectionC';
import SectionD from '@/components/gm/sections/SectionD';
import SectionE from '@/components/gm/sections/SectionE';
import { chooseTiebreak, saveDraft, submitSection } from '@/app/genius-mining/actions';
import { validateSection } from '@/lib/gm/section-validation';

const AUTOSAVE_DELAY_MS = 1500;
const LAST_SECTION = SECTION_IDS[SECTION_IDS.length - 1];

type SaveState = 'idle' | 'saving' | 'saved';

export type QuestionnaireFormProps = {
  initialValues: Partial<QuestionnaireResponses>;
  initialSection: string;
  completedSections: string[];
  isDevIdentity: boolean;
};

export default function QuestionnaireForm({
  initialValues,
  initialSection,
  completedSections,
  isDevIdentity,
}: QuestionnaireFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<Partial<QuestionnaireResponses>>(initialValues);
  const [sectionId, setSectionId] = useState(initialSection);
  const [completed, setCompleted] = useState<string[]>(completedSections);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Which set of soft warnings the student has already been shown. A warning
  // that never reaches the screen is the same as no warning at all, so the first
  // submit that raises one stops to display it. The second submit goes through.
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [tiebreakChoice, setTiebreakChoice] = useState<Verb | null>(null);
  const [submitting, startSubmit] = useTransition();

  const section = getSection(sectionId);
  const sectionIndex = SECTION_IDS.indexOf(sectionId);
  const isFinalSection = sectionId === LAST_SECTION;

  /**
   * D1 is recomputed from the live answers rather than read from a snapshot, so
   * it always matches what the server stores. The student's tiebreak pick is
   * layered on top and never overwrites how the count came out.
   */
  const d1Resolution = useMemo(() => {
    if (!values.B?.length) return null;
    const base = resolveD1(values.B, values.C1 ?? []);
    if (tiebreakChoice && needsStudentTiebreak(base)) {
      try {
        return applyStudentTiebreak(base, tiebreakChoice);
      } catch {
        return base;
      }
    }
    return base;
  }, [values.B, values.C1, tiebreakChoice]);

  /* ---------------------------------------------------------------- *
   * Autosave
   * ---------------------------------------------------------------- */

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const set = useCallback((patch: Partial<QuestionnaireResponses>) => {
    dirty.current = true;
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!dirty.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState('saving');
      await saveDraft(values);
      dirty.current = false;
      setSaveState('saved');
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values]);

  // A backgrounded tab on a phone is the most likely way to lose a long C3
  // answer, so flush whatever is pending as soon as the page is hidden.
  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      void saveDraft(values);
      dirty.current = false;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [values]);

  /* ---------------------------------------------------------------- *
   * Submit
   * ---------------------------------------------------------------- */

  const handleTiebreak = async (verb: Verb) => {
    const result = await chooseTiebreak(verb);
    if (result.ok) setTiebreakChoice(verb);
    return { ok: result.ok, message: result.ok ? undefined : result.message };
  };

  const handleSubmit = () => {
    const cleaned: Partial<QuestionnaireResponses> = { ...values };
    if (sectionId === 'A') {
      cleaned.A4 = (values.A4 ?? []).filter((row) => row.activity.trim() !== '');
    }

    const validation = validateSection(sectionId, cleaned);
    setWarnings(validation.warnings);

    if (!validation.ok) {
      setErrors(validation.errors);
      setFormError('Some answers still need attention.');
      return;
    }

    if (sectionId === 'D' && d1Resolution && needsStudentTiebreak(d1Resolution)) {
      setFormError('Pick which verb is closer before moving on.');
      return;
    }

    setErrors({});
    setFormError(null);

    // Hold once on a soft warning so it is actually read. This is not a block:
    // pressing again continues with the answer exactly as written, which is the
    // whole point of C3 warning rather than refusing.
    const raised = Object.keys(validation.warnings).sort().join(',');
    if (raised !== '' && acknowledged !== raised) {
      setAcknowledged(raised);
      return;
    }

    startSubmit(async () => {
      const result = await submitSection(sectionId, cleaned);

      if (!result.ok) {
        setErrors(result.errors ?? {});
        setFormError(result.message);
        return;
      }

      dirty.current = false;
      setValues(cleaned);
      setAcknowledged(null);
      setWarnings({});

      const nextCompleted = completed.includes(sectionId) ? completed : [...completed, sectionId];
      setCompleted(nextCompleted);

      if (sectionId === LAST_SECTION) {
        router.push('/genius-mining/profile');
        return;
      }

      setSectionId(SECTION_IDS[sectionIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  const sittingChanges =
    sectionIndex > 0 && getSection(SECTION_IDS[sectionIndex - 1]).sitting !== section.sitting;

  const raisedWarnings = Object.keys(warnings).sort().join(',');
  const holdingOnWarning = raisedWarnings !== '' && acknowledged === raisedWarnings;

  return (
    <div className="space-y-8">
      <nav aria-label="Progress" className="flex items-center gap-1.5">
        {SECTION_IDS.map((id) => {
          const isDone = completed.includes(id);
          const isCurrent = id === sectionId;
          return (
            <div
              key={id}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex h-1.5 flex-1 items-center rounded-full ${
                isDone ? 'bg-brand-600' : isCurrent ? 'bg-brand-400' : 'bg-cream-300'
              }`}
              title={`Section ${id}`}
            />
          );
        })}
      </nav>

      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">
            Section {section.id} of {SECTION_IDS.length} · {section.title}
          </p>
          <p className="text-xs text-brand-500">
            Sitting {section.sitting} of {questionnaire.sittings}
          </p>
        </div>
        <p className="mt-3 text-lg leading-relaxed text-brand-800">
          {section.purpose_shown_to_student}
        </p>
      </header>

      {sittingChanges ? (
        <p className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          This is the start of the second sitting. Everything before this is saved.
        </p>
      ) : null}

      {formError ? <FormAlert message={formError} /> : null}

      <div>
        {sectionId === 'A' ? (
          <SectionA values={values} set={set} errors={errors} warnings={warnings} />
        ) : null}
        {sectionId === 'B' ? (
          <SectionB values={values} set={set} errors={errors} warnings={warnings} />
        ) : null}
        {sectionId === 'C' ? (
          <SectionC values={values} set={set} errors={errors} warnings={warnings} />
        ) : null}
        {sectionId === 'D' ? (
          <SectionD
            values={values}
            set={set}
            errors={errors}
            warnings={warnings}
            d1Resolution={d1Resolution}
            onTiebreak={handleTiebreak}
          />
        ) : null}
        {sectionId === 'E' ? (
          <SectionE values={values} set={set} errors={errors} warnings={warnings} />
        ) : null}
      </div>

      {/* Final page of every version, never collapsed. */}
      {isFinalSection ? <SupportResources /> : null}

      <div className="sticky bottom-0 -mx-5 border-t border-cream-300 bg-cream-50/95 px-5 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-brand-500" aria-live="polite">
            {saveState === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving
              </>
            ) : saveState === 'saved' ? (
              <>
                <Cloud className="h-3.5 w-3.5" aria-hidden />
                Saved. You can close this and come back.
              </>
            ) : (
              <>
                <PauseCircle className="h-3.5 w-3.5" aria-hidden />
                Your answers save as you type.
              </>
            )}
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving section {section.id}
              </>
            ) : holdingOnWarning ? (
              <>
                Continue anyway
                <ArrowRight className="h-4 w-4" />
              </>
            ) : isFinalSection ? (
              <>
                Finish and run the analysis
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Finish section {section.id}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {holdingOnWarning ? (
          <p className="mt-2.5 text-xs font-medium text-gold-600">
            There is a note above worth reading first. Nothing is wrong — press again to continue
            with your answer as it is.
          </p>
        ) : null}

        <p className="mt-2.5 text-xs text-brand-400">
          Once a section is submitted it stays submitted — you cannot come back and change it. That
          is deliberate: seeing what comes next would change how you answer this.
        </p>

        {isDevIdentity ? (
          <p className="mt-2 text-xs font-medium text-gold-600">
            Dev mode: no Supabase project is configured, so this session lives in a cookie and a
            temp file rather than your account.
          </p>
        ) : null}
      </div>
    </div>
  );
}
