import { supabase } from '@/integrations/supabase/client';

// Enhanced admin security logging
export const logAdminActivity = async (
  action: string, 
  targetUserId?: string, 
  details?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user for admin activity logging');
      return;
    }

    await supabase.from('admin_activity_logs').insert({
      admin_user_id: user.id,
      target_user_id: targetUserId || null,
      action_type: action,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      },
      ip_address: null,
      user_agent: navigator.userAgent
    });

    // Also log to security events for comprehensive monitoring
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: `admin_${action}`,
      event_data: {
        target_user_id: targetUserId,
        ...details
      },
      severity: 'info',
      source: 'admin_panel'
    });

  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

// Check for suspicious admin activities
export const detectSuspiciousActivity = async (userId: string): Promise<boolean> => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('event_type')
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    if (!recentEvents) return false;

    // Flag suspicious patterns
    const failedLogins = recentEvents.filter(e => e.event_type === 'admin_login_failed').length;
    
    return failedLogins > 3;
  } catch (error) {
    console.error('Failed to detect suspicious activity:', error);
    return false;
  }
};

// Secure admin session validation
export const validateAdminSession = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (!roles?.length) {
      await logAdminActivity('unauthorized_access_attempt', user.id, {
        reason: 'No admin role found'
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to validate admin session:', error);
    return false;
  }
};