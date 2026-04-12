ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_date date;
UPDATE plans SET plan_date = created_at::date WHERE plan_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS plans_plan_date_unique ON plans (plan_date) WHERE plan_date IS NOT NULL;
