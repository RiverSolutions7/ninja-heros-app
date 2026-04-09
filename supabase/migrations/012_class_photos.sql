-- Add photos column to classes for Quick Log mode (class-level photos without blocks)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';
