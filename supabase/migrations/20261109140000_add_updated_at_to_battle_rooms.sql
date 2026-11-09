-- battle_rooms has a BEFORE UPDATE trigger (handle_updated_at) that sets NEW.updated_at,
-- but the column was never created. Every UPDATE on battle_rooms failed with
-- 42703 record "new" has no field "updated_at", so room player counts and status
-- transitions (waiting -> playing -> finished) were silently broken.
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
