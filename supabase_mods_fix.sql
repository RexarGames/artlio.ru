-- Исправление таблицы mods для ошибки:
-- Could not find the 'download_url' column of 'mods' in the schema cache

create extension if not exists pgcrypto;

create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  download_url text not null,
  author_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.mods add column if not exists title text;
alter table public.mods add column if not exists description text;
alter table public.mods add column if not exists download_url text;
alter table public.mods add column if not exists author_email text;
alter table public.mods add column if not exists status text not null default 'pending';
alter table public.mods add column if not exists created_at timestamptz not null default now();

alter table public.mods enable row level security;

drop policy if exists "Public can send mods" on public.mods;
create policy "Public can send mods"
on public.mods
for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated can read mods" on public.mods;
create policy "Authenticated can read mods"
on public.mods
for select
to authenticated
using (true);

notify pgrst, 'reload schema';
