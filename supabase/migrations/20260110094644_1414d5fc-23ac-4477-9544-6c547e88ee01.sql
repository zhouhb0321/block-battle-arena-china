-- Add replay save control fields to battle_rooms
ALTER TABLE battle_rooms ADD COLUMN IF NOT EXISTS save_replay boolean DEFAULT false;
ALTER TABLE battle_rooms ADD COLUMN IF NOT EXISTS tournament_type text;
-- tournament_type values: 'elimination', 'group_stage', 'finals', 'practice', null

-- Add save category fields to compressed_replays
ALTER TABLE compressed_replays ADD COLUMN IF NOT EXISTS save_category text;
-- save_category values: 'top500', 'personal_best', 'ranked', 'tournament', 'admin'

ALTER TABLE compressed_replays ADD COLUMN IF NOT EXISTS leaderboard_rank integer;

-- Create index for faster top 500 queries
CREATE INDEX IF NOT EXISTS idx_compressed_replays_sprint40_duration 
ON compressed_replays (duration_seconds ASC) 
WHERE game_mode = 'sprint40';

CREATE INDEX IF NOT EXISTS idx_compressed_replays_ultra_score 
ON compressed_replays (final_score DESC) 
WHERE game_mode IN ('timeAttack2', 'ultra2min');

-- Create index for personal best queries
CREATE INDEX IF NOT EXISTS idx_compressed_replays_user_mode 
ON compressed_replays (user_id, game_mode);

-- Comment for documentation
COMMENT ON COLUMN battle_rooms.save_replay IS 'Admin-controlled flag to force save all replays in this room';
COMMENT ON COLUMN battle_rooms.tournament_type IS 'Type of tournament: elimination, group_stage, finals, practice';
COMMENT ON COLUMN compressed_replays.save_category IS 'Why this replay was saved: top500, personal_best, ranked, tournament, admin';
COMMENT ON COLUMN compressed_replays.leaderboard_rank IS 'Rank on the leaderboard at time of save (for top500 category)';