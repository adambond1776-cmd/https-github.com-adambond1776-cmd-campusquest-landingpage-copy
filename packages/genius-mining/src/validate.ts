// The contract declares draft 2020-12, so it needs Ajv's 2020 build rather than
// the default draft-07 one.
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import contract from '../assets/profile_output_contract.schema.json';
import type { AnalysisResult, Profile } from './types';

/** The keys Engine 1 is asked to return. Everything else on a profile is stamped by the host. */
export const ANALYSIS_KEYS = [
  'primary_working_word',
  'evidence',
  'secondary_pattern',
  'disagreement_with_self_tally',
  'body_signal_read',
  'confidence',
  'thin_spots',
  'for_the_mentor',
] as const;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const contractProperties = (contract as { properties: Record<string, unknown> }).properties;

/**
 * Engine 1's output is a subset of the profile contract, so the sub-schema is
 * derived from the contract rather than written out a second time. Two
 * hand-maintained copies of the same shape is two chances to disagree.
 */
const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...ANALYSIS_KEYS],
  properties: Object.fromEntries(
    ANALYSIS_KEYS.map((key) => [key, contractProperties[key]])
  ),
};

const validateAnalysisFn: ValidateFunction = ajv.compile(analysisSchema);
const validateProfileFn: ValidateFunction = ajv.compile(contract);

export type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return ['Unknown validation failure.'];
  return errors.map((error) => {
    const path = error.instancePath || '(root)';
    return `${path} ${error.message ?? 'is invalid'}`.trim();
  });
}

/**
 * Models add markdown fences even when told not to, so strip them before parsing
 * rather than counting the instruction as sufficient.
 */
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * Parse and validate raw Engine 1 output.
 *
 * A failure here is a signal to retry the call once. It is never a signal to
 * hand-repair the JSON: a patched profile is a profile nobody can trace back to
 * what the model actually said.
 */
export function parseAnalysisResponse(raw: string): ValidationOutcome<AnalysisResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return {
      ok: false,
      errors: [`Response was not JSON: ${(error as Error).message}`],
    };
  }

  if (!validateAnalysisFn(parsed)) {
    return { ok: false, errors: formatErrors(validateAnalysisFn.errors) };
  }

  return { ok: true, value: parsed as AnalysisResult };
}

/** Validates a fully assembled profile against the output contract. */
export function validateProfile(profile: unknown): ValidationOutcome<Profile> {
  if (!validateProfileFn(profile)) {
    return { ok: false, errors: formatErrors(validateProfileFn.errors) };
  }
  return { ok: true, value: profile as Profile };
}

/**
 * The rendered profile must never quote back an answer the engine discounted as
 * too sparse. Every rendering runs through this before it puts evidence on screen.
 */
export function citesThinSpot(text: string, thinSpots: string[]): string | null {
  for (const spot of thinSpots) {
    // thin_spots entries look like "C2" or "A1#6"; match the field id at a token
    // boundary so "C2" does not fire on "C22".
    const fieldId = spot.split('#')[0];
    if (new RegExp(`\\b${fieldId}\\b`).test(text)) return spot;
  }
  return null;
}
