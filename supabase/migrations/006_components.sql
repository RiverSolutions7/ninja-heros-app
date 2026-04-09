-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 006
-- Component library: standalone games, warmups, and stations
-- Run this in your Supabase SQL editor
-- ============================================================

-- ============================================================
-- COMPONENTS TABLE
-- Individual building blocks of a class that can be logged
-- standalone or reused across multiple full classes.
-- type: 'game' | 'warmup' | 'station'
-- ============================================================
create table if not exists components (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('game', 'warmup', 'station')),
  title            text not null,
  curriculum       text,
  description      text,
  skills           text[],
  photos           text[],
  duration_minutes integer,
  created_at       timestamptz not null default now()
);

alter table components enable row level security;
create policy "Allow all for anon" on components
  for all to anon using (true) with check (true);
