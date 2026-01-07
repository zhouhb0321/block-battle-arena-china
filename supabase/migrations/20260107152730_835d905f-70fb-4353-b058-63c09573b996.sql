-- 1. 为 room_messages 表启用完整行复制（用于实时更新）
ALTER TABLE room_messages REPLICA IDENTITY FULL;

-- 2. 将 room_messages 添加到 supabase_realtime 发布
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;

-- 3. 为 battle_rooms 添加过期时间字段
ALTER TABLE battle_rooms 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes');

-- 4. 更新现有房间的过期时间
UPDATE battle_rooms 
SET expires_at = created_at + INTERVAL '15 minutes'
WHERE expires_at IS NULL AND status = 'waiting';

-- 5. 创建自动清理过期房间的函数
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 删除过期的空房间（无玩家且超过15分钟）
  DELETE FROM battle_rooms 
  WHERE status = 'waiting' 
    AND current_players = 0 
    AND created_at < NOW() - INTERVAL '15 minutes';
  
  -- 标记超时的等待房间（有玩家但超过60分钟未开始）
  UPDATE battle_rooms 
  SET status = 'expired'
  WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '60 minutes';
  
  -- 删除超过24小时的已完成/过期房间
  DELETE FROM battle_rooms 
  WHERE status IN ('finished', 'expired') 
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;