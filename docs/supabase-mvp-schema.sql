-- PlateVote MVP schema
-- Apply in Supabase SQL editor after creating the project.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'session_status'
      and n.nspname = 'public'
  ) then
    create type public.session_status as enum ('lobby', 'voting', 'completed');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  join_code text not null unique,
  title text,
  host_user_id uuid not null references auth.users(id) on delete restrict,
  status public.session_status not null default 'lobby',
  selected_option_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_join_code_format check (join_code ~ '^[A-Z0-9]{6}$')
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) >= 2),
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.restaurant_options (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  added_by_participant_id uuid references public.participants(id) on delete set null,
  name text not null check (length(trim(name)) >= 2),
  cuisine text,
  price_level smallint check (price_level between 1 and 4),
  distance_miles numeric(4,1) check (distance_miles >= 0),
  map_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  option_id uuid not null references public.restaurant_options(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, option_id)
);

create index if not exists idx_participants_session on public.participants(session_id);
create index if not exists idx_options_session on public.restaurant_options(session_id);
create index if not exists idx_votes_session on public.votes(session_id);
create index if not exists idx_votes_option on public.votes(option_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'sessions_set_updated_at'
  ) then
    create trigger sessions_set_updated_at
      before update on public.sessions
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'votes_set_updated_at'
  ) then
    create trigger votes_set_updated_at
      before update on public.votes
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.sessions s where s.join_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

alter table public.sessions
  alter column join_code set default public.generate_join_code();

create or replace view public.option_scores as
select
  o.session_id,
  o.id as option_id,
  o.name,
  coalesce(round(avg(v.score)::numeric, 2), 0) as avg_score,
  count(v.id)::int as vote_count,
  o.distance_miles,
  o.created_at
from public.restaurant_options o
left join public.votes v on v.option_id = o.id
group by o.session_id, o.id;

create or replace function public.is_session_participant(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participants p
    where p.session_id = p_session_id
      and p.user_id = auth.uid()
  );
$$;

alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.restaurant_options enable row level security;
alter table public.votes enable row level security;

drop policy if exists "sessions_select_participants" on public.sessions;
create policy "sessions_select_participants"
  on public.sessions
  for select
  using (public.is_session_participant(id));

drop policy if exists "sessions_insert_host_only" on public.sessions;
create policy "sessions_insert_host_only"
  on public.sessions
  for insert
  with check (host_user_id = auth.uid());

drop policy if exists "sessions_update_host_only" on public.sessions;
create policy "sessions_update_host_only"
  on public.sessions
  for update
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

drop policy if exists "participants_select_session_members" on public.participants;
create policy "participants_select_session_members"
  on public.participants
  for select
  using (
    public.is_session_participant(session_id)
    or user_id = auth.uid()
  );

drop policy if exists "participants_insert_self_only" on public.participants;
create policy "participants_insert_self_only"
  on public.participants
  for insert
  with check (user_id = auth.uid());

drop policy if exists "participants_update_self_only" on public.participants;
create policy "participants_update_self_only"
  on public.participants
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "options_select_session_members" on public.restaurant_options;
create policy "options_select_session_members"
  on public.restaurant_options
  for select
  using (public.is_session_participant(session_id));

drop policy if exists "options_insert_session_members" on public.restaurant_options;
create policy "options_insert_session_members"
  on public.restaurant_options
  for insert
  with check (public.is_session_participant(session_id));

drop policy if exists "options_update_creator_or_host" on public.restaurant_options;
create policy "options_update_creator_or_host"
  on public.restaurant_options
  for update
  using (
    public.is_session_participant(session_id)
    and (
      added_by_participant_id in (
        select p.id
        from public.participants p
        where p.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.sessions s
        where s.id = session_id
          and s.host_user_id = auth.uid()
      )
    )
  )
  with check (public.is_session_participant(session_id));

drop policy if exists "votes_select_session_members" on public.votes;
create policy "votes_select_session_members"
  on public.votes
  for select
  using (public.is_session_participant(session_id));

drop policy if exists "votes_insert_own_participant" on public.votes;
create policy "votes_insert_own_participant"
  on public.votes
  for insert
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = participant_id
        and p.session_id = session_id
        and p.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.restaurant_options o
      where o.id = option_id
        and o.session_id = session_id
    )
  );

drop policy if exists "votes_update_own_participant" on public.votes;
create policy "votes_update_own_participant"
  on public.votes
  for update
  using (
    exists (
      select 1
      from public.participants p
      where p.id = participant_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = participant_id
        and p.session_id = session_id
        and p.user_id = auth.uid()
    )
  );
