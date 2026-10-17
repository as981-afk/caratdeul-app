-- CARATFLIX — initial Supabase schema
-- ---------------------------------------------------------------------------
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
-- It is idempotent, so re-running it is safe.
--
-- Accounts and passwords are handled by Supabase Auth (`auth.users`); there is
-- no credentials table here and no password is ever stored by this app.
--
-- Tables:
--   profiles        the "who's watching" identities per account (theme/accent
--                   included, so appearance syncs across devices)
--   my_list         My List rows (video / bias-member favourites) per profile
--   watch_progress  watched state + Continue Watching per profile/video
--
-- Every table has Row Level Security enabled. A signed-in user can only ever
-- read or write rows where auth.uid() = user_id, and child rows additionally
-- have to belong to a profile that same user owns.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null default 'Carat',
  avatar        text not null default '',
  theme         text not null default 'dark',
  accent        text not null default 'rose',
  notifications jsonb not null default '{"uploads": true, "comebacks": true, "birthdays": true}'::jsonb,
  bio           text not null default '',
  favorite_unit text not null default 'All',
  bias_wrecker  text not null default '',
  status        text not null default '',
  member_since  text not null default '',
  joined_at     bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

create table if not exists public.my_list (
  user_id    uuid not null references auth.users (id) on delete cascade,
  profile_id text not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('videos', 'members')),
  item_id    text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, kind, item_id)
);

create index if not exists my_list_user_profile_idx on public.my_list (user_id, profile_id);

create table if not exists public.watch_progress (
  user_id              uuid not null references auth.users (id) on delete cascade,
  profile_id           text not null references public.profiles (id) on delete cascade,
  video_id             text not null,
  progress             integer not null default 0 check (progress between 0 and 100),
  watched              boolean not null default false,
  in_continue_watching boolean not null default false,
  position             integer,
  data                 jsonb not null default '{}'::jsonb,
  updated_at           timestamptz not null default now(),
  primary key (profile_id, video_id)
);

create index if not exists watch_progress_user_profile_idx
  on public.watch_progress (user_id, profile_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists watch_progress_touch_updated_at on public.watch_progress;
create trigger watch_progress_touch_updated_at
  before update on public.watch_progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.my_list enable row level security;
alter table public.watch_progress enable row level security;

drop policy if exists "profiles: owner select" on public.profiles;
create policy "profiles: owner select" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles: owner insert" on public.profiles;
create policy "profiles: owner insert" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles: owner update" on public.profiles;
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles: owner delete" on public.profiles;
create policy "profiles: owner delete" on public.profiles
  for delete using (auth.uid() = user_id);

-- Child rows: owned by the user *and* attached to one of their profiles.
-- (The extra EXISTS check stops a caller from writing rows under someone
-- else's profile id even though the user_id column would pass.)
drop policy if exists "my_list: owner" on public.my_list;
create policy "my_list: owner" on public.my_list
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "watch_progress: owner" on public.watch_progress;
create policy "watch_progress: owner" on public.watch_progress
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Privileges (RLS still decides which rows are visible)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.my_list to authenticated;
grant select, insert, update, delete on public.watch_progress to authenticated;
