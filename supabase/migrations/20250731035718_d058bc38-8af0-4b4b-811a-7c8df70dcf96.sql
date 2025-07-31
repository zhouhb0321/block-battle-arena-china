-- Phase 1: 创建优化的录像回放系统数据库结构

-- 1. 创建排位赛匹配表
CREATE TABLE public.ranked_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.battle_rooms(id),
  season_id UUID,
  player1_id UUID NOT NULL,
  player2_id UUID NOT NULL,
  player1_rating INTEGER NOT NULL DEFAULT 1200,
  player2_rating INTEGER NOT NULL DEFAULT 1200,
  winner_id UUID,
  best_of INTEGER NOT NULL DEFAULT 5,
  current_game INTEGER NOT NULL DEFAULT 1,
  player1_wins INTEGER NOT NULL DEFAULT 0,
  player2_wins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'cancelled')),
  match_type TEXT NOT NULL DEFAULT '1v1' CHECK (match_type IN ('1v1', 'ranked')),
  seed TEXT NOT NULL, -- 用于生成相同方块序列的种子
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- 2. 创建单局游戏记录表
CREATE TABLE public.match_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.ranked_matches(id),
  game_number INTEGER NOT NULL,
  winner_id UUID NOT NULL,
  loser_id UUID NOT NULL,
  winner_score INTEGER NOT NULL DEFAULT 0,
  loser_score INTEGER NOT NULL DEFAULT 0,
  winner_lines INTEGER NOT NULL DEFAULT 0,
  loser_lines INTEGER NOT NULL DEFAULT 0,
  winner_pps NUMERIC NOT NULL DEFAULT 0,
  loser_pps NUMERIC NOT NULL DEFAULT 0,
  winner_apm NUMERIC NOT NULL DEFAULT 0,
  loser_apm NUMERIC NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  attacks_sent JSONB NOT NULL DEFAULT '{}', -- {"player1": 45, "player2": 32}
  attacks_received JSONB NOT NULL DEFAULT '{}',
  game_seed TEXT NOT NULL, -- 该局游戏的方块序列种子
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 创建压缩录像数据表
CREATE TABLE public.compressed_replays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.ranked_matches(id),
  game_id UUID REFERENCES public.match_games(id),
  user_id UUID NOT NULL,
  opponent_id UUID,
  game_mode TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'single' CHECK (game_type IN ('single', 'ranked', '1v1')),
  
  -- 游戏元数据
  seed TEXT NOT NULL, -- 方块序列种子
  initial_board JSONB NOT NULL DEFAULT '[]',
  game_settings JSONB NOT NULL DEFAULT '{}',
  
  -- 压缩后的动作数据 (binary encoded as base64)
  compressed_actions BYTEA NOT NULL,
  actions_count INTEGER NOT NULL DEFAULT 0,
  compression_ratio NUMERIC NOT NULL DEFAULT 0,
  
  -- 游戏统计
  final_score INTEGER NOT NULL DEFAULT 0,
  final_lines INTEGER NOT NULL DEFAULT 0,
  final_level INTEGER NOT NULL DEFAULT 1,
  pps NUMERIC NOT NULL DEFAULT 0,
  apm NUMERIC NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- 特殊记录标记
  is_personal_best BOOLEAN NOT NULL DEFAULT FALSE,
  is_world_record BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 回放元数据
  checksum TEXT NOT NULL, -- 用于验证数据完整性
  version TEXT NOT NULL DEFAULT '1.0',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. 创建回放书签表 (用于标记重要时刻)
CREATE TABLE public.replay_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  replay_id UUID NOT NULL REFERENCES public.compressed_replays(id),
  user_id UUID NOT NULL,
  timestamp_ms INTEGER NOT NULL, -- 在录像中的时间戳
  bookmark_type TEXT NOT NULL CHECK (bookmark_type IN ('tspin', 'tetris', 'combo', 'attack', 'defense', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. 更新现有的league_rankings表以支持ELO积分系统
ALTER TABLE public.league_rankings 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN IF NOT EXISTS peak_rating INTEGER NOT NULL DEFAULT 1200,
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS matches_played INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS promotion_protection_games INTEGER NOT NULL DEFAULT 0;

-- 6. 启用RLS
ALTER TABLE public.ranked_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compressed_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replay_bookmarks ENABLE ROW LEVEL SECURITY;

-- 7. 创建RLS策略

-- ranked_matches policies
CREATE POLICY "Users can view their own matches" 
ON public.ranked_matches 
FOR SELECT 
USING (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY "Users can create ranked matches" 
ON public.ranked_matches 
FOR INSERT 
WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

CREATE POLICY "Users can update their own matches" 
ON public.ranked_matches 
FOR UPDATE 
USING (player1_id = auth.uid() OR player2_id = auth.uid());

-- match_games policies
CREATE POLICY "Users can view their game records" 
ON public.match_games 
FOR SELECT 
USING (winner_id = auth.uid() OR loser_id = auth.uid());

CREATE POLICY "System can insert game records" 
ON public.match_games 
FOR INSERT 
WITH CHECK (TRUE);

-- compressed_replays policies
CREATE POLICY "Users can view their own replays" 
ON public.compressed_replays 
FOR SELECT 
USING (user_id = auth.uid() OR opponent_id = auth.uid());

CREATE POLICY "Featured replays are public" 
ON public.compressed_replays 
FOR SELECT 
USING (is_featured = TRUE OR is_world_record = TRUE);

CREATE POLICY "Users can create their own replays" 
ON public.compressed_replays 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- replay_bookmarks policies
CREATE POLICY "Users can manage their own bookmarks" 
ON public.replay_bookmarks 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Public bookmarks are viewable" 
ON public.replay_bookmarks 
FOR SELECT 
USING (is_public = TRUE);

-- 8. 创建索引以优化查询性能
CREATE INDEX idx_ranked_matches_players ON public.ranked_matches(player1_id, player2_id);
CREATE INDEX idx_ranked_matches_status ON public.ranked_matches(status, created_at);
CREATE INDEX idx_match_games_match_id ON public.match_games(match_id, game_number);
CREATE INDEX idx_compressed_replays_user_mode ON public.compressed_replays(user_id, game_mode, created_at DESC);
CREATE INDEX idx_compressed_replays_featured ON public.compressed_replays(is_featured, is_world_record, created_at DESC);
CREATE INDEX idx_replay_bookmarks_replay ON public.replay_bookmarks(replay_id, timestamp_ms);

-- 9. 创建触发器以自动更新timestamps
CREATE TRIGGER update_compressed_replays_updated_at
  BEFORE UPDATE ON public.compressed_replays
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 10. 创建函数用于计算ELO积分
CREATE OR REPLACE FUNCTION public.calculate_elo_change(
  winner_rating INTEGER,
  loser_rating INTEGER,
  k_factor INTEGER DEFAULT 32
) RETURNS TABLE(winner_new_rating INTEGER, loser_new_rating INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
  winner_change INTEGER;
  loser_change INTEGER;
BEGIN
  -- 计算期望得分
  expected_winner := 1.0 / (1.0 + POWER(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 - expected_winner;
  
  -- 计算积分变化
  winner_change := ROUND(k_factor * (1.0 - expected_winner));
  loser_change := ROUND(k_factor * (0.0 - expected_loser));
  
  -- 返回新积分
  winner_new_rating := winner_rating + winner_change;
  loser_new_rating := loser_rating + loser_change;
  
  RETURN NEXT;
END;
$$;