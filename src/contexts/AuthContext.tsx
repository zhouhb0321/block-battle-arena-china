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
      debugLog.auth('Loading user profile', { userId: '[REDACTED]' });
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        debugLog.error('Error loading user profile', error);
        return null;
      }

      debugLog.auth('User profile loaded successfully');
      return profile;
    } catch (error) {
      debugLog.error('Exception loading user profile', error);
      return null;
    }
  };

  useEffect(() => {
    debugLog.auth('AuthProvider initializing...');
    
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      debugLog.auth('Initial session check', { hasSession: !!session });
      setSession(session);
      
      if (session?.user) {
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
        setUser(null);
        setLoading(false);
      }
    });

    // 监听认证状态变化 - 移除异步操作防止死锁
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      debugLog.auth('Auth state changed', { event, hasSession: !!session });
      
      // 同步更新会话状态
      setSession(session);
      
      if (session?.user) {
        // 延迟执行数据库查询，避免认证状态更新死锁
        setTimeout(async () => {
          const profile = await loadUserProfile(session.user.id);
          setUser({
            ...session.user,
            profile: profile || undefined,
            username: profile?.username || session.user.email?.split('@')[0] || 'User'
          });
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
      debugLog.auth('Attempting sign up', { email: '[REDACTED]', username });
      
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
        debugLog.error('Sign up error', error);
        return { error };
      }

      if (data.user) {
        // 创建用户配置文件
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              username: username,
            }
          ]);

        if (profileError) {
          debugLog.error('Error creating user profile', profileError);
        } else {
          debugLog.auth('User profile created successfully');
        }
      }

      debugLog.auth('Sign up successful');
      return { error: null };
    } catch (error) {
      debugLog.error('Sign up exception', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      debugLog.auth('Attempting sign in', { email: '[REDACTED]' });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        debugLog.error('Sign in error', error);
        return { error };
      }

      debugLog.auth('Sign in successful');
      return { error: null };
    } catch (error) {
      debugLog.error('Sign in exception', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      debugLog.auth('Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      debugLog.auth('Sign out successful');
    } catch (error) {
      debugLog.error('Sign out error', error);
    }
  };

  const playAsGuest = () => {
    debugLog.auth('Playing as guest');
    setUser({
      id: 'guest-' + Date.now(),
      email: 'guest@example.com',
      isGuest: true,
      username: 'Guest',
    } as any);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || user.isGuest) {
      return { error: new Error('No authenticated user') };
    }

    try {
      debugLog.auth('Updating user profile', { updates });
      
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        debugLog.error('Error updating profile', error);
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

      debugLog.auth('Profile updated successfully');
      return { error: null };
    } catch (error) {
      debugLog.error('Update profile exception', error);
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
