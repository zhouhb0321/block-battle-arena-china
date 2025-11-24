-- 添加自定义房间设置支持

-- 扩展 battle_rooms 表，添加自定义设置字段
ALTER TABLE battle_rooms 
ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{
  "gravity_level": 1,
  "garbage_multiplier": 1.0,
  "time_limit": null,
  "allow_hold": true,
  "starting_level": 1,
  "preset": "standard"
}'::jsonb,
ADD COLUMN IF NOT EXISTS room_password TEXT,
ADD COLUMN IF NOT EXISTS allow_spectators BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS spectator_count INTEGER DEFAULT 0;

-- 创建房间聊天消息表
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat', -- 'chat', 'system', 'join', 'leave'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES battle_rooms(id) ON DELETE CASCADE
);

-- 创建观战者表
CREATE TABLE IF NOT EXISTS room_spectators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_spectators_room_id ON room_spectators(room_id);

-- RLS 策略
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_spectators ENABLE ROW LEVEL SECURITY;

-- 房间成员可以查看和发送消息
CREATE POLICY "Room members can view messages"
  ON room_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_participants
      WHERE battle_participants.room_id = room_messages.room_id
      AND battle_participants.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM room_spectators
      WHERE room_spectators.room_id = room_messages.room_id
      AND room_spectators.user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages"
  ON room_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM battle_participants
        WHERE battle_participants.room_id = room_messages.room_id
        AND battle_participants.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM room_spectators
        WHERE room_spectators.room_id = room_messages.room_id
        AND room_spectators.user_id = auth.uid()
      )
    )
  );

-- 观战者策略
CREATE POLICY "Anyone can view spectators"
  ON room_spectators FOR SELECT
  USING (true);

CREATE POLICY "Users can join as spectators"
  ON room_spectators FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave as spectators"
  ON room_spectators FOR DELETE
  USING (user_id = auth.uid());

-- 添加评论
COMMENT ON TABLE room_messages IS '房间聊天消息表，存储房间内的文字聊天';
COMMENT ON TABLE room_spectators IS '房间观战者表，允许玩家以观众身份加入房间';
COMMENT ON COLUMN battle_rooms.custom_settings IS '自定义房间设置：重力等级、垃圾行倍率、时间限制、允许Hold等';
COMMENT ON COLUMN battle_rooms.room_password IS '房间密码，用于私密房间保护';
COMMENT ON COLUMN battle_rooms.allow_spectators IS '是否允许观战';
COMMENT ON COLUMN battle_rooms.spectator_count IS '当前观战者数量';