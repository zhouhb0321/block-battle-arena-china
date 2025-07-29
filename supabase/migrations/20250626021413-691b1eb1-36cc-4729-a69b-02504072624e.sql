
-- 创建游戏回放表，存储键盘输入序列而不是视频
CREATE TABLE IF NOT EXISTS public.game_replays_new (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_mode TEXT NOT NULL DEFAULT 'sprint_40',
  final_score INTEGER NOT NULL DEFAULT 0,
  final_lines INTEGER NOT NULL DEFAULT 0,
  final_level INTEGER NOT NULL DEFAULT 1,
  pps DECIMAL(5,2) NOT NULL DEFAULT 0,
  apm DECIMAL(5,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  replay_data JSONB NOT NULL, -- 存储键盘输入序列和时间戳
  is_personal_best BOOLEAN DEFAULT FALSE,
  is_world_record BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建用户设置表，存储自定义按键和游戏设置
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  controls JSONB NOT NULL DEFAULT '{
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight", 
    "softDrop": "ArrowDown",
    "hardDrop": "Space",
    "rotateClockwise": "ArrowUp",
    "rotateCounterclockwise": "KeyZ",
    "rotate180": "KeyA",
    "hold": "KeyC",
    "pause": "Escape"
  }',
  das INTEGER NOT NULL DEFAULT 167,
  arr INTEGER NOT NULL DEFAULT 33,
  sdf INTEGER NOT NULL DEFAULT 20,
  enable_ghost BOOLEAN NOT NULL DEFAULT TRUE,
  enable_sound BOOLEAN NOT NULL DEFAULT TRUE,
  master_volume INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 启用行级安全
ALTER TABLE public.game_replays_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 回放表的RLS策略  
CREATE POLICY "Users can view their own replays" ON public.game_replays_new
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create their own replays" ON public.game_replays_new
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "World record replays are public" ON public.game_replays_new
  FOR SELECT USING (is_world_record = true);

-- 用户设置表的RLS策略
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- 为需要的表创建更新时间触发器
CREATE TRIGGER set_updated_at_user_settings
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 更新用户注册函数，创建用户设置记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新现有的用户资料记录
  INSERT INTO public.user_profiles (id, username, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'), NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  
  -- 创建用户设置记录
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建用户注册触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
