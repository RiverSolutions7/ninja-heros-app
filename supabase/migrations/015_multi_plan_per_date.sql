-- Allow multiple plans per the same calendar date.
-- Removes the partial unique index that previously enforced one plan per day,
-- so multiple coaches (or multiple curriculums) can each have their own plan.
DROP INDEX IF EXISTS plans_plan_date_unique;
