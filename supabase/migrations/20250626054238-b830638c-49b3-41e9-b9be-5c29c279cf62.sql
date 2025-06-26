
-- 为用户配置表添加用户名修改次数跟踪字段
ALTER TABLE public.user_profiles 
ADD COLUMN username_changes_count INTEGER DEFAULT 0,
ADD COLUMN username_last_changed_at TIMESTAMP WITH TIME ZONE;

-- 为用户配置表添加用户类型字段，用于标识付费和捐赠用户
ALTER TABLE public.user_profiles 
ADD COLUMN user_type TEXT DEFAULT 'regular' CHECK (user_type IN ('regular', 'premium', 'donor', 'vip'));
