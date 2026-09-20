-- Genius Mining storage.
--
-- Answers are keyed on participant_code and hold no name. Identity lives on
-- auth.users via user_id; this table holds responses. Keeping the two apart is
-- what makes the name-strip structural rather than a step someone remembers.
--
-- The question data is JSONB rather than a column per field. The instrument is
-- on v1.3 and will keep moving, and a migration per question edit is a migration
-- nobody will write.

create extension if not exists pgcrypto;

-- GM-001 through GM-099 are reserved for the paper runs, so digital sign-ups
-- start at GM-100. A sequence rather than max()+1 so two students signing up at
-- the same moment cannot be handed the same code.
create sequence if not exists gm_participant_seq start with 100 increment by 1;

create table if not exists gm_sessions (
  participant_code    text primary key,
  user_id             uuid references auth.users (id) on delete set null,
  campus_id           text not null default 'uri',
  instrument_version  text not null,

  -- { accepted_at, copy_version } — recorded on affirmative action only.
  consent             jsonb,

  responses           jsonb not null default '{}'::jsonb,
  progress            jsonb not null default '{}'::jsonb,

  -- How D1 came out, stored apart from the student's own tiebreak pick so a thin
  -- tally is never mistaken for a clean count.
  d1_resolution       jsonb,

  profile             jsonb,

  -- One included analysis, paid restarts, and the two-call ceiling.
  ledger              jsonb not null,

  -- Drives the purge job. See consent_and_retention_copy.md.
  retention           jsonb not null,

  subscription        jsonb not null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists gm_sessions_user_id_idx on gm_sessions (user_id);

-- The retention job scans on these two.
create index if not exists gm_sessions_lapsed_idx
  on gm_sessions ((retention ->> 'lapsed_at'))
  where retention ->> 'lapsed_at' is not null;

create index if not exists gm_sessions_membership_idx
  on gm_sessions ((retention ->> 'membership_status'));

-- Only accepted or filed profiles enter reporting.
create index if not exists gm_sessions_status_idx on gm_sessions ((profile ->> 'status'));

create or replace function gm_next_participant_code()
returns text
language sql
volatile
as $$
  select 'GM-' || lpad(nextval('gm_participant_seq')::text, 3, '0');
$$;

create or replace function gm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gm_sessions_touch on gm_sessions;
create trigger gm_sessions_touch
  before update on gm_sessions
  for each row execute function gm_touch_updated_at();

-- The instrument-development corpus.
--
-- Outlives the student's account on purpose, which the consent screen states
-- plainly. What makes that defensible is that it genuinely cannot be walked back
-- to a person: the key is a random corpus id, not the participant code, and
-- there is no foreign key to auth.users.
create table if not exists gm_corpus (
  corpus_id   text primary key,
  record      jsonb not null,
  written_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table gm_sessions enable row level security;
alter table gm_corpus enable row level security;

-- A student reads and writes their own answers and nothing else.
drop policy if exists gm_sessions_select_own on gm_sessions;
create policy gm_sessions_select_own on gm_sessions
  for select using (auth.uid() = user_id);

drop policy if exists gm_sessions_insert_own on gm_sessions;
create policy gm_sessions_insert_own on gm_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists gm_sessions_update_own on gm_sessions;
create policy gm_sessions_update_own on gm_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Students never delete their own row directly. Deletion runs through the
-- retention job, which de-identifies first and alerts if that step fails.
-- No delete policy is defined, so no anon or authenticated role can delete.

-- The corpus is service-role only. Nobody reads it through the API.
-- No policies are defined, so RLS denies every anon and authenticated request.
