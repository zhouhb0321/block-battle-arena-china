import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const gameRecording = useGameRecording();

  const updateActivity = useCallback(async () => {
    if (!user) return;

    try {
      const sessionToken = localStorage.getItem('sb-session-token') || 
                           crypto.randomUUID();
      localStorage.setItem('sb-session-token', sessionToken);

      // Use the new secure function that hashes tokens
      await supabase.rpc('upsert_user_session', {
        _user_id: user.id,
        _session_token: sessionToken,
        _last_activity: new Date().toISOString(),
        _expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString(),
        _user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }, [user]);

  const checkSessionExpiry = useCallback(async () => {
    if (!user) return;

    try {
      const sessionToken = localStorage.getItem('sb-session-token');
      if (!sessionToken) return;

      const { data: session } = await supabase
        .from('user_sessions')
        .select('expires_at')
        .eq('session_token', sessionToken)
        .single();

      if (session) {
        const expiresAt = new Date(session.expires_at).getTime();
        const now = Date.now();
        const timeLeft = expiresAt - now;

        if (timeLeft <= 0) {
          if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
            // ✅ Do NOT logout during gameplay or replay; auto-extend and retry later
            await updateActivity();
            toast.info('Session auto-extended during gameplay/replay. You will not be logged out.');
            return;
          }
          toast.error('Session expired. Please log in again.');
          await signOut(true);
        } else if (timeLeft <= WARNING_TIME) {
          if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
            // ✅ Silently extend during active gameplay or replay to avoid interruption
            await updateActivity();
            toast.warning('Session extended to avoid interruption.');
          } else {
            toast.warning('Your session will expire in 5 minutes. Activity will extend it.');
          }
        }
      }
    } catch (error) {
      console.error('Failed to check session expiry:', error);
    }
  }, [user, signOut, gameRecording, updateActivity]);

  const handleActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    if (!user) return;

    // Update activity on mount
    updateActivity();

    // Add activity listeners including game keyboard events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown', 'keyup'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up periodic checks
    const activityInterval = setInterval(checkSessionExpiry, ACTIVITY_CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(activityInterval);
    };
  }, [user, updateActivity, handleActivity, checkSessionExpiry]);

  return { updateActivity };
};