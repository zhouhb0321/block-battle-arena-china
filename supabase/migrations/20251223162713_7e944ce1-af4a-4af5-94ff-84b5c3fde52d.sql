-- 1. 修复 upsert_user_session 函数，使用 extensions.digest()
CREATE OR REPLACE FUNCTION public.upsert_user_session(
  _user_id uuid, 
  _session_token text, 
  _last_activity timestamp with time zone, 
  _expires_at timestamp with time zone, 
  _user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _token_hash text;
BEGIN
  -- 使用完整路径调用 digest 函数（pgcrypto 在 extensions schema）
  _token_hash := encode(extensions.digest(_session_token::bytea, 'sha256'), 'hex');
  
  -- Upsert with hashed token
  INSERT INTO user_sessions (
    user_id, session_token, session_token_hash, last_activity, expires_at, user_agent
  ) VALUES (
    _user_id, _session_token, _token_hash, _last_activity, _expires_at, _user_agent
  )
  ON CONFLICT (session_token)
  DO UPDATE SET
    user_id = _user_id,
    session_token_hash = _token_hash,
    last_activity = _last_activity,
    expires_at = _expires_at,
    user_agent = _user_agent;
END;
$$;

-- 2. 更新 expires_at 默认值为 4 小时
ALTER TABLE user_sessions 
ALTER COLUMN expires_at SET DEFAULT (now() + '04:00:00'::interval);

-- 3. 清理过期超过7天的会话记录
DELETE FROM user_sessions 
WHERE expires_at < now() - interval '7 days';

-- 添加注释
COMMENT ON FUNCTION public.upsert_user_session IS '安全地插入/更新用户会话，使用 SHA-256 哈希会话令牌';