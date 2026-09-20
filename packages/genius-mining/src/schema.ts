import rawSchema from '../assets/questionnaire_schema_v1_3.json';
import type { Verb, WorkingWord } from './types';

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'date'
  | 'checkbox'
  | 'repeating_list'
  | 'repeating_structured_list'
  | 'repeating_single_select'
  | 'select_exactly_two'
  | 'single_select'
  | 'derived_single_select'
  | 'derived_lookup'
  | 'yes_no_with_followup';

export type ItemField = {
  id: string;
  type: 'short_text' | 'single_select';
  options?: string[];
};

export type SchemaField = {
  id: string;
  type: FieldType;
  required?: boolean;
  prompt?: string;
  note?: string;
  pattern?: string;
  sent_to_engine?: boolean;
  pii?: boolean;
  analysis_weight?: number;
  count?: number;
  item_type?: string;
  item_fields?: ItemField[];
  options?: string[];
  options_are_fixed?: boolean;
  options_source?: string;
  options_are_indices?: boolean;
  index_range?: [number, number];
  indexed_to?: string;
  verb_tagged?: boolean;
  gated_by?: string;
  default?: boolean;
  min_chars_soft_warning?: number;
  max_sentences?: number;
  shown_after?: string;
  followup_prompt?: string;
  lookup_table?: Record<string, string>;
  derived_from?: string[];
  computation?: string;
};

export type SchemaSection = {
  id: string;
  title: string;
  sitting: number;
  purpose_shown_to_student: string;
  prompt?: string;
  instruction_on_form?: string;
  fields: SchemaField[];
};

export type SupportResource = { name: string; contact: string };

export type Questionnaire = {
  instrument: string;
  version: string;
  owner: string;
  pages: number;
  sittings: number;
  identifier_field: string;
  identifier_format: string;
  rules: {
    sequential_only: boolean;
    allow_backtrack: boolean;
    reveal_section_D_before_ABC_complete: boolean;
    support_resources_block_always_rendered: boolean;
    profile_requires_student_signoff: boolean;
    estimated_minutes: number;
  };
  analysis_weighting: string[];
  verb_vocabulary: { verb: Verb; means: string; maps_to_working_word: WorkingWord }[];
  header_fields: SchemaField[];
  sections: SchemaSection[];
  closing_block: { id: string; always_rendered: boolean; content_summary: string[] };
  support_resources: {
    always_rendered: boolean;
    placement: string;
    may_be_collapsed: boolean;
    intro: string;
    entries: SupportResource[];
  };
};

export const questionnaire = rawSchema as unknown as Questionnaire;

export const INSTRUMENT_VERSION = questionnaire.version;

/** Section order is the form order. Sequential only, no backtracking. */
export const SECTION_IDS = questionnaire.sections.map((section) => section.id);

export function getSection(id: string): SchemaSection {
  const section = questionnaire.sections.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`No section ${id} in instrument v${questionnaire.version}.`);
  return section;
}

/** Every field in the instrument, header fields included, in document order. */
export function allFields(): SchemaField[] {
  return [...questionnaire.header_fields, ...questionnaire.sections.flatMap((s) => s.fields)];
}

export function getField(id: string): SchemaField {
  const field = allFields().find((candidate) => candidate.id === id);
  if (!field) throw new Error(`No field ${id} in instrument v${questionnaire.version}.`);
  return field;
}

/**
 * The field ids the engine is allowed to see, read off the `sent_to_engine`
 * flag. Deliberately derived rather than listed: a hand-written list drifts
 * away from the schema, and the thing it drifts into is a privacy incident.
 */
export function engineVisibleFieldIds(): string[] {
  return allFields()
    .filter((field) => field.sent_to_engine === true)
    .map((field) => field.id);
}

export function piiFieldIds(): string[] {
  return allFields()
    .filter((field) => field.pii === true)
    .map((field) => field.id);
}

/** How many A1 instances the instrument asks for. B and C1 are bound to this. */
export const A1_COUNT = getField('A1').count ?? 6;

export const VERB_VOCABULARY = questionnaire.verb_vocabulary;

export const SUPPORT_RESOURCES = questionnaire.support_resources;

export const CLOSING_BLOCK = questionnaire.closing_block;

export const PARTICIPANT_CODE_PATTERN = new RegExp(
  questionnaire.header_fields.find((field) => field.id === 'participant_code')?.pattern ??
    '^GM-[0-9]{3,}$'
);
