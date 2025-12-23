import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGameRecording } from '@/contexts/GameRecordingContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
const WARNING_TIME = 10 * 60 * 1000; // 10 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const ACTIVITY_THROTTLE = 30 * 1000; // 节流：30秒内只更新一次
const LOCAL_ACTIVITY_KEY = 'sb-session-last-activity';
const LOCAL_TOKEN_KEY = 'sb-session-token';

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const gameRecording = useGameRecording();
  const lastActivityUpdateRef = useRef<number>(0);

  const updateActivity = useCallback(async () => {
    if (!user) return;

    // 节流：防止频繁更新
    const now = Date.now();
    if (now - lastActivityUpdateRef.current < ACTIVITY_THROTTLE) {
      return;
    }
    lastActivityUpdateRef.current = now;

    // 始终更新本地活动时间作为备用
    localStorage.setItem(LOCAL_ACTIVITY_KEY, now.toString());

    try {
      const sessionToken = localStorage.getItem(LOCAL_TOKEN_KEY) || 
                           crypto.randomUUID();
      localStorage.setItem(LOCAL_TOKEN_KEY, sessionToken);

      const { error } = await supabase.rpc('upsert_user_session', {
        _user_id: user.id,
        _session_token: sessionToken,
        _last_activity: new Date().toISOString(),
        _expires_at: new Date(Date.now() + SESSION_TIMEOUT).toISOString(),
        _user_agent: navigator.userAgent
      });

      if (error) {
        console.warn('[SessionTimeout] RPC failed, using local fallback:', error.message);
      } else {
        console.debug('[SessionTimeout] Session updated successfully');
      }
    } catch (error) {
      console.warn('[SessionTimeout] Failed to update session, using local fallback:', error);
    }
  }, [user]);

  const checkSessionExpiry = useCallback(async () => {
    if (!user) return;

    try {
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('expires_at')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 如果数据库查询失败或无记录，检查本地备用
      if (error || !session) {
        const localActivity = localStorage.getItem(LOCAL_ACTIVITY_KEY);
        if (localActivity) {
          const lastActivity = parseInt(localActivity, 10);
          const timeSinceActivity = Date.now() - lastActivity;
          if (timeSinceActivity < SESSION_TIMEOUT) {
            // 本地活动在有效期内，不过期
            console.debug('[SessionTimeout] Using local fallback, session valid');
            return;
          }
        }
        // 如果没有任何有效会话记录，但用户已登录，自动创建新记录
        console.debug('[SessionTimeout] No session found, creating new one');
        await updateActivity();
        return;
      }

      const expiresAt = new Date(session.expires_at).getTime();
      const now = Date.now();
      const timeLeft = expiresAt - now;

      if (timeLeft <= 0) {
        if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
          // 游戏中不登出，自动延长
          await updateActivity();
          console.log('[SessionTimeout] Session auto-extended during gameplay/replay');
          return;
        }
        toast.error('会话已过期，请重新登录');
        await signOut(true);
      } else if (timeLeft <= WARNING_TIME) {
        if (gameRecording.isActive || gameRecording.isRecording || gameRecording.isReplaying) {
          // 游戏中静默延长
          await updateActivity();
          console.log('[SessionTimeout] Session silently extended during active gameplay');
        } else {
          const minutesLeft = Math.ceil(timeLeft / 60000);
          toast.warning(`会话将在 ${minutesLeft} 分钟后过期，任何操作都会自动延长会话时间`);
        }
      }
    } catch (error) {
      console.error('[SessionTimeout] Failed to check session expiry:', error);
      // 查询失败时检查本地备用
      const localActivity = localStorage.getItem(LOCAL_ACTIVITY_KEY);
      if (localActivity) {
        const lastActivity = parseInt(localActivity, 10);
        if (Date.now() - lastActivity < SESSION_TIMEOUT) {
          return; // 本地活动有效
        }
      }
    }
  }, [user, signOut, gameRecording, updateActivity]);

  const handleActivity = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  useEffect(() => {
    if (!user) return;

    // Update activity on mount
    updateActivity();

    // 减少事件监听，只监听关键交互事件
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
