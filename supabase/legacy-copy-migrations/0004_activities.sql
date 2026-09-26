-- The activity directory: clubs, campus events, athletics fixtures, facilities,
-- and eventually places off campus.
--
-- One table rather than one per source. A student asking "what is on Thursday"
-- does not care that the hackathon came from the events calendar and the
-- volleyball game came from the athletics feed, and splitting them would leave
-- the directory and the Genius Mining pathway data to drift apart.

create table if not exists cq_activities (
  -- Source-prefixed and stable across syncs, e.g. `athletics:uri:vcal_11981`.
  id text primary key,
  campus_id text not null,
  kind text not null check (kind in ('organization', 'event', 'game', 'facility', 'place')),

  name text not null,
  summary text,
  categories text[] not null default '{}',
  scope text not null default 'on_campus' check (scope in ('on_campus', 'off_campus')),
  location text,
  url text,
  image_url text,

  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,

  -- Sport, home/away, opponent, and result. Null on everything but fixtures.
  athletics jsonb,

  source text not null check (source in ('localist', 'engage', 'athletics', 'curated', 'submitted')),
  source_ref text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),

  -- 'listed' is ingested and unconfirmed; only a person can grant 'verified',
  -- and only 'verified' rows are eligible to become recommendations.
  status text not null default 'listed'
    check (status in ('listed', 'verified', 'stale', 'pending', 'hidden')),
  verified_at timestamptz,
  verified_by text,

  -- The join to Genius Mining. The pathway data Engine 2 reads is a view over
  -- verified rows here, not a second copy of the same clubs.
  working_words text[] not null default '{}',
  low_commitment_entry boolean
);

comment on column cq_activities.status is
  'Ingested rows start listed. A person grants verified. Rows that vanish from their source decay to stale on their own.';
comment on column cq_activities.working_words is
  'Genius Mining tags. A re-sync never overwrites these once a human has set them.';
comment on column cq_activities.low_commitment_entry is
  'Whether a nervous first-timer can turn up once without committing. Null means unjudged, which is not the same as false.';

-- The directory always filters by campus and usually by kind and status.
create index if not exists cq_activities_campus_idx on cq_activities (campus_id, status, kind);
-- "What is on this week" is the most common query in the product.
create index if not exists cq_activities_starts_idx on cq_activities (campus_id, starts_at)
  where starts_at is not null;
-- The ingest job scopes existing rows to one source before reconciling.
create index if not exists cq_activities_source_idx on cq_activities (campus_id, source);

alter table cq_activities enable row level security;

-- The directory is public: a prospective student should be able to browse what
-- is happening before creating an account. Only listed and verified rows are
-- exposed, so pending submissions and operator-hidden rows stay invisible.
drop policy if exists "cq_activities public read" on cq_activities;
create policy "cq_activities public read"
  on cq_activities for select
  using (status in ('listed', 'verified'));

-- Writes belong to the ingest job and the review queue, both of which use the
-- service role and bypass RLS. No policy is granted for insert or update.
