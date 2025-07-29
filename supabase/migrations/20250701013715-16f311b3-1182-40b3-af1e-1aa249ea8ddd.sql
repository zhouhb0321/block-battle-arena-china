
-- 创建实时对战房间表
CREATE TABLE public.battle_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(8) UNIQUE NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('versus', 'battle_royale', 'league')),
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb
);

-- 创建房间玩家表
CREATE TABLE public.battle_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.battle_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  username VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'disconnected')),
  score INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  eliminated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);

-- 创建对战记录表
CREATE TABLE public.battle_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.battle_rooms(id) ON DELETE CASCADE NOT NULL,
  match_number INTEGER NOT NULL,
  winner_id UUID REFERENCES auth.users,
  loser_id UUID REFERENCES auth.users,
  winner_score INTEGER NOT NULL DEFAULT 0,
  loser_score INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  attack_sent INTEGER NOT NULL DEFAULT 0,
  attack_received INTEGER NOT NULL DEFAULT 0,
  lines_cleared INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建联盟系统表
CREATE TABLE public.league_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 创建联盟排名表
CREATE TABLE public.league_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID REFERENCES public.league_seasons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1500,
  rank_tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

-- 为现有的 game_replays 表添加新字段（如果不存在的话）
ALTER TABLE public.game_replays 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.battle_rooms(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 启用实时更新
ALTER TABLE public.battle_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.battle_participants REPLICA IDENTITY FULL;
ALTER TABLE public.battle_records REPLICA IDENTITY FULL;

-- 添加到实时发布
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_records;

-- 创建RLS策略
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_rankings ENABLE ROW LEVEL SECURITY;

-- 对战房间策略
CREATE POLICY "Users can view battle rooms they participate in" 
  ON public.battle_rooms FOR SELECT 
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.battle_participants 
      WHERE room_id = battle_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create battle rooms" 
  ON public.battle_rooms FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms" 
  ON public.battle_rooms FOR UPDATE 
  USING (auth.uid() = created_by);

-- 参与者策略
CREATE POLICY "Users can view participants in their rooms" 
  ON public.battle_participants FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.battle_rooms 
      WHERE id = room_id AND (
        created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.battle_participants bp2 
          WHERE bp2.room_id = battle_rooms.id AND bp2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join battle rooms" 
  ON public.battle_participants FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" 
  ON public.battle_participants FOR UPDATE 
  USING (user_id = auth.uid());

-- 对战记录策略
CREATE POLICY "Users can view their battle records" 
  ON public.battle_records FOR SELECT 
  USING (winner_id = auth.uid() OR loser_id = auth.uid());

CREATE POLICY "System can insert battle records" 
  ON public.battle_records FOR INSERT 
  WITH CHECK (true);

-- 联盟策略
CREATE POLICY "Anyone can view league seasons" 
  ON public.league_seasons FOR SELECT 
  USING (true);

CREATE POLICY "Users can view league rankings" 
  ON public.league_rankings FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own ranking" 
  ON public.league_rankings FOR UPDATE 
  USING (user_id = auth.uid());

-- 创建索引以提高性能
CREATE INDEX idx_battle_rooms_code ON public.battle_rooms(room_code);
CREATE INDEX idx_battle_rooms_status ON public.battle_rooms(status);
CREATE INDEX idx_battle_participants_room_user ON public.battle_participants(room_id, user_id);
CREATE INDEX idx_battle_records_room ON public.battle_records(room_id);
CREATE INDEX idx_league_rankings_season_rating ON public.league_rankings(season_id, rating DESC);

-- 创建触发器以自动更新时间戳
CREATE TRIGGER update_battle_rooms_updated_at 
  BEFORE UPDATE ON public.battle_rooms 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_league_rankings_updated_at 
  BEFORE UPDATE ON public.league_rankings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
