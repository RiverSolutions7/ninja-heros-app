-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 003
-- Folders for the Class Library
-- Run this in your Supabase SQL editor
-- ============================================================

-- ============================================================
-- FOLDERS TABLE
-- ============================================================
create table if not exists folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table folders enable row level security;
create policy "Allow all for anon" on folders
  for all to anon using (true) with check (true);

-- ============================================================
-- Add folder_id to classes
-- (nullable; on folder delete, classes become unfoldered)
-- ============================================================
alter table classes
  add column if not exists folder_id uuid references folders(id) on delete set null;

create index if not exists idx_classes_folder_id on classes(folder_id);
