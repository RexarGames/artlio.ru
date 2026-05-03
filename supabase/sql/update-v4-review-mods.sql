-- Dexxure Multisite v4: проверка модов + счётчик зарегистрированных пользователей
-- Выполни этот файл в Supabase -> SQL Editor.
-- Аккаунт проверки модов: Link / karina.kurbatova.1991@mail.ru

begin;

create extension if not exists pgcrypto;

-- Настройки пользователей. Таблица нужна и для счётчика, и для профиля.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Dexxure User',
  accent_color text not null default '#b7ff00',
  scanlines boolean not null default true,
  reduced_motion boolean not null default false,
  compact_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists nickname text not null default 'Dexxure User',
  add column if not exists accent_color text not null default '#b7ff00',
  add column if not exists scanlines boolean not null default true,
  add column if not exists reduced_motion boolean not null default false,
  add column if not exists compact_mode boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_settings enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'user_settings'
  loop
    execute format('drop policy if exists %I on public.user_settings', pol.policyname);
  end loop;
end $$;

create policy "Users can read settings for counters"
on public.user_settings
for select
to authenticated
using (true);

create policy "Users can insert own settings"
on public.user_settings
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own settings"
on public.user_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Таблица публичной статистики, чтобы на сайте показывалось количество зарегистрированных аккаунтов.
create table if not exists public.site_stats (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.site_stats enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'site_stats'
  loop
    execute format('drop policy if exists %I on public.site_stats', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can read site stats"
on public.site_stats
for select
to authenticated
using (true);

insert into public.site_stats (key, value, updated_at)
select 'registered_users', count(*), now()
from auth.users
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

create or replace function public.refresh_registered_users_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_stats (key, value, updated_at)
  select 'registered_users', count(*), now()
  from auth.users
  on conflict (key) do update set
    value = excluded.value,
    updated_at = now();

  return null;
end;
$$;

drop trigger if exists refresh_registered_users_stat_insert on auth.users;
create trigger refresh_registered_users_stat_insert
after insert on auth.users
for each statement execute function public.refresh_registered_users_stat();

drop trigger if exists refresh_registered_users_stat_delete on auth.users;
create trigger refresh_registered_users_stat_delete
after delete on auth.users
for each statement execute function public.refresh_registered_users_stat();

-- Моды: заявка всегда pending, модератор Link одобряет/отклоняет.
create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  game_title text not null,
  description text not null,
  file_path text,
  public_url text,
  download_url text,
  preview_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mods
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists game_title text,
  add column if not exists description text,
  add column if not exists file_path text,
  add column if not exists public_url text,
  add column if not exists download_url text,
  add column if not exists preview_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.mods drop constraint if exists mods_status_check;
alter table public.mods add constraint mods_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.mods enable row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'mods'
  loop
    execute format('drop policy if exists %I on public.mods', pol.policyname);
  end loop;
end $$;

create policy "Read approved mods own mods and reviewer queue"
on public.mods
for select
to authenticated
using (
  status = 'approved'
  or owner_id = auth.uid()
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'karina.kurbatova.1991@mail.ru'
);

create policy "Users can submit mods to review"
on public.mods
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and status = 'pending'
);

create policy "Link can approve or reject mods"
on public.mods
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'karina.kurbatova.1991@mail.ru')
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'karina.kurbatova.1991@mail.ru'
  and status in ('pending', 'approved', 'rejected')
);


-- Права для API Supabase. RLS всё равно ограничивает, кто что видит и меняет.
grant select, insert, update on public.user_settings to authenticated;
grant select on public.site_stats to authenticated;
grant select, insert, update on public.mods to authenticated;

notify pgrst, 'reload schema';

commit;
