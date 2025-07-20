
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    debugLog.auth('初始化认证状态...');
    
    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugLog.auth('认证状态变化', { event, hasSession: !!session });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // 管理员权限检查 - 使用email判断
        if (session?.user) {
          const isAdmin = session.user.email === 'admin@tetris.com';
          // 将管理员状态添加到用户对象
          const userWithAdmin = {
            ...session.user,
            isAdmin
          };
          setUser(userWithAdmin as User & { isAdmin: boolean });
          debugLog.auth('用户认证成功', { 
            userId: session.user.id, 
            email: session.user.email,
            isAdmin 
          });
        } else {
          setUser(null);
          debugLog.auth('用户已登出');
        }
        
        setLoading(false);
      }
    );

    // 检查现有会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        debugLog.error('获取会话失败', error);
      } else if (session) {
        debugLog.auth('发现现有会话', { userId: session.user.id });
        setSession(session);
        
        const isAdmin = session.user.email === 'admin@tetris.com';
        const userWithAdmin = {
          ...session.user,
          isAdmin
        };
        setUser(userWithAdmin as User & { isAdmin: boolean });
      } else {
        debugLog.auth('无有效会话');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      debugLog.error('注册失败', error);
    } else {
      debugLog.auth('注册成功', { email });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    debugLog.auth('尝试登录', { email });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      debugLog.error('登录失败', error);
    } else {
      debugLog.auth('登录成功', { email });
    }
    
    return { error };
  };

  const signOut = async () => {
    debugLog.auth('用户登出');
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    if (error) {
      debugLog.error('密码重置失败', error);
    } else {
      debugLog.auth('密码重置邮件已发送', { email });
    }
    
    return { error };
  };

  const value = {
    user: user as (User & { isAdmin?: boolean }) | null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
