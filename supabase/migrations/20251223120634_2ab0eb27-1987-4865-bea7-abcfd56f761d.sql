-- 删除 version < 4.0 的旧格式回放记录
-- 这些旧版本回放无法正确播放

DELETE FROM compressed_replays
WHERE version < '4.0';

-- 添加注释
COMMENT ON TABLE compressed_replays IS '回放数据表 - 仅支持 V4.0+ 格式';