import {
  A1_COUNT,
  VERBS,
  getSection,
  type QuestionnaireResponses,
} from '@hiddengeniuslabs/genius-mining';

export type FieldErrors = Record<string, string>;

export type SectionValidation = {
  ok: boolean;
  errors: FieldErrors;
  /** Non-blocking nudges. C3 soft-warns on a short answer and never hard-blocks. */
  warnings: FieldErrors;
};

type Values = Partial<QuestionnaireResponses>;

const blank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/**
 * Validates one section against the instrument.
 *
 * Required means required, with two deliberate exceptions. A4 is optional and
 * stays optional. C3's length is a soft warning only: the brief is explicit that
 * a thin answer degrades the reading but must never hard-block, because the
 * students most likely to write a thin C3 are the ones a hard block would push
 * out of the instrument entirely.
 */
export function validateSection(sectionId: string, values: Values): SectionValidation {
  const section = getSection(sectionId);
  const errors: FieldErrors = {};
  const warnings: FieldErrors = {};

  for (const field of section.fields) {
    switch (field.id) {
      case 'A1': {
        const items = values.A1 ?? [];
        const filled = items.filter((item) => !blank(item?.text));
        if (filled.length < A1_COUNT) {
          errors.A1 = `All ${A1_COUNT} need something written in them. You have ${filled.length}.`;
        }
        break;
      }

      case 'A4': {
        // Optional by design. A partially filled row is still a mistake worth naming.
        for (const [index, entry] of (values.A4 ?? []).entries()) {
          const started = !blank(entry?.activity);
          if (started && (!entry.mode || !entry.social || !entry.setting)) {
            errors.A4 = `Row ${index + 1} needs all three tags: do or watch, alone or with others, indoors or outside.`;
            break;
          }
        }
        break;
      }

      case 'A4_consent':
        break;

      case 'B': {
        const tags = values.B ?? [];
        const tagged = tags.filter((tag) => tag && VERBS.includes(tag.verb));
        if (tagged.length < A1_COUNT) {
          errors.B = `Every one of your ${A1_COUNT} instances needs a verb. You have tagged ${tagged.length}.`;
        }
        break;
      }

      case 'C1': {
        const picked = values.C1 ?? [];
        if (picked.length !== 2) {
          errors.C1 = 'Pick exactly two.';
        }
        break;
      }

      case 'C3': {
        if (blank(values.C3)) {
          errors.C3 = 'This one carries the most weight in the whole questionnaire. Have a go.';
        } else {
          const length = (values.C3 ?? '').trim().length;
          const threshold = field.min_chars_soft_warning ?? 200;
          if (length < threshold) {
            warnings.C3 =
              'This is the answer the analysis leans on hardest. A thin answer here makes the whole reading weaker. Anything else you remember about your hands, your eyes, or what you were saying will help.';
          }
        }
        break;
      }

      case 'D1':
      case 'D2':
        // Computed from Section B, not typed by the student.
        break;

      case 'D3': {
        if (blank(values.D3)) {
          errors.D3 = 'Write the sentence that says it better.';
        }
        break;
      }

      case 'E3': {
        const e3 = values.E3;
        if (e3?.answer === 'YES' && blank(e3.which_question)) {
          warnings.E3 = 'Which question was it? You can leave this blank.';
        }
        break;
      }

      default: {
        if (field.required && blank((values as Record<string, unknown>)[field.id])) {
          errors[field.id] = 'This one is required.';
        }
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
