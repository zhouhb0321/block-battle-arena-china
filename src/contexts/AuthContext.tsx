
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { debugLog } from '@/utils/debugLogger';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface AuthContextType {
  user: (User & { profile?: UserProfile; isGuest?: boolean; username?: string }) | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  playAsGuest: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<(User & { profile?: UserProfile; isGuest?: boolean; username?: string }) | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户配置文件 - 使用延迟执行避免认证死锁
  const loadUserProfile = async (userId: string) => {
    try {
      debugLog.auth('加载用户档案，用户ID: [REDACTED]');
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLog.error('用户档案加载错误', error);
        return null;
      }

      debugLog.auth('用户档案加载成功', profile);
      return profile;
    } catch (error) {
      debugLog.error('用户档案加载异常', error);
      return null;
    }
  };

  useEffect(() => {
    debugLog.auth('初始化认证状态...');
    
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        debugLog.auth('找到有效会话，加载用户档案');
        setSession(session);
        
        // 延迟执行用户配置文件加载，避免认证死锁
        setTimeout(async () => {
          const profile = await loadUserProfile(session.user.id);
          setUser({
            ...session.user,
            profile: profile || undefined,
            username: profile?.username || session.user.email?.split('@')[0] || 'User'
          });
          setLoading(false);
        }, 0);
      } else {
        debugLog.auth('无有效会话');
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    });

    // 监听认证状态变化 - 移除异步操作防止死锁
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      debugLog.auth('认证状态变化', { event, hasSession: !!session });
      
      // 同步更新会话状态
      setSession(session);
      
      if (session?.user) {
        // 延迟执行数据库查询，避免认证状态更新死锁
        setTimeout(async () => {
          try {
            const profile = await loadUserProfile(session.user.id);
            setUser({
              ...session.user,
              profile: profile || undefined,
              username: profile?.username || session.user.email?.split('@')[0] || 'User'
            });
          } catch (error) {
            debugLog.error('延迟加载用户档案失败', error);
            setUser({
              ...session.user,
              username: session.user.email?.split('@')[0] || 'User'
            });
          }
        }, 0);
      } else {
        setUser(null);
      }
      
      // 认证状态变化时，loading状态应该立即更新
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      debugLog.auth('尝试注册', { email: '[REDACTED]', username });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });

      if (error) {
        debugLog.error('注册错误', error);
        return { error };
      }

      debugLog.auth('注册成功');
      return { error: null };
    } catch (error) {
      debugLog.error('注册异常', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      debugLog.auth('尝试登录', { email: '[REDACTED]' });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        debugLog.error('登录错误', error);
        return { error };
      }

      debugLog.auth('登录成功');
      return { error: null };
    } catch (error) {
      debugLog.error('登录异常', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      debugLog.auth('注销中...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      debugLog.auth('注销成功');
    } catch (error) {
      debugLog.error('注销错误', error);
    }
  };

  const playAsGuest = () => {
    debugLog.auth('以访客身份游戏');
    setUser({
      id: 'guest-' + Date.now(),
      email: 'guest@example.com',
      isGuest: true,
      username: 'Guest',
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: null,
      phone: '',
      confirmation_sent_at: null,
      confirmed_at: null,
      last_sign_in_at: null,
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false
    });
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || user.isGuest) {
      return { error: new Error('No authenticated user') };
    }

    try {
      debugLog.auth('更新用户档案', { updates });
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        debugLog.error('更新档案错误', error);
        return { error };
      }

      // 重新加载用户配置文件
      const profile = await loadUserProfile(user.id);
      if (profile) {
        setUser({
          ...user,
          profile,
          username: profile.username
        });
      }

      debugLog.auth('档案更新成功');
      return { error: null };
    } catch (error) {
      debugLog.error('更新档案异常', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    playAsGuest,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
