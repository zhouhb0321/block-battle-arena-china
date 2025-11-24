-- 徽章定义表
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('beginner', 'advanced', 'master', 'special')),
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  icon_url TEXT,
  unlock_condition JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户徽章表
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(badge_id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- 索引
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_unlocked_at ON user_badges(unlocked_at DESC);
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);

-- RLS 策略
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view badges"
  ON badges FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their featured badges"
  ON user_badges FOR UPDATE
  USING (auth.uid() = user_id);

-- 初始化徽章数据
INSERT INTO badges (badge_id, name_en, name_zh, description_en, description_zh, category, rarity, unlock_condition) VALUES
  ('first_login', 'First Steps', '初次登录', 'Logged in for the first time', '完成首次登录', 'beginner', 'common', '{"type": "login_count", "threshold": 1}'),
  ('first_win', 'First Victory', '初战告捷', 'Won your first game', '赢得第一场游戏', 'beginner', 'common', '{"type": "games_won", "threshold": 1}'),
  ('ten_wins', 'Winning Streak', '连战连捷', 'Won 10 games', '赢得10场游戏', 'beginner', 'common', '{"type": "games_won", "threshold": 10}'),
  ('fifty_games', 'Regular Player', '常驻玩家', 'Played 50 games', '完成50场游戏', 'advanced', 'rare', '{"type": "games_played", "threshold": 50}'),
  ('century_club', 'Century Club', '百场老将', 'Played 100 games', '完成100场游戏', 'advanced', 'rare', '{"type": "games_played", "threshold": 100}'),
  ('speed_demon_90', 'Quick Learner', '速度学徒', 'Complete 40L in under 90 seconds', '在90秒内完成40行消除', 'advanced', 'rare', '{"type": "sprint_time", "threshold": 90, "game_mode": "sprint_40"}'),
  ('speed_demon_60', 'Speed Demon', '极速之王', 'Complete 40L in under 60 seconds', '在60秒内完成40行消除', 'advanced', 'epic', '{"type": "sprint_time", "threshold": 60, "game_mode": "sprint_40"}'),
  ('speed_demon_45', 'Lightning Fast', '闪电侠', 'Complete 40L in under 45 seconds', '在45秒内完成40行消除', 'master', 'legendary', '{"type": "sprint_time", "threshold": 45, "game_mode": "sprint_40"}'),
  ('high_finesse', 'Precise Player', '精准操作', 'Achieve 95% Finesse in a game', '在一场游戏中达到95%精细操作率', 'advanced', 'epic', '{"type": "finesse_high", "threshold": 95}'),
  ('master_finesse', 'Master of Finesse', '操作大师', 'Achieve 100% Finesse in a game', '在一场游戏中达到100%精细操作率', 'master', 'legendary', '{"type": "finesse_perfect", "threshold": 100}'),
  ('rank_b', 'Rising Star', '冉冉新星', 'Reach B rank', '达到B段位', 'advanced', 'rare', '{"type": "rank_achieved", "threshold": "B"}'),
  ('rank_a', 'Advanced Player', '高级玩家', 'Reach A rank', '达到A段位', 'advanced', 'epic', '{"type": "rank_achieved", "threshold": "A"}'),
  ('rank_s', 'Expert Player', '专家级玩家', 'Reach S rank', '达到S段位', 'master', 'epic', '{"type": "rank_achieved", "threshold": "S"}'),
  ('rank_splus', 'Tetris God', '方块之神', 'Reach S+ rank', '达到S+段位', 'master', 'legendary', '{"type": "rank_achieved", "threshold": "S+"}'),
  ('social_butterfly', 'Social Butterfly', '社交达人', 'Add 10 friends', '添加10个好友', 'advanced', 'rare', '{"type": "friend_count", "threshold": 10}'),
  ('early_adopter', 'Early Adopter', '早期玩家', 'Registered in 2025', '在2025年注册', 'special', 'legendary', '{"type": "registration_year", "threshold": 2025}');