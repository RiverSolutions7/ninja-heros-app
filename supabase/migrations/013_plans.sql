-- Plans table for Today's Plan (synced via Supabase, shareable via link)
CREATE TABLE IF NOT EXISTS plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  curriculum  text,
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON plans
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-update updated_at on edit (reuse existing trigger function)
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
