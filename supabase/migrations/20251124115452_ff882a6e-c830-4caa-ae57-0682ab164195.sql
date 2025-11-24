-- Extend league_rankings table for Glicko-2 rating system
ALTER TABLE league_rankings
ADD COLUMN IF NOT EXISTS rating_deviation NUMERIC DEFAULT 350.0,
ADD COLUMN IF NOT EXISTS volatility NUMERIC DEFAULT 0.06,
ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS provisional BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN league_rankings.rating_deviation IS 'Glicko-2 RD: Lower values indicate more reliable ratings (default: 350)';
COMMENT ON COLUMN league_rankings.volatility IS 'Glicko-2 volatility: Rating consistency over time (default: 0.06)';
COMMENT ON COLUMN league_rankings.provisional IS 'True if player has fewer than 10 matches (unreliable rating)';

-- Create index for efficient matchmaking queries (without time-based filter)
CREATE INDEX IF NOT EXISTS idx_league_rankings_rating_rd 
ON league_rankings(elo_rating, rating_deviation)
WHERE provisional = false;