-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 010
-- Inspiration clips: saved video links from YouTube, Instagram, etc.
-- Note: no coach_id — this app has no auth (shared coach tool)
-- ============================================================

create table if not exists inspiration_clips (
  id            uuid primary key default gen_random_uuid(),
  url           text not null,
  title         text,
  thumbnail_url text,
  source_domain text,
  tags          text[] not null default '{}',
  notes         text,
  created_at    timestamptz not null default now()
);

alter table inspiration_clips enable row level security;
create policy "Allow all for anon" on inspiration_clips
  for all to anon using (true) with check (true);
