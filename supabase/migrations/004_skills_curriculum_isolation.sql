-- Make skills fully curriculum-isolated.
-- Each curriculum has its own independent skill list.
-- NULL age_group skills are assigned to Junior Ninjas and duplicated for Mini Ninjas.

-- 1. Drop the old unique constraint on name alone
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_name_key;

-- 2. Add compound unique on (name, age_group) so each curriculum can have its own copy
ALTER TABLE skills ADD CONSTRAINT skills_name_age_group_key UNIQUE (name, age_group);

-- 3. Duplicate all current global (NULL) skills for Mini Ninjas first
INSERT INTO skills (name, age_group)
SELECT name, 'Mini Ninjas (3.5-5)'
FROM skills
WHERE age_group IS NULL
ON CONFLICT (name, age_group) DO NOTHING;

-- 4. Assign the original NULL skills to Junior Ninjas
UPDATE skills SET age_group = 'Junior Ninjas (5-9)' WHERE age_group IS NULL;
