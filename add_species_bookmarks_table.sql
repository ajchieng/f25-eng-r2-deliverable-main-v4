-- Run this in Supabase SQL Editor to add species bookmarks support to an existing database.

-- Ensure the species_bookmarks table exists before applying policies and grants.
create table if not exists public.species_bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  species_id int not null references public.species (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, species_id)
);

-- Turn on row-level security so policy rules below are enforced.
alter table public.species_bookmarks
  enable row level security;

-- Idempotently create policies (safe to run multiple times).
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'species_bookmarks'
      and policyname = 'Users can view their own bookmarks.'
  ) then
    create policy "Users can view their own bookmarks." on public.species_bookmarks
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'species_bookmarks'
      and policyname = 'Users can insert their own bookmarks.'
  ) then
    create policy "Users can insert their own bookmarks." on public.species_bookmarks
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'species_bookmarks'
      and policyname = 'Users can delete their own bookmarks.'
  ) then
    create policy "Users can delete their own bookmarks." on public.species_bookmarks
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Speeds up reading bookmarks for the current user.
create index if not exists species_bookmarks_user_id_created_at_idx
  on public.species_bookmarks (user_id, created_at desc);

-- Grant table access to anonymous + authenticated Supabase roles.
grant select, insert, delete on table public.species_bookmarks to anon, authenticated;

