
-- 更新用户设置表，添加更多设置选项
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS background_music text DEFAULT '',
ADD COLUMN IF NOT EXISTS music_volume integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS back_to_menu text DEFAULT 'KeyB';

-- 更新控制设置的默认值，添加返回菜单键
UPDATE user_settings 
SET controls = jsonb_set(
    controls, 
    '{backToMenu}', 
    '"KeyB"'
) 
WHERE NOT (controls ? 'backToMenu');

-- 创建游戏模式表
CREATE TABLE IF NOT EXISTS game_modes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    target_lines integer,
    time_limit integer, -- 秒数
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 插入标准游戏模式
INSERT INTO game_modes (name, description, target_lines, time_limit) VALUES
('sprint_40', '40行冲刺', 40, NULL),
('sprint_80', '80行冲刺', 80, NULL),
('sprint_100', '100行冲刺', 100, NULL),
('ultra_2min', '2分钟挑战', NULL, 120),
('ultra_5min', '5分钟挑战', NULL, 300),
('endless', '无尽模式', NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- 更新游戏录像表，添加更多字段
ALTER TABLE game_replays_new 
ADD COLUMN IF NOT EXISTS game_settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS key_inputs jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS game_events jsonb DEFAULT '[]';

-- 创建用户个人最佳记录表
CREATE TABLE IF NOT EXISTS user_best_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    game_mode text NOT NULL,
    best_score integer DEFAULT 0,
    best_lines integer DEFAULT 0,
    best_time integer DEFAULT 0, -- 毫秒
    best_pps numeric DEFAULT 0,
    best_apm numeric DEFAULT 0,
    replay_id uuid REFERENCES game_replays_new(id),
    achieved_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, game_mode)
);

-- 启用行级安全
ALTER TABLE user_best_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_modes ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY "Users can view their own best records" 
    ON user_best_records FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own best records" 
    ON user_best_records FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own best records" 
    ON user_best_records FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view game modes" 
    ON game_modes FOR SELECT 
    TO authenticated, anon
    USING (true);

-- 创建触发器自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_best_records_updated_at 
    BEFORE UPDATE ON user_best_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
