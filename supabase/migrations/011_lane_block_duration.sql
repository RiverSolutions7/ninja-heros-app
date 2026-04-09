-- Add duration_minutes to lane_blocks so station duration is persisted to DB
-- (it was being captured in the form draft but never saved)
ALTER TABLE lane_blocks ADD COLUMN IF NOT EXISTS duration_minutes integer;
