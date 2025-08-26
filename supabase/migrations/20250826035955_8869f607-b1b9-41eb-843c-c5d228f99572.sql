-- Fix security warnings from linter
-- 1. Fix function search path issues

CREATE OR REPLACE FUNCTION public.audit_subscribers_access()
RETURNS trigger AS $$
BEGIN
    -- Log sensitive data access attempts
    INSERT INTO public.security_events (
        user_id, 
        event_type, 
        event_data, 
        ip_address
    ) VALUES (
        auth.uid(),
        'subscribers_access',
        jsonb_build_object(
            'table', 'subscribers',
            'operation', TG_OP,
            'accessed_user_id', COALESCE(NEW.user_id, OLD.user_id),
            'accessed_email', COALESCE(NEW.email, OLD.email)
        ),
        inet_client_addr()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the subscription status function
DROP FUNCTION IF EXISTS public.get_user_subscription_status(uuid);

CREATE OR REPLACE FUNCTION public.get_user_subscription_status(check_user_id uuid DEFAULT auth.uid())
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- Only allow users to check their own status or admins to check any user
    IF check_user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Cannot check other users subscription status';
    END IF;
    
    SELECT json_build_object(
        'subscribed', s.subscribed,
        'subscription_tier', s.subscription_tier,
        'subscription_end', s.subscription_end,
        'friend_limit', s.friend_limit,
        'username_changes_used', s.username_changes_used
    ) INTO result
    FROM public.subscribers s
    WHERE s.user_id = check_user_id;
    
    -- Return default values if no subscription record found
    IF result IS NULL THEN
        result := json_build_object(
            'subscribed', false,
            'subscription_tier', null,
            'subscription_end', null,
            'friend_limit', 50,
            'username_changes_used', 0
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the view with a security definer function instead
DROP VIEW IF EXISTS public.subscribers_safe;

CREATE OR REPLACE FUNCTION public.get_subscribers_safe()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    masked_email text,
    stripe_status text,
    subscribed boolean,
    subscription_tier text,
    subscription_end timestamptz,
    friend_limit integer,
    username_changes_used integer,
    created_at timestamptz,
    updated_at timestamptz
) AS $$
BEGIN
    -- Only allow authenticated users to access their own data or admins to access all
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: Authentication required';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        substr(s.email, 1, 3) || '***@' || split_part(s.email, '@', 2) as masked_email,
        CASE 
            WHEN s.stripe_customer_id IS NOT NULL THEN 'has_stripe_id'
            ELSE 'no_stripe_id'
        END as stripe_status,
        s.subscribed,
        s.subscription_tier,
        s.subscription_end,
        s.friend_limit,
        s.username_changes_used,
        s.created_at,
        s.updated_at
    FROM public.subscribers s
    WHERE 
        s.user_id = auth.uid() OR 
        (s.email = auth.email() AND s.user_id IS NULL) OR
        public.is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;