-- Students asking their school to cover Genius Mining.
--
-- Not a mailing list. The row holds a hash of the email so one student's
-- repeated clicks collapse into one ask, and the address itself is stored only
-- when the student opted in to hearing the outcome. The public page shows counts
-- and nothing else.

create table if not exists gm_campus_interest (
  id           uuid primary key default gen_random_uuid(),
  campus_id    text not null,
  -- Free text, only when campus_id is 'other'.
  school_name  text,
  email_hash   text not null,
  -- Present only when the student asked to be told when their school signs up.
  email        text,
  created_at   timestamptz not null default now(),

  unique (campus_id, email_hash)
);

create index if not exists gm_campus_interest_campus_idx
  on gm_campus_interest (campus_id);

alter table gm_campus_interest enable row level security;

-- Writes go through a server action holding the service role key, so no anon or
-- authenticated policy is defined and RLS denies direct access. Counts are read
-- server-side for the same reason: a public select policy would expose the
-- hashes and the opted-in addresses.
