-- Separate what a student is entitled to from what they are being charged.
--
-- The 30-day deletion clock used to read the Stripe subscription directly. That
-- is wrong the moment an institution buys a seat: the student's own card gets
-- cancelled, Stripe emits `customer.subscription.deleted`, and a clock keyed to
-- billing reads that as abandonment and schedules their answers for deletion on
-- the day their school started paying for them.
--
-- Coverage and grants live beside the subscription so the clock can read all
-- three. See packages/genius-mining/src/entitlement.ts.

alter table gm_sessions
  add column if not exists coverage jsonb,
  add column if not exists admin_grant jsonb;

comment on column gm_sessions.coverage is
  'Institutional seat: { campus_id, covers_genius_mining, starts_at, ends_at }. Buys the instrument at the Basic level, not the social layer.';

comment on column gm_sessions.admin_grant is
  'Hand-granted access: { reason, granted_by, ends_at }. Support cases, paper participants, and testing.';

-- The admin dashboard counts covered students per campus.
create index if not exists gm_sessions_coverage_campus_idx
  on gm_sessions ((coverage ->> 'campus_id'))
  where coverage is not null;
