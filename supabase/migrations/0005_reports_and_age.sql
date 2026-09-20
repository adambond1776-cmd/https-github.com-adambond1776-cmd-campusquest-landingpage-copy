-- Student corrections to the directory, and the age record that decides what an
-- account may reach.

-- ---------------------------------------------------------------------------
-- Directory corrections
--
-- The only mechanism that keeps a campus directory alive. Feeds know which
-- clubs are registered; they never know which ones stopped meeting in March.
-- ---------------------------------------------------------------------------

create table if not exists cq_activity_reports (
  id text primary key default ('rep_' || gen_random_uuid()::text),
  campus_id text not null,
  -- Null for a 'missing' report, which by definition has no row yet.
  activity_id text references cq_activities (id) on delete set null,
  kind text not null check (kind in ('defunct', 'details_wrong', 'still_active', 'missing')),
  detail text not null,
  suggested_name text,

  -- A hash, not a mailing list. Deduplicating and rate limiting one student
  -- needs a stable key; the address itself is kept only on opt-in.
  reporter_hash text not null,
  reporter_email text,
  created_at timestamptz not null default now(),

  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'duplicate')),
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text,
  -- Whether this confirmation has already been counted toward a free month.
  credited boolean not null default false
);

comment on table cq_activity_reports is
  'A report never changes a listing by itself. One student must not be able to delist a rival society, and a hundred students saying the same thing can be one person with a hundred addresses.';
comment on column cq_activity_reports.credited is
  'Credit lands on a confirmed report, never on submission, so a fabricated report costs time and earns nothing.';

-- One student's ledger, and the duplicate check on submission.
create index if not exists cq_reports_reporter_idx
  on cq_activity_reports (reporter_hash, status);
-- The review queue, oldest first.
create index if not exists cq_reports_queue_idx
  on cq_activity_reports (campus_id, status, created_at);

-- A student may not file the same complaint about the same listing twice.
-- Rejected reports are excluded so a corrected resubmission is still possible.
create unique index if not exists cq_reports_no_duplicates
  on cq_activity_reports (reporter_hash, activity_id, kind)
  where status <> 'rejected' and activity_id is not null;

alter table cq_activity_reports enable row level security;
-- No policy: reports are written and read by the service role only. A student
-- seeing other students' reports would turn the queue into a noticeboard.

-- ---------------------------------------------------------------------------
-- Age and guardian consent
--
-- Its own table rather than a column on gm_sessions, because the gate applies
-- to every account and most accounts never touch the instrument. An under-18
-- with guardian consent gets the activity directory and nothing else.
-- ---------------------------------------------------------------------------

create table if not exists cq_age_records (
  -- Keyed by hash so the table can be joined without holding a second copy of
  -- every address. The address itself is kept only while it is needed to reach
  -- a guardian.
  email_hash text primary key,
  email text,

  -- Year, not date. The year is enough to apply the rule and a full date of
  -- birth is more identifying than we need.
  birth_year integer check (birth_year is null or birth_year between 1900 and 2100),
  bracket text not null check (bracket in ('adult', 'minor', 'under_16', 'unknown')),
  attested_at timestamptz not null default now(),

  -- Guardian name, address, hashed token, expiry, and when they consented.
  guardian jsonb,

  updated_at timestamptz not null default now()
);

comment on table cq_age_records is
  'The age gate is per capability, not per site. A 16 or 17 year old with guardian consent can browse the directory; Genius Mining and billing stay adults-only regardless.';
comment on column cq_age_records.guardian is
  'Stores a SHA-256 of the emailed token, never the token. Consent is live once given and not withdrawn; the expiry bounds how long a guardian has to respond, not how long consent lasts.';

-- Guardian requests that were emailed and never answered, so they can be
-- chased or expired instead of sitting open forever.
create index if not exists cq_age_guardian_pending_idx
  on cq_age_records ((guardian ->> 'consented_at'))
  where guardian is not null;

-- Looking up a pending consent by its token hash when a guardian follows the link.
create index if not exists cq_age_token_idx
  on cq_age_records ((guardian ->> 'token_hash'))
  where guardian is not null;

alter table cq_age_records enable row level security;
-- No policy: written and read by the service role only.
