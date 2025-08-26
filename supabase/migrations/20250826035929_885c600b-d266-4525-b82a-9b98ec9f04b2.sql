-- Enhanced security for subscribers table - Final version
-- 1. Add audit logging function for sensitive data access

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS audit_subscribers_insert_trigger ON public.subscribers;
DROP TRIGGER IF EXISTS audit_subscribers_update_trigger ON public.subscribers;
DROP TRIGGER IF EXISTS audit_subscribers_delete_trigger ON public.subscribers;

CREATE TRIGGER audit_subscribers_insert_trigger
    AFTER INSERT ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.audit_subscribers_access();

CREATE TRIGGER audit_subscribers_update_trigger
    AFTER UPDATE ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.audit_subscribers_access();

CREATE TRIGGER audit_subscribers_delete_trigger
    AFTER DELETE ON public.subscribers
    FOR EACH ROW EXECUTE FUNCTION public.audit_subscribers_access();

-- 2. Add admin-only policy for administrative access if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscribers' 
        AND policyname = 'Admins can view all subscriptions for management'
    ) THEN
        CREATE POLICY "Admins can view all subscriptions for management" 
        ON public.subscribers FOR SELECT 
        USING (public.is_admin(auth.uid()));
    END IF;
END $$;

-- 3. Create a secure view for payment data with minimal exposure
CREATE OR REPLACE VIEW public.subscribers_safe AS
SELECT 
    id,
    user_id,
    substr(email, 1, 3) || '***@' || split_part(email, '@', 2) as masked_email,
    CASE 
        WHEN stripe_customer_id IS NOT NULL THEN 'has_stripe_id'
        ELSE 'no_stripe_id'
    END as stripe_status,
    subscribed,
    subscription_tier,
    subscription_end,
    friend_limit,
    username_changes_used,
    created_at,
    updated_at
FROM public.subscribers
WHERE 
    auth.uid() IS NOT NULL AND (
        user_id = auth.uid() OR 
        (email = auth.email() AND user_id IS NULL) OR
        public.is_admin(auth.uid())
    );

-- Grant appropriate permissions on the safe view
GRANT SELECT ON public.subscribers_safe TO authenticated;

-- 4. Create function to safely check subscription status
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
$$ LANGUAGE plpgsql SECURITY DEFINER;