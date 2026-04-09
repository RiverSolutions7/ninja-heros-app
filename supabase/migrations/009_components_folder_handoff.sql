-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 009
-- Add folder and handoff support to components table
-- Run this in your Supabase SQL editor
-- ============================================================

alter table components
  add column if not exists folder_id  uuid references folders(id) on delete set null,
  add column if not exists in_handoff boolean not null default false;
