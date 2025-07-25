-- Fix critical RLS and database security issues

-- 1. Create proper user roles system to avoid admin hardcoding
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to check user roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- 3. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin');
$$;

-- 4. Fix overly permissive RLS policies

-- Replace the hardcoded admin email check with proper role-based access
DROP POLICY IF EXISTS "Only admins can view user session logs" ON public.user_session_logs;
CREATE POLICY "Only admins can view user session logs" 
ON public.user_session_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can insert admin activity logs" ON public.admin_activity_logs;
CREATE POLICY "Only admins can insert admin activity logs" 
ON public.admin_activity_logs 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can view admin activity logs" ON public.admin_activity_logs;
CREATE POLICY "Only admins can view admin activity logs" 
ON public.admin_activity_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- 5. Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- 6. Strengthen other permissive policies

-- Fix user_profiles to prevent viewing other users' profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Add admin access to user profiles for moderation
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- 7. Add security constraints

-- Add constraints to prevent malicious data
ALTER TABLE public.user_profiles 
ADD CONSTRAINT username_length_check CHECK (char_length(username) BETWEEN 3 AND 20),
ADD CONSTRAINT username_format_check CHECK (username ~ '^[a-zA-Z0-9_-]+$');

-- Add rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    attempt_type TEXT NOT NULL,
    attempts INTEGER DEFAULT 1,
    first_attempt TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT now(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    UNIQUE(ip_address, attempt_type)
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system to manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- 8. Add security event logging table
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- System can insert security events
CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 9. Create trigger to log security-sensitive changes
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.security_events (user_id, event_type, event_data)
    VALUES (auth.uid(), TG_TABLE_NAME || '_' || TG_OP, to_jsonb(NEW));
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add security logging to sensitive tables
CREATE TRIGGER user_roles_security_log 
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

CREATE TRIGGER user_profiles_security_log 
    AFTER UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

-- 10. Insert initial admin user (replace with actual admin email)
-- This should be updated with the real admin email
INSERT INTO public.user_roles (user_id, role, granted_by) 
SELECT id, 'admin', id 
FROM auth.users 
WHERE email = 'admin@tetris.com' 
ON CONFLICT (user_id, role) DO NOTHING;