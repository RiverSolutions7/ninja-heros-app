-- Add video timestamp clip fields to inspiration_clips
-- Allows coaches to save a specific segment (start_seconds → end_seconds) of a YouTube video

ALTER TABLE inspiration_clips
  ADD COLUMN IF NOT EXISTS start_seconds integer,
  ADD COLUMN IF NOT EXISTS end_seconds integer;
