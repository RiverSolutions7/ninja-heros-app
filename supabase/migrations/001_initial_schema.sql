-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Initial Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- CLASSES
-- ============================================================
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  class_date  date not null,
  age_group   text not null check (age_group in (
                'Tiny Ninjas (3.5-5)',
                'Junior Ninjas (5-9)',
                'Elite Ninjas (9-11)',
                'All Ages'
              )),
  difficulty  text not null check (difficulty in (
                'Beginner',
                'Beginner-Intermediate',
                'Intermediate',
                'Intermediate-Advanced',
                'Advanced'
              )),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger classes_updated_at
  before update on classes
  for each row execute procedure update_updated_at();

-- ============================================================
-- CLASS BLOCKS
-- ============================================================
create table if not exists class_blocks (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  block_type  text not null check (block_type in ('warmup', 'lane', 'game')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_class_blocks_class_id on class_blocks(class_id);

-- ============================================================
-- WARMUP BLOCKS
-- ============================================================
create table if not exists warmup_blocks (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid not null references class_blocks(id) on delete cascade,
  description text not null default '',
  time        text not null check (time in ('5 min', '6 min', '7 min')),
  skill_focus text
);

-- ============================================================
-- LANE BLOCKS
-- ============================================================
create table if not exists lane_blocks (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references class_blocks(id) on delete cascade,
  instructor_name text,
  core_skills     text[] not null default '{}'
);

-- ============================================================
-- STATIONS
-- ============================================================
create table if not exists stations (
  id            uuid primary key default gen_random_uuid(),
  lane_block_id uuid not null references lane_blocks(id) on delete cascade,
  sort_order    integer not null default 0,
  equipment     text not null default '',
  description   text not null default '',
  photo_url     text
);

create index idx_stations_lane_block_id on stations(lane_block_id);

-- ============================================================
-- GAME BLOCKS
-- ============================================================
create table if not exists game_blocks (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid not null references class_blocks(id) on delete cascade,
  name        text not null,
  description text,
  video_link  text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- (permissive anon access — no auth for this shared coach tool)
-- ============================================================
alter table classes       enable row level security;
alter table class_blocks  enable row level security;
alter table warmup_blocks enable row level security;
alter table lane_blocks   enable row level security;
alter table stations      enable row level security;
alter table game_blocks   enable row level security;

create policy "Allow all for anon" on classes       for all to anon using (true) with check (true);
create policy "Allow all for anon" on class_blocks  for all to anon using (true) with check (true);
create policy "Allow all for anon" on warmup_blocks for all to anon using (true) with check (true);
create policy "Allow all for anon" on lane_blocks   for all to anon using (true) with check (true);
create policy "Allow all for anon" on stations      for all to anon using (true) with check (true);
create policy "Allow all for anon" on game_blocks   for all to anon using (true) with check (true);

-- ============================================================
-- STORAGE BUCKET for station photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('station-photos', 'station-photos', true)
on conflict (id) do nothing;

create policy "Allow anon uploads to station-photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'station-photos');

create policy "Allow anon select on station-photos"
  on storage.objects for select
  to anon
  using (bucket_id = 'station-photos');

create policy "Allow anon delete on station-photos"
  on storage.objects for delete
  to anon
  using (bucket_id = 'station-photos');
