-- Add multi-photo support to stations
ALTER TABLE stations ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';
