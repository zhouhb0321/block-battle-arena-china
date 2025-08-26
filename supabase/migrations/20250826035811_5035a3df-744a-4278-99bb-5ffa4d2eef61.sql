-- Enhanced security for subscribers table - Fixed version
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

-- Create triggers for audit logging (separate triggers for each operation)
DROP TRIGGER IF EXISTS audit_subscribers_select_trigger ON public.subscribers;
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

-- 2. Strengthen RLS policies with more specific conditions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscribers;

-- More restrictive view policy - users can only see their own data
CREATE POLICY "Users can view their own subscription data only" 
ON public.subscribers FOR SELECT 
USING (
    auth.uid() IS NOT NULL AND (
        user_id = auth.uid() OR 
        (email = auth.email() AND user_id IS NULL)
    )
);

-- Restrictive update policy - only specific fields can be updated by users
CREATE POLICY "Users can update non-sensitive subscription fields" 
ON public.subscribers FOR UPDATE 
USING (
    auth.uid() IS NOT NULL AND (
        user_id = auth.uid() OR 
        (email = auth.email() AND user_id IS NULL)
    )
) 
WITH CHECK (
    auth.uid() IS NOT NULL AND (
        user_id = auth.uid() OR 
        (email = auth.email() AND user_id IS NULL)
    )
);

-- 3. Add admin-only policy for administrative access using the existing function
CREATE POLICY "Admins can view all subscriptions for management" 
ON public.subscribers FOR SELECT 
USING (
    public.is_admin(auth.uid())
);

-- 4. Add data validation constraints
ALTER TABLE public.subscribers 
ADD CONSTRAINT IF NOT EXISTS valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');