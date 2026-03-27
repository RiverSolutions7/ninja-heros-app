-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 002
-- Skills table, video_url columns, video storage buckets
-- Run this in your Supabase SQL editor BEFORE restarting the app
-- ============================================================

-- ============================================================
-- SKILLS TABLE
-- Dynamic skill list so coaches can add custom skills
-- ============================================================
create table if not exists skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- Seed with the 13 default skills
insert into skills (name) values
  ('Balance'),
  ('Agility'),
  ('Jumping'),
  ('Rolling'),
  ('Climbing'),
  ('Grip Strength'),
  ('Body Control'),
  ('Coordination'),
  ('Speed'),
  ('Teamwork'),
  ('Confidence'),
  ('Tumbling'),
  ('Core Strength')
on conflict (name) do nothing;

-- RLS: allow anon read/write (shared coach tool, no auth)
alter table skills enable row level security;
create policy "Allow all for anon" on skills
  for all to anon using (true) with check (true);

-- ============================================================
-- VIDEO URL COLUMNS
-- One recorded video per lane block (full course run)
-- One recorded video per game block
-- ============================================================
alter table lane_blocks add column if not exists video_url text;
alter table game_blocks add column if not exists video_url text;

-- ============================================================
-- STORAGE: lane-videos bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('lane-videos', 'lane-videos', true)
on conflict (id) do nothing;

create policy "Allow anon uploads to lane-videos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'lane-videos');

create policy "Allow anon select on lane-videos"
  on storage.objects for select
  to anon
  using (bucket_id = 'lane-videos');

create policy "Allow anon delete on lane-videos"
  on storage.objects for delete
  to anon
  using (bucket_id = 'lane-videos');

-- ============================================================
-- STORAGE: game-videos bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('game-videos', 'game-videos', true)
on conflict (id) do nothing;

create policy "Allow anon uploads to game-videos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'game-videos');

create policy "Allow anon select on game-videos"
  on storage.objects for select
  to anon
  using (bucket_id = 'game-videos');

create policy "Allow anon delete on game-videos"
  on storage.objects for delete
  to anon
  using (bucket_id = 'game-videos');
