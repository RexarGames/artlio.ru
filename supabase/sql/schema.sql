-- Dexxure Games Multisite — Supabase schema
-- Запускать в Supabase Dashboard -> SQL Editor.
-- После запуска включите Auth -> Anonymous Sign-Ins.

create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text default '',
  accent text not null default 'acid' check (accent in ('acid', 'violet', 'cyan', 'red')),
  scanlines boolean not null default true,
  reduced_motion boolean not null default false,
  compact_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  game_title text not null check (char_length(game_title) between 2 and 80),
  game_slug text not null,
  version text default 'v1.0.0',
  author text default 'Guest',
  description text not null check (char_length(description) between 10 and 800),
  file_path text not null,
  file_url text not null,
  cover_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  description text default '',
  skills text[] default '{}',
  avatar_url text,
  links jsonb default '{}'::jsonb,
  order_index int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_posts (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null default 'Пост Dexxure',
  text text default '',
  url text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  type text default 'custom',
  order_index int default 100,
  created_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.mods enable row level security;
alter table public.team_members enable row level security;
alter table public.telegram_posts enable row level security;
alter table public.site_links enable row level security;

-- Settings: каждый анонимный/обычный пользователь видит и меняет только свою запись.
drop policy if exists "settings select own" on public.site_settings;
create policy "settings select own"
on public.site_settings for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "settings insert own" on public.site_settings;
create policy "settings insert own"
on public.site_settings for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "settings update own" on public.site_settings;
create policy "settings update own"
on public.site_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Mods: посетители видят approved; автор видит свои pending/rejected тоже.
drop policy if exists "mods select approved or own" on public.mods;
create policy "mods select approved or own"
on public.mods for select
to authenticated
using (status = 'approved' or owner_id = auth.uid());

drop policy if exists "mods insert own pending" on public.mods;
create policy "mods insert own pending"
on public.mods for insert
to authenticated
with check (owner_id = auth.uid() and status = 'pending');

-- Публичные справочники читаются сайтом.
drop policy if exists "team read" on public.team_members;
create policy "team read"
on public.team_members for select
to anon, authenticated
using (true);

drop policy if exists "telegram read" on public.telegram_posts;
create policy "telegram read"
on public.telegram_posts for select
to anon, authenticated
using (true);

drop policy if exists "links read" on public.site_links;
create policy "links read"
on public.site_links for select
to anon, authenticated
using (true);

-- Storage bucket для модов.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mods',
  'mods',
  true,
  104857600,
  array[
    'application/zip',
    'application/x-zip-compressed',
    'application/x-7z-compressed',
    'application/vnd.rar',
    'application/octet-stream',
    'text/plain',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: читать могут все, загружать только в свою папку auth.uid().
drop policy if exists "mods files public read" on storage.objects;
create policy "mods files public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'mods');

drop policy if exists "mods files upload own folder" on storage.objects;
create policy "mods files upload own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mods'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Демо-состав команды. Позже замените на реальные имена.
insert into public.team_members (name, role, description, skills, order_index)
values
  ('Dexxure Games', 'Core Team', 'Основная команда разработки, дизайна и публикации проектов.', array['Unity','Game Design','Publishing'], 10),
  ('Game Dev', 'Developer', 'Разработка игровых систем, прототипов, интерфейсов и логики.', array['C#','Gameplay','UI'], 20),
  ('Creative', 'Design', 'Визуальная подача, атмосфера, промо-материалы и страницы игр.', array['Branding','Art Direction'], 30),
  ('Community', 'Moderation', 'Проверка модов, обратная связь и работа с сообществом.', array['Workshop','Support'], 40)
on conflict do nothing;

insert into public.site_links (title, url, type, order_index)
values
  ('Telegram', 'https://t.me/DexxureEnt', 'telegram', 10),
  ('GitHub', 'https://github.com/DexxureGames', 'github', 20),
  ('Itch.io', 'https://rexar-games.itch.io', 'store', 30)
on conflict do nothing;

-- Одобрение мода вручную:
-- update public.mods set status = 'approved' where id = 'MOD_ID';
