-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 004
-- Curated Handoff board: in_handoff flag + notes table
-- Run this in your Supabase SQL editor
-- ============================================================

-- ============================================================
-- Add in_handoff flag to classes
-- Classes only appear in the Handoff tab when this is true
-- ============================================================
alter table classes
  add column if not exists in_handoff boolean not null default false;

create index if not exists idx_classes_in_handoff on classes(in_handoff);

-- ============================================================
-- HANDOFF NOTES TABLE
-- Coach-to-coach message board displayed at the top of Handoff
-- ============================================================
create table if not exists handoff_notes (
  id          uuid primary key default gen_random_uuid(),
  content     text not null,
  author_name text,
  created_at  timestamptz not null default now()
);

alter table handoff_notes enable row level security;
create policy "Allow all for anon" on handoff_notes
  for all to anon using (true) with check (true);
