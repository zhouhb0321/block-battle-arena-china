import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
const WARNING_TIME = 10 * 60 * 1000; // 10 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_THROTTLE = 30 * 1000; // ✅ 节流：30秒内只更新一次

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const gameRecording = useGameRecording();
  const lastActivityUpdateRef = useRef<number>(0);

  const updateActivity = useCallback(async () => {
    if (!user) return;

    // ✅ 节流：防止频繁更新
    const now = Date.now();
    if (now - lastActivityUpdateRef.current < ACTIVITY_THROTTLE) {
      return;
    }
    lastActivityUpdateRef.current = now;

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
      // ✅ 改用 user_id 查询而不是 session_token（因为 token 被哈希了）
      const { data: session } = await supabase
        .from('user_sessions')
        .select('expires_at')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const expiresAt = new Date(session.expires_at).getTime();
        const now = Date.now();
        const timeLeft = expiresAt - now;

        if (timeLeft <= 0) {
          if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
            // ✅ Do NOT logout during gameplay or replay; auto-extend and retry later
            await updateActivity();
            console.log('[SessionTimeout] Session auto-extended during gameplay/replay');
            return;
          }
          toast.error('会话已过期，请重新登录');
          await signOut(true);
        } else if (timeLeft <= WARNING_TIME) {
          if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
            // ✅ Silently extend during active gameplay or replay to avoid interruption
            await updateActivity();
            console.log('[SessionTimeout] Session silently extended during active gameplay');
          } else {
            const minutesLeft = Math.ceil(timeLeft / 60000);
            toast.warning(`会话将在 ${minutesLeft} 分钟后过期，任何操作都会自动延长会话时间`);
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

    // ✅ 减少事件监听，只监听关键交互事件
    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up periodic checks
    const activityInterval = setInterval(checkSessionExpiry, ACTIVITY_CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(activityInterval);
    };
  }, [user, updateActivity, handleActivity, checkSessionExpiry]);

  return { updateActivity };
};