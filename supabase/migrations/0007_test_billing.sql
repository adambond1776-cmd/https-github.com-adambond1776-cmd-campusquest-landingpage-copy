-- TEST ONLY. Apply to a separate test Supabase project, never as a launch action.
-- No client-controlled profile field confers access. These rows only bind an
-- authenticated account to a Stripe test customer. Stripe is authoritative.
create table if not exists public.cq_test_billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique,
  lock_token uuid,
  lock_until timestamptz
);
alter table public.cq_test_billing enable row level security;
revoke all on public.cq_test_billing from anon, authenticated;
grant all on public.cq_test_billing to service_role;

-- A cross-process lease prevents concurrent checkout/cancellation mutations.
create or replace function public.cq_lock_test_billing(p_user uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into cq_test_billing(user_id) values(p_user) on conflict do nothing;
  update cq_test_billing set lock_token = p_token, lock_until = now() + interval '300 seconds'
    where user_id = p_user and (lock_until is null or lock_until < now());
  return found;
end;
$$;
revoke all on function public.cq_lock_test_billing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cq_lock_test_billing(uuid, uuid) to service_role;
