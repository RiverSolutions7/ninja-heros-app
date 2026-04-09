-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 007
-- Add equipment column to components table (for station type)
-- Run this in your Supabase SQL editor
-- ============================================================

alter table components
  add column if not exists equipment text;
