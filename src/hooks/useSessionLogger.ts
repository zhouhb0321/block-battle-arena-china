
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useSessionLogger = () => {
  const { user, isAuthenticated } = useAuth();

  const logUserSession = async (sessionType: 'login' | 'logout' | 'game_start' | 'game_end', gameMode?: string, additionalData?: any) => {
    if (!user) return;

    try {
      const sessionData = {
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...additionalData
      };

      await supabase
        .from('user_session_logs')
        .insert({
          user_id: user.id,
          username: user.username,
          session_type: sessionType,
          game_mode: gameMode || null,
          session_data: sessionData,
          ip_address: null, // Will be populated by server if needed
          user_agent: navigator.userAgent
        });

      console.log(`User session logged: ${sessionType} for ${user.username}`);
    } catch (error) {
      console.error('Failed to log user session:', error);
    }
  };

  // Log login when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && user && !user.isGuest) {
      logUserSession('login');
    }
  }, [isAuthenticated, user]);

  return { logUserSession };
};
