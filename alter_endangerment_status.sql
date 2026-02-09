-- This adds a new endangerment status enum + species column.

-- Create enum only if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'endangerment_status'
  ) then
    create type endangerment_status as enum (
      'Not Evaluated',
      'Data Deficient',
      'Least Concern',
      'Near Threatened',
      'Vulnerable',
      'Endangered',
      'Critically Endangered',
      'Extinct in the Wild',
      'Extinct'
    );
  end if;
end $$;

-- Add the new species column in an idempotent way.
alter table public.species
  add column if not exists endangerment_status endangerment_status not null default 'Not Evaluated';
