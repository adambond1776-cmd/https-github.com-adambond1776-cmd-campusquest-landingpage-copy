-- CampusQuest landing-page 6-digit email verification.
-- Supabase Auth remains the session authority. Codes are hashed; the plaintext
-- code is emailed via Resend and never stored.
-- This is a Postgres table, not a Supabase Storage bucket.

create table if not exists cq_email_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  consumed_at timestamptz,
  invalidated_at timestamptz
);

create index if not exists cq_email_verif_user_created_idx
  on cq_email_verification_challenges (user_id, created_at desc);

create index if not exists cq_email_verif_active_idx
  on cq_email_verification_challenges (user_id, expires_at)
  where consumed_at is null and invalidated_at is null;

alter table cq_email_verification_challenges enable row level security;
-- No anon/authenticated policies. Ordinary clients cannot read hashes.
-- Service role bypasses RLS for server-side send/verify.
grant all on table cq_email_verification_challenges to service_role;

create or replace function public.increment_cq_email_challenge_attempts(p_id uuid)
returns integer
language plpgsql
as $$
declare
  next_attempts integer;
begin
  update cq_email_verification_challenges
  set attempts = attempts + 1
  where id = p_id
    and consumed_at is null
    and invalidated_at is null
  returning attempts into next_attempts;
  return coalesce(next_attempts, 0);
end;
$$;

revoke all on function public.increment_cq_email_challenge_attempts(uuid) from public;
revoke all on function public.increment_cq_email_challenge_attempts(uuid) from anon;
revoke all on function public.increment_cq_email_challenge_attempts(uuid) from authenticated;
grant execute on function public.increment_cq_email_challenge_attempts(uuid) to service_role;

create or replace function public.consume_cq_email_challenge(
  p_id uuid,
  p_user_id uuid,
  p_code_hash text,
  p_now timestamptz default now()
) returns boolean
language plpgsql
as $$
declare
  consumed_id uuid;
begin
  update cq_email_verification_challenges
  set consumed_at = p_now
  where id = p_id
    and user_id = p_user_id
    and code_hash = p_code_hash
    and consumed_at is null
    and invalidated_at is null
    and expires_at > p_now
  returning id into consumed_id;

  return consumed_id is not null;
end;
$$;

revoke all on function public.consume_cq_email_challenge(uuid, uuid, text, timestamptz) from public;
revoke all on function public.consume_cq_email_challenge(uuid, uuid, text, timestamptz) from anon;
revoke all on function public.consume_cq_email_challenge(uuid, uuid, text, timestamptz) from authenticated;
grant execute on function public.consume_cq_email_challenge(uuid, uuid, text, timestamptz) to service_role;
