
-- Server-side replay validation function
CREATE OR REPLACE FUNCTION public.validate_replay_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_service boolean := (auth.role() = 'service_role');
BEGIN
  -- 1. Identity: client inserts must match authenticated user
  IF NOT _is_service THEN
    IF _caller IS NULL THEN
      RAISE EXCEPTION 'Replay validation failed: authentication required';
    END IF;
    IF NEW.user_id IS DISTINCT FROM _caller THEN
      RAISE EXCEPTION 'Replay validation failed: user_id must match authenticated user';
    END IF;
  END IF;

  -- 2. Numeric bounds (anti-cheat / anti-corruption)
  IF NEW.final_score IS NULL OR NEW.final_score < 0 OR NEW.final_score > 100000000 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid final_score (%).', NEW.final_score;
  END IF;

  IF NEW.final_lines IS NULL OR NEW.final_lines < 0 OR NEW.final_lines > 100000 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid final_lines (%).', NEW.final_lines;
  END IF;

  IF NEW.final_level IS NULL OR NEW.final_level < 0 OR NEW.final_level > 999 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid final_level (%).', NEW.final_level;
  END IF;

  IF NEW.duration_seconds IS NULL OR NEW.duration_seconds < 0 OR NEW.duration_seconds > 86400 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid duration_seconds (%).', NEW.duration_seconds;
  END IF;

  -- pps: pieces per second, realistic max ~12, hard cap at 30
  IF NEW.pps IS NULL OR NEW.pps < 0 OR NEW.pps > 30 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid pps (%).', NEW.pps;
  END IF;

  -- apm: attacks per minute, hard cap at 1000
  IF NEW.apm IS NULL OR NEW.apm < 0 OR NEW.apm > 1000 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid apm (%).', NEW.apm;
  END IF;

  -- 3. Required content
  IF NEW.actions_count IS NULL OR NEW.actions_count < 1 OR NEW.actions_count > 1000000 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid actions_count (%).', NEW.actions_count;
  END IF;

  IF NEW.compressed_actions IS NULL OR length(NEW.compressed_actions) < 4 OR length(NEW.compressed_actions) > 5000000 THEN
    RAISE EXCEPTION 'Replay validation failed: compressed_actions size out of range (%).', length(NEW.compressed_actions);
  END IF;

  IF NEW.checksum IS NULL OR length(NEW.checksum) < 4 OR length(NEW.checksum) > 256 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid checksum';
  END IF;

  IF NEW.seed IS NULL OR length(NEW.seed) < 1 OR length(NEW.seed) > 256 THEN
    RAISE EXCEPTION 'Replay validation failed: invalid seed';
  END IF;

  -- 4. Game mode whitelist (extensible)
  IF NEW.game_mode IS NULL OR NEW.game_mode NOT IN (
    'sprint', 'sprint40', '40lines', 'sprint_40',
    'ultra2min', 'ultra', 'timeAttack2', 'timeAttack',
    'marathon', 'zen', 'master', 'practice',
    '1v1', 'team', 'ranked', 'tournament', 'battle',
    'custom', '4w', '4wide'
  ) THEN
    RAISE EXCEPTION 'Replay validation failed: unknown game_mode (%).', NEW.game_mode;
  END IF;

  -- 5. Cross-field sanity: actions_count vs duration (cap pieces-per-second)
  IF NEW.duration_seconds > 0 AND (NEW.actions_count::numeric / NEW.duration_seconds) > 200 THEN
    RAISE EXCEPTION 'Replay validation failed: action rate implausible (% per second).',
      round(NEW.actions_count::numeric / NEW.duration_seconds, 2);
  END IF;

  -- 6. place_actions_count (V4) sanity
  IF NEW.place_actions_count IS NOT NULL AND (NEW.place_actions_count < 0 OR NEW.place_actions_count > 500000) THEN
    RAISE EXCEPTION 'Replay validation failed: invalid place_actions_count';
  END IF;

  -- 7. Clients cannot self-mark featured/world_record
  IF NOT _is_service THEN
    IF COALESCE(NEW.is_world_record, false) = true THEN
      NEW.is_world_record := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_replay_insert() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_validate_compressed_replays ON public.compressed_replays;
CREATE TRIGGER trg_validate_compressed_replays
  BEFORE INSERT ON public.compressed_replays
  FOR EACH ROW EXECUTE FUNCTION public.validate_replay_insert();

-- Lighter validator for legacy game_replays_new (different column set)
CREATE OR REPLACE FUNCTION public.validate_legacy_replay_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_service boolean := (auth.role() = 'service_role');
BEGIN
  IF NOT _is_service THEN
    IF _caller IS NULL OR NEW.user_id IS DISTINCT FROM _caller THEN
      RAISE EXCEPTION 'Replay validation failed: user mismatch';
    END IF;
  END IF;

  IF NEW.final_score < 0 OR NEW.final_score > 100000000 THEN
    RAISE EXCEPTION 'Invalid final_score';
  END IF;
  IF NEW.final_lines < 0 OR NEW.final_lines > 100000 THEN
    RAISE EXCEPTION 'Invalid final_lines';
  END IF;
  IF NEW.duration < 0 OR NEW.duration > 86400000 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;
  IF NEW.pps < 0 OR NEW.pps > 30 THEN
    RAISE EXCEPTION 'Invalid pps';
  END IF;
  IF NEW.apm < 0 OR NEW.apm > 1000 THEN
    RAISE EXCEPTION 'Invalid apm';
  END IF;

  IF NOT _is_service AND COALESCE(NEW.is_world_record, false) = true THEN
    NEW.is_world_record := false;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_legacy_replay_insert() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_validate_game_replays_new ON public.game_replays_new;
CREATE TRIGGER trg_validate_game_replays_new
  BEFORE INSERT ON public.game_replays_new
  FOR EACH ROW EXECUTE FUNCTION public.validate_legacy_replay_insert();
