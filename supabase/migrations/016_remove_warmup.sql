-- Remove warmup component type from the library.
-- Warmups are improvised and don't belong in the persistent library.
-- Existing warmup components are deleted; plans retain embedded data as-is (JSONB).

DELETE FROM components WHERE type = 'warmup';

ALTER TABLE components DROP CONSTRAINT IF EXISTS components_type_check;
ALTER TABLE components ADD CONSTRAINT components_type_check
  CHECK (type IN ('game', 'station'));
