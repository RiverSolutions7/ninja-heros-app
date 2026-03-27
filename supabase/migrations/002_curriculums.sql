-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Curriculums Table
-- Run this in your Supabase SQL editor
-- ============================================================

-- Drop the restrictive check constraint on classes.age_group
-- (allows any curriculum name going forward)
alter table classes drop constraint if exists classes_age_group_check;

-- Drop the warmup time check constraint (expanded to 1-10 min)
alter table warmup_blocks drop constraint if exists warmup_blocks_time_check;

-- Add 'Mini Ninjas (3.5-5)' and 'in_handoff' column if missing (safety)
alter table classes add column if not exists folder_id uuid references folders(id) on delete set null;
alter table classes add column if not exists in_handoff boolean not null default false;

-- ============================================================
-- CURRICULUMS
-- ============================================================
create table if not exists curriculums (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  age_group   text not null unique,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- RLS — permissive anon access
alter table curriculums enable row level security;
create policy "Allow all for anon" on curriculums for all to anon using (true) with check (true);

-- Seed default curriculums (safe to re-run)
insert into curriculums (label, age_group, sort_order) values
  ('Mini Ninjas',   'Mini Ninjas (3.5-5)',  0),
  ('Junior Ninjas', 'Junior Ninjas (5-9)',   1)
on conflict (age_group) do nothing;
