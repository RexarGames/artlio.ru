-- Dexxure Multisite database setup
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- User settings saved after login/registration.
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

alter table public.user_settings enable row level security;

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Telegram posts cache.
create table if not exists public.telegram_posts (
  id uuid primary key default gen_random_uuid(),
  telegram_message_id text unique,
  title text,
  content text,
  image_url text,
  telegram_url text,
  views text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_posts enable row level security;

drop policy if exists "Authenticated users can read telegram posts" on public.telegram_posts;
create policy "Authenticated users can read telegram posts"
on public.telegram_posts for select
to authenticated
using (true);

-- Team members.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  role text not null,
  bio text not null,
  sort_order int not null default 100,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

drop policy if exists "Authenticated users can read team" on public.team_members;
create policy "Authenticated users can read team"
on public.team_members for select
to authenticated
using (is_visible = true);

insert into public.team_members (nickname, role, bio, sort_order, is_visible) values
  ('Dexxure', 'Владелец', 'Отвечает за направление проекта, развитие команды и общую структуру Dexxure Games.', 1, true),
  ('Link', 'Основной разработчик игр', 'Основной разработчик игр на Unity и Unreal Engine.', 2, true),
  ('afryder', 'Программист', 'Пишет код, помогает с логикой систем и технической частью проектов.', 3, true),
  ('Jiterset', 'Тестировщик игр', 'Проверяет сборки, ищет баги и помогает доводить проекты до стабильного состояния.', 4, true)
on conflict (nickname) do update set
  role = excluded.role,
  bio = excluded.bio,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = now();

-- Workshop mods.
create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  game_title text not null,
  description text not null,
  file_path text not null,
  public_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mods enable row level security;

drop policy if exists "Read approved mods and own mods" on public.mods;
create policy "Read approved mods and own mods"
on public.mods for select
to authenticated
using (status = 'approved' or owner_id = auth.uid());

drop policy if exists "Users can insert own mods" on public.mods;
create policy "Users can insert own mods"
on public.mods for insert
to authenticated
with check (owner_id = auth.uid() and status = 'pending');

-- Event tracking. Insert is done by Edge Function with service role key.
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  page text,
  details jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.site_events enable row level security;

drop policy if exists "Users can read own events" on public.site_events;
create policy "Users can read own events"
on public.site_events for select
to authenticated
using (user_id = auth.uid());

-- Storage bucket for mods.
insert into storage.buckets (id, name, public, file_size_limit)
values ('mods', 'mods', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Users can upload only into their own folder: mods/<auth.uid()>/file.zip
drop policy if exists "Users can upload mods into own folder" on storage.objects;
create policy "Users can upload mods into own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mods'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Authenticated users can read mod files" on storage.objects;
create policy "Authenticated users can read mod files"
on storage.objects for select
to authenticated
using (bucket_id = 'mods');
