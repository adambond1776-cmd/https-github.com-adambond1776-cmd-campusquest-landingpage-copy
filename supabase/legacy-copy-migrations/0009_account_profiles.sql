-- Server-owned account profile for CampusQuest verification, role, and plan.
--
-- Supabase Auth user_metadata is editable by the signed-in user. It must not
-- decide whether a campus email is verified, which role the account has, or
-- whether any paid plan was granted. This table is the source of those facts.
--
-- Do not apply this file from the handoff. Review it, then run it only against
-- the intended Supabase project.

-- ---------------------------------------------------------------------------
-- cq_accounts
--
-- One row per Auth user. Interests stay in user_metadata; they are preferences,
-- not authorization. plan is recorded as free by signup. Paid access is not
-- granted by writing this column from the client, and the application does not
-- treat a non-free value here as an entitlement.
-- ---------------------------------------------------------------------------

create table if not exists public.cq_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('student', 'organization')),
  plan text not null default 'free' check (plan in ('free', 'basic', 'premium', 'club')),
  campus_email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cq_accounts is
  'Server-owned verification, role, and signup plan. Clients may read their own row. They cannot insert, update, or delete it.';
comment on column public.cq_accounts.campus_email_verified_at is
  'Set only by the service role after the 6-digit campus code is consumed. Null means unverified.';
comment on column public.cq_accounts.role is
  'student or organization, chosen at account creation and not changeable by the user.';
comment on column public.cq_accounts.plan is
  'Signup selection stored for display. Not a payment entitlement. Signup writes free.';

create unique index if not exists cq_accounts_email_lower_idx
  on public.cq_accounts (lower(email));

alter table public.cq_accounts enable row level security;

revoke all on table public.cq_accounts from anon, authenticated;
grant select on table public.cq_accounts to authenticated;
grant all on table public.cq_accounts to service_role;

drop policy if exists cq_accounts_select_own on public.cq_accounts;

create policy cq_accounts_select_own
  on public.cq_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert, update, or delete policy. The service role bypasses RLS and is
-- the only writer. A signed-in user cannot mark themselves verified, change
-- their role, or grant themselves a plan.

-- ---------------------------------------------------------------------------
-- Exact Auth lookup
--
-- listUsers pagination treats an API error like "no such user" and stops after
-- a fixed page cap. This function answers one email or fails as a database
-- error, which the application must not turn into account creation.
-- ---------------------------------------------------------------------------

create or replace function public.cq_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.cq_auth_user_id_by_email(text) from public;
revoke all on function public.cq_auth_user_id_by_email(text) from anon;
revoke all on function public.cq_auth_user_id_by_email(text) from authenticated;
grant execute on function public.cq_auth_user_id_by_email(text) to service_role;

comment on function public.cq_auth_user_id_by_email(text) is
  'Service-role lookup of auth.users.id by email. Returns null when nobody has that address. Errors must fail closed.';

-- Defense in depth: deleting the Auth user also removes that user's codes,
-- even if the application cleanup step is skipped. The application still
-- deletes these rows itself so a failure is visible before the login is removed.
alter table public.cq_email_verification_challenges
  drop constraint if exists cq_email_verif_user_fk;

alter table public.cq_email_verification_challenges
  add constraint cq_email_verif_user_fk
  foreign key (user_id) references auth.users (id) on delete cascade;
