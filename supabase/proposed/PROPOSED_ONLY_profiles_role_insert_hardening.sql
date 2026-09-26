PROPOSED ONLY — DO NOT APPLY UNTIL PRODUCTION PROFILE CREATION IS AUDITED

This SQL is not a migration. Do not move it into supabase/migrations.
Do not apply it to the linked production database.

The production CampusQuest app, in another repository, may let a new user
choose faculty_staff while creating a profile. Applying this trigger before
that path is audited could store those new profiles with role null.

Existing profile rows would not be updated. The current BEFORE UPDATE trigger,
trg_block_profiles_role_escalation, would stay unchanged.

Intended behavior if this is later approved:

- A database session with no JWT, and service_role, may insert any allowed role.
- An authenticated insert may begin as student or null only.
- admin, super_admin, faculty_staff, qa, and beta_internal from an
  authenticated insert would be stored as null.
- The landing service-role profile shell omits role, so it would stay null.

create or replace function public.protect_profiles_role_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.jwt() is null or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if new.role is null or new.role = 'student' then
    return new;
  end if;

  new.role := null;
  return new;
end;
$$;

revoke all on function public.protect_profiles_role_on_insert() from public;
revoke all on function public.protect_profiles_role_on_insert() from anon;
revoke all on function public.protect_profiles_role_on_insert() from authenticated;

comment on function public.protect_profiles_role_on_insert() is
  'BEFORE INSERT guard. Authenticated clients may start a profile as student or null. Privileged roles require service_role or a database session with no JWT.';

drop trigger if exists trg_protect_profiles_role_on_insert on public.profiles;

create trigger trg_protect_profiles_role_on_insert
before insert on public.profiles
for each row
execute function public.protect_profiles_role_on_insert();
