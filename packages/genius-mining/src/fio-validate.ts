import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import contract from '../assets/fio_output_contract.schema.json';
import { WORKING_WORDS } from './types';
import { stripCodeFences } from './validate';
import type { ValidationOutcome } from './validate';
import type { FioAnalysisResult, FioResult } from './fio-types';

/** The keys the FIO call is asked to return. The rest of the result is stamped by the host. */
export const FIO_ANALYSIS_KEYS = [
  'domains',
  'domain_confidence',
  'domain_evidence_thin',
  'thin_reason',
  'spectator_only',
  'for_the_mentor',
] as const;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const contractProperties = (contract as { properties: Record<string, unknown> }).properties;

/**
 * Derived from the contract rather than written out a second time, for the same
 * reason `validate.ts` does it: two hand-maintained copies of one shape is two
 * chances to disagree.
 */
const fioAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...FIO_ANALYSIS_KEYS],
  properties: Object.fromEntries(
    FIO_ANALYSIS_KEYS.map((key) => [key, contractProperties[key]])
  ),
};

const validateFioAnalysisFn: ValidateFunction = ajv.compile(fioAnalysisSchema);
const validateFioResultFn: ValidateFunction = ajv.compile(contract);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return ['Unknown validation failure.'];
  return errors.map((error) => {
    const path = error.instancePath || '(root)';
    return `${path} ${error.message ?? 'is invalid'}`.trim();
  });
}

/**
 * Rules the spec says to enforce in code rather than in documentation.
 *
 * These are not schema-expressible, and each one exists because of a specific
 * way the output goes wrong:
 *
 *  - More than one PRIMARY, or a PRIMARY with no C1/C3 support, turns the
 *    confidence field into decoration — every profile comes back confident.
 *  - A4 in source_items means the payload filter failed upstream. That is a
 *    build failure, not a finding, and it must never be rendered as one.
 *  - A working word appearing anywhere in the FIO output means the prompt has
 *    drifted and the two calls have started contradicting each other.
 */
export function checkFioRules(result: FioAnalysisResult): string[] {
  const errors: string[] = [];

  const primaries = result.domains.filter((domain) => domain.weight === 'PRIMARY');
  if (primaries.length > 1) {
    errors.push(`At most one domain may carry PRIMARY; got ${primaries.length}.`);
  }

  for (const primary of primaries) {
    const supported = primary.source_items.some(
      (item) => item === 'C1' || item === 'C3' || item.startsWith('C1.') || item.startsWith('C3.')
    );
    if (!supported) {
      errors.push(
        `PRIMARY on ${primary.domain_family} requires a C1-circled instance or C3 in source_items; got [${primary.source_items.join(', ')}].`
      );
    }
  }

  // Zero PRIMARY is legal, but it is not allowed to look confident.
  if (primaries.length === 0 && result.domain_confidence !== 'LOW') {
    errors.push('A result with no PRIMARY domain must report domain_confidence LOW.');
  }

  for (const domain of result.domains) {
    for (const item of domain.source_items) {
      if (item === 'A4' || item.startsWith('A4.')) {
        errors.push(
          `A4 appears in source_items for ${domain.domain_family}. The payload filter has failed — this is a build failure, not a finding.`
        );
      }
    }
  }

  const workingWordLeak = WORKING_WORDS.find((word) =>
    result.for_the_mentor.toUpperCase().includes(word)
  );
  if (workingWordLeak) {
    errors.push(
      `FIO output names the working word ${workingWordLeak}. The prompt has drifted; reject the response.`
    );
  }

  if (result.domain_evidence_thin && result.thin_reason.trim().length === 0) {
    errors.push('domain_evidence_thin is true but thin_reason is empty.');
  }

  return errors;
}

export function validateFioAnalysis(value: unknown): ValidationOutcome<FioAnalysisResult> {
  if (!validateFioAnalysisFn(value)) {
    return { ok: false, errors: formatErrors(validateFioAnalysisFn.errors) };
  }

  const typed = value as FioAnalysisResult;
  const ruleErrors = checkFioRules(typed);
  if (ruleErrors.length > 0) return { ok: false, errors: ruleErrors };

  return { ok: true, value: typed };
}

export function validateFioResult(value: unknown): ValidationOutcome<FioResult> {
  if (!validateFioResultFn(value)) {
    return { ok: false, errors: formatErrors(validateFioResultFn.errors) };
  }
  return { ok: true, value: value as FioResult };
}

/** Same fence-stripping tolerance as Call 1: the instruction is not sufficient on its own. */
export function parseFioResponse(raw: string): ValidationOutcome<FioAnalysisResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return {
      ok: false,
      errors: [`FIO response is not valid JSON: ${(error as Error).message}`],
    };
  }
  return validateFioAnalysis(parsed);
}

