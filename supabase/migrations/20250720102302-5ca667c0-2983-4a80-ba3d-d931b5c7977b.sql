
-- 创建订阅者表用于跟踪付费用户
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT, -- 'monthly' 或 'yearly'
  subscription_end TIMESTAMPTZ,
  friend_limit INTEGER DEFAULT 50, -- 好友限制，付费用户可以更高
  username_changes_used INTEGER DEFAULT 0, -- 已使用的用户名更改次数
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建好友关系表
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- 创建好友请求表
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建私信表
CREATE TABLE public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  conversation_id UUID, -- 用于群组对话，简单实现可以为NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建陌生人消息计数表（限制向陌生人发送消息的次数）
CREATE TABLE public.stranger_message_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- 启用行级安全
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stranger_message_counts ENABLE ROW LEVEL SECURITY;

-- 订阅者表的RLS策略
CREATE POLICY "Users can view their own subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own subscription" ON public.subscribers
FOR UPDATE
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Service can manage subscriptions" ON public.subscribers
FOR ALL
USING (auth.role() = 'service_role');

-- 好友关系表的RLS策略
CREATE POLICY "Users can view their friendships" ON public.friendships
FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create their friendships" ON public.friendships
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their friendships" ON public.friendships
FOR DELETE
USING (user_id = auth.uid());

-- 好友请求表的RLS策略
CREATE POLICY "Users can view their friend requests" ON public.friend_requests
FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create friend requests" ON public.friend_requests
FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update friend requests they received" ON public.friend_requests
FOR UPDATE
USING (receiver_id = auth.uid());

-- 私信表的RLS策略
CREATE POLICY "Users can view their messages" ON public.private_messages
FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.private_messages
FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages" ON public.private_messages
FOR UPDATE
USING (receiver_id = auth.uid());

-- 陌生人消息计数表的RLS策略
CREATE POLICY "Users can view their stranger message counts" ON public.stranger_message_counts
FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can update their stranger message counts" ON public.stranger_message_counts
FOR ALL
USING (sender_id = auth.uid());

-- 更新用户资料表，添加订阅相关字段
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS friend_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS username_changes_used INTEGER DEFAULT 0;

-- 创建触发器自动更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_friend_requests_updated_at 
    BEFORE UPDATE ON public.friend_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at 
    BEFORE UPDATE ON public.subscribers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
