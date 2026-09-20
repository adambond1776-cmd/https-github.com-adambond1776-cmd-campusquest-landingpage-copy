-- TEST PROJECT ONLY. Builds on the existing auth, directory and test billing.
-- No direct client writes: server actions check identity, ownership and billing.
create table public.cq_clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  campus_id text not null,
  contact_email text not null,
  content jsonb not null,
  owner_approved boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  version integer not null default 1,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.cq_club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.cq_clubs(id) on delete cascade,
  content jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','canceled','hidden')),
  version integer not null default 1,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.cq_club_events(club_id);
create table public.cq_club_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.cq_clubs(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  email text not null,
  message text not null check (length(message) <= 1000),
  consent_version text not null default 'club-contact-v1' check (consent_version = 'club-contact-v1'),
  consented_at timestamptz not null default now(),
  notification_status text not null default 'preview' check (notification_status in ('preview','simulated_sent','simulated_failed')),
  notification_attempts integer not null default 0,
  last_attempt_at timestamptz,
  unique(club_id, requester_id)
);
create index on public.cq_club_requests(requester_id, consented_at);
create table public.cq_club_test_billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique,
  lock_token uuid,
  lock_until timestamptz
);

alter table public.cq_clubs enable row level security;
alter table public.cq_club_events enable row level security;
alter table public.cq_club_requests enable row level security;
alter table public.cq_club_test_billing enable row level security;
revoke all on public.cq_clubs, public.cq_club_events, public.cq_club_requests, public.cq_club_test_billing from anon, authenticated;
grant all on public.cq_clubs, public.cq_club_events, public.cq_club_requests, public.cq_club_test_billing to service_role;

create function public.cq_lock_club_test_billing(p_user uuid, p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into cq_club_test_billing(user_id) values(p_user) on conflict do nothing;
  update cq_club_test_billing set lock_token=p_token, lock_until=now()+interval '300 seconds'
    where user_id=p_user and (lock_until is null or lock_until<now());
  return found;
end;
$$;
revoke all on function public.cq_lock_club_test_billing(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cq_lock_club_test_billing(uuid,uuid) to service_role;

-- Deduplication and rate limiting happen under one per-requester transaction lock.
-- p_email comes from verified auth, never from a submitted address.
create function public.cq_request_club_join(p_club uuid,p_user uuid,p_name text,p_email text,p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare existing uuid; saved uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  if not exists(select 1 from cq_clubs where id=p_club and owner_approved and status='approved') then
    raise exception 'Club is not accepting requests';
  end if;
  select id into existing from cq_club_requests where club_id=p_club and requester_id=p_user;
  if existing is not null then return existing; end if;
  if (select count(*) from cq_club_requests where requester_id=p_user and consented_at>now()-interval '24 hours')>=5 then
    raise exception 'Daily request limit reached';
  end if;
  insert into cq_club_requests(club_id,requester_id,name,email,message)
    values(p_club,p_user,p_name,p_email,p_message) returning id into saved;
  return saved;
end;
$$;
revoke all on function public.cq_request_club_join(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.cq_request_club_join(uuid,uuid,text,text,text) to service_role;

-- Approved content projects into the EXISTING activity table in the same
-- transaction. Paid status NEVER grants verification. A reviewer does.
alter table public.cq_activities drop constraint cq_activities_source_check;
alter table public.cq_activities add constraint cq_activities_source_check
  check(source in ('localist','engage','athletics','curated','submitted','club'));
alter table public.cq_activities add column club_id uuid references public.cq_clubs(id) on delete cascade;
create index on public.cq_activities(club_id);

create function public.cq_project_club()
returns trigger language plpgsql security definer set search_path=public as $$
declare c cq_clubs%rowtype; e cq_club_events%rowtype; labels text[];
begin
  if tg_table_name='cq_clubs' then c:=new;
  else select * into c from cq_clubs where id=new.club_id; end if;
  select coalesce(array_agg(value),'{}') into labels from jsonb_array_elements_text(c.content->'categories');
  insert into cq_activities(id,campus_id,kind,name,summary,categories,location,url,image_url,
    source,source_ref,status,verified_at,verified_by,club_id)
  values('club:'||c.id,c.campus_id,'organization',c.content->>'name',c.content->>'description',labels,
    c.content->>'meeting','/clubs/'||c.slug,c.content->>'logo','club',c.id::text,
    case when c.owner_approved and c.status='approved' then 'verified' else 'hidden' end,
    case when c.status='approved' then now() end,c.reviewed_by::text,c.id)
  on conflict(id) do update set name=excluded.name,summary=excluded.summary,categories=excluded.categories,
    location=excluded.location,url=excluded.url,image_url=excluded.image_url,status=excluded.status,
    verified_at=excluded.verified_at,verified_by=excluded.verified_by,last_seen=now();
  for e in select * from cq_club_events where club_id=c.id loop
    insert into cq_activities(id,campus_id,kind,name,summary,categories,location,url,starts_at,ends_at,
      source,source_ref,status,verified_at,verified_by,club_id)
    values('club-event:'||e.id,c.campus_id,'event',e.content->>'title',e.content->>'description',labels,
      e.content->>'location','/clubs/'||c.slug,(e.content->>'starts_at')::timestamptz,
      (e.content->>'ends_at')::timestamptz,'club',e.id::text,
      case when c.owner_approved and c.status='approved' and e.status='approved' then 'verified' else 'hidden' end,
      case when e.status='approved' then now() end,e.reviewed_by::text,c.id)
    on conflict(id) do update set name=excluded.name,summary=excluded.summary,categories=excluded.categories,
      location=excluded.location,url=excluded.url,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
      status=excluded.status,verified_at=excluded.verified_at,verified_by=excluded.verified_by,last_seen=now();
  end loop;
  return new;
end;
$$;
revoke all on function public.cq_project_club() from public,anon,authenticated;
create trigger cq_club_projection after insert or update on public.cq_clubs for each row execute function public.cq_project_club();
create trigger cq_club_event_projection after insert or update on public.cq_club_events for each row execute function public.cq_project_club();
