-- Dexxure Multisite v3 update
-- Run in Supabase SQL Editor after the previous schema.

begin;

-- Make sure user settings has the columns used by the new settings page.
alter table public.user_settings
  add column if not exists nickname text not null default 'Dexxure User',
  add column if not exists accent_color text not null default '#b7ff00',
  add column if not exists scanlines boolean not null default true,
  add column if not exists reduced_motion boolean not null default false,
  add column if not exists compact_mode boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Team composition.
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

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'team_members'
  loop
    execute format('drop policy if exists %I on public.team_members', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can read team"
on public.team_members
for select
to authenticated
using (is_visible = true);

insert into public.team_members (nickname, role, bio, sort_order, is_visible) values
  ('Dexxure', 'Владелец', 'Отвечает за направление проекта, решения по развитию и общую структуру команды.', 1, true),
  ('Link', 'Основной разработчик игр', 'Основной разработчик игр на Unity и Unreal Engine.', 2, true),
  ('afryder', 'Программист', 'Работает с кодом, логикой систем и технической частью проектов.', 3, true),
  ('Jiterset', 'Тестировщик игр', 'Проверяет сборки, ищет баги и помогает доводить игры до стабильного состояния.', 4, true)
on conflict (nickname) do update set
  role = excluded.role,
  bio = excluded.bio,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible,
  updated_at = now();

-- Workshop now uses URLs instead of direct file upload.
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
  add column if not exists download_url text,
  add column if not exists preview_url text,
  add column if not exists public_url text,
  add column if not exists file_path text,
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

create policy "Read approved mods and own mods"
on public.mods
for select
to authenticated
using (status = 'approved' or owner_id = auth.uid());

create policy "Users can insert own mod url"
on public.mods
for insert
to authenticated
with check (owner_id = auth.uid() and status = 'pending');

-- Telegram posts are manual/cache records now. No auto-sync function is required.
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

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'telegram_posts'
  loop
    execute format('drop policy if exists %I on public.telegram_posts', pol.policyname);
  end loop;
end $$;

create policy "Authenticated users can read telegram posts"
on public.telegram_posts
for select
to authenticated
using (true);

notify pgrst, 'reload schema';

commit;
