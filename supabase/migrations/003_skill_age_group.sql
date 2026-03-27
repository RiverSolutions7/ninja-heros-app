-- Add age_group to skills so skills can be scoped to a curriculum.
-- NULL means the skill is global (appears in all curriculums).
-- Skills added while a curriculum is selected get that curriculum's age_group.

ALTER TABLE skills ADD COLUMN IF NOT EXISTS age_group TEXT;
