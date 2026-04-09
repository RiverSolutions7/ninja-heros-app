-- ============================================================
-- Ninja H.E.R.O.S. Coach Hub — Migration 008
-- Add video fields to components table
-- Run this in your Supabase SQL editor
-- ============================================================

alter table components
  add column if not exists video_link text,
  add column if not exists video_url  text;
