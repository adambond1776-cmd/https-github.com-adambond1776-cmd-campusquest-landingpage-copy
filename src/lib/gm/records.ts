import {
  initialAnalysisLedger,
  initialRetentionState,
  type AdminGrant,
  type AnalysisLedger,
  type D1Resolution,
  type InstitutionalCoverage,
  type Profile,
  type QuestionnaireResponses,
  type RetentionState,
  type SubscriptionSnapshot,
} from '@hiddengeniuslabs/genius-mining';

export const CONSENT_COPY_VERSION = 'consent_and_retention_copy@2026-09-01';

export type ConsentRecord = {
  accepted_at: string;
  copy_version: string;
};

export type Sitting = {
  started_at: string;
  last_saved_at: string;
};

export type Progress = {
  /** Sections the student has submitted. Sequential; there is no going back. */
  completed_sections: string[];
  current_section: string;
  sittings: Sitting[];
};

/**
 * One student's Genius Mining record.
 *
 * Keyed on `participant_code`, and holds no name. Identity lives on the account
 * (`user_id`); this row holds answers. Keeping the two apart is what makes the
 * name-strip structural rather than a step someone has to remember.
 */
export type GeniusMiningRecord = {
  participant_code: string;
  user_id: string | null;
  campus_id: string;
  instrument_version: string;
  consent: ConsentRecord | null;
  responses: Partial<QuestionnaireResponses>;
  progress: Progress;
  d1_resolution: D1Resolution | null;
  profile: Profile | null;
  ledger: AnalysisLedger;
  retention: RetentionState;
  subscription: SubscriptionSnapshot;
  /**
   * A seat the student's school bought for them, if any.
   *
   * Held alongside the subscription rather than folded into it, because the two
   * change independently and the retention clock has to read both. A covered
   * student can cancel their card without losing anything.
   */
  coverage: InstitutionalCoverage | null;
  /** Named for the column: `grant` is reserved in Postgres. */
  admin_grant: AdminGrant | null;
  created_at: string;
  updated_at: string;
};

export function emptyProgress(firstSection: string): Progress {
  const now = new Date().toISOString();
  return {
    completed_sections: [],
    current_section: firstSection,
    sittings: [{ started_at: now, last_saved_at: now }],
  };
}

export function newRecord(options: {
  participantCode: string;
  userId: string | null;
  campusId: string;
  instrumentVersion: string;
  firstSection: string;
  subscription?: SubscriptionSnapshot;
}): GeniusMiningRecord {
  const now = new Date().toISOString();

  return {
    participant_code: options.participantCode,
    user_id: options.userId,
    campus_id: options.campusId,
    instrument_version: options.instrumentVersion,
    consent: null,
    responses: {},
    progress: emptyProgress(options.firstSection),
    d1_resolution: null,
    profile: null,
    ledger: initialAnalysisLedger(),
    retention: initialRetentionState(),
    subscription: options.subscription ?? { tier: 'free', status: 'none' },
    coverage: null,
    admin_grant: null,
    created_at: now,
    updated_at: now,
  };
}
