-- 清空旧的录像数据和相关书签，准备使用全新的V4格式
TRUNCATE TABLE public.replay_bookmarks CASCADE;
TRUNCATE TABLE public.compressed_replays CASCADE;

-- 添加注释说明新格式要求
COMMENT ON COLUMN public.compressed_replays.version IS 'Replay format version. V4.0+ uses binary format with keyframes and checksums';
COMMENT ON COLUMN public.compressed_replays.compressed_actions IS 'Base64-encoded binary replay data (V4.0+) or legacy format (V3.0)';
COMMENT ON COLUMN public.compressed_replays.checksum IS 'SHA-256 checksum (first 16 chars) for data integrity verification';
COMMENT ON COLUMN public.compressed_replays.place_actions_count IS 'Number of piece lock events (V4: LOCK opcodes)';
COMMENT ON COLUMN public.compressed_replays.is_playable IS 'Whether replay can be played back (requires place_actions_count > 0 for V4)';