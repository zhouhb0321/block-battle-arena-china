
-- Create admin activity logs table
CREATE TABLE public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users,
  target_username TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user session logs table
CREATE TABLE public.user_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  username TEXT NOT NULL,
  session_type TEXT NOT NULL, -- 'login', 'logout', 'game_start', 'game_end'
  game_mode TEXT,
  session_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin activity logs (only admins can view)
CREATE POLICY "Only admins can view admin activity logs" 
  ON public.admin_activity_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND email = 'admin@tetris.com'
    )
  );

CREATE POLICY "Only admins can insert admin activity logs" 
  ON public.admin_activity_logs 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND email = 'admin@tetris.com'
    )
  );

-- Create policies for user session logs (only admins can view)
CREATE POLICY "Only admins can view user session logs" 
  ON public.user_session_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND email = 'admin@tetris.com'
    )
  );

CREATE POLICY "Anyone can insert user session logs" 
  ON public.user_session_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_admin_activity_logs_admin_user_id ON public.admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX idx_user_session_logs_user_id ON public.user_session_logs(user_id);
CREATE INDEX idx_user_session_logs_session_type ON public.user_session_logs(session_type);
CREATE INDEX idx_user_session_logs_created_at ON public.user_session_logs(created_at DESC);
