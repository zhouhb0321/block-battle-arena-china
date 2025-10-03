-- 添加 place_actions_count 和 is_playable 列到 compressed_replays 表
ALTER TABLE compressed_replays 
ADD COLUMN IF NOT EXISTS place_actions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_playable BOOLEAN DEFAULT true;

-- 为现有记录设置默认值（假设旧记录可播放）
UPDATE compressed_replays 
SET place_actions_count = 0, 
    is_playable = (actions_count > 0)
WHERE place_actions_count IS NULL;

-- 添加注释
COMMENT ON COLUMN compressed_replays.place_actions_count IS '录像中方块锁定动作的数量，用于判断录像是否可播放';
COMMENT ON COLUMN compressed_replays.is_playable IS '录像是否可播放（基于 place_actions_count > 0）';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_compressed_replays_playable ON compressed_replays(is_playable) WHERE is_playable = true;
CREATE INDEX IF NOT EXISTS idx_compressed_replays_place_actions ON compressed_replays(place_actions_count);