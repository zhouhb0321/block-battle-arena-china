import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface ExtendedUser extends User {
  isAdmin?: boolean;
  isGuest?: boolean;
  username?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
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
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取用户完整信息的函数 - 修复管理员检查逻辑
  const fetchUserProfile = async (authUser: User) => {
    try {
      debugLog.auth('开始获取用户档案', { userId: authUser.id, email: authUser.email });
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('username, user_type, email')
        .eq('id', authUser.id)
        .single();
      
      if (error) {
        debugLog.error('获取用户档案失败', error);
        throw error;
      }
      
      const isGuest = authUser.email?.includes('@guest.local') || false;
      let isAdmin = false;
      let username = authUser.email?.split('@')[0] || 'User';
      
      if (profile) {
        username = profile.username || username;
        
        // 修复管理员检查逻辑 - 明确的检查条件
        isAdmin = (profile.user_type === 'admin') || 
                 (profile.email === 'admin@tetris.com') || 
                 (authUser.email === 'admin@tetris.com');
        
        debugLog.auth('用户档案获取成功', { 
          email: profile.email, 
          userType: profile.user_type, 
          isAdmin,
          username 
        });
      } else {
        // 如果没有档案，检查邮箱
        isAdmin = authUser.email === 'admin@tetris.com';
        debugLog.auth('未找到用户档案，使用邮箱检查管理员权限', { 
          email: authUser.email, 
          isAdmin 
        });
      }
      
      const extendedUser: ExtendedUser = {
        ...authUser,
        isAdmin,
        isGuest,
        username
      };
      
      debugLog.auth('用户信息设置完成', { 
        userId: authUser.id, 
        email: authUser.email,
        isAdmin,
        isGuest,
        username
      });
      
      return extendedUser;
    } catch (error) {
      debugLog.error('获取用户档案时发生错误', error);
      // 错误回退：仅通过邮箱检查管理员权限
      const isAdmin = authUser.email === 'admin@tetris.com';
      debugLog.auth('使用回退逻辑设置管理员权限', { email: authUser.email, isAdmin });
      
      return {
        ...authUser,
        isAdmin,
        isGuest: authUser.email?.includes('@guest.local') || false,
        username: authUser.email?.split('@')[0] || 'User'
      } as ExtendedUser;
    }
  };

  useEffect(() => {
    debugLog.auth('初始化认证状态...');
    
    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        debugLog.auth('认证状态变化', { event, hasSession: !!session });
        
        setSession(session);
        
        if (session?.user) {
          // 使用 setTimeout 避免递归调用
          setTimeout(async () => {
            try {
              const extendedUser = await fetchUserProfile(session.user);
              setUser(extendedUser);
              setLoading(false);
            } catch (error) {
              debugLog.error('设置用户信息失败', error);
              setLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
          debugLog.auth('用户已登出');
        }
      }
    );

    // 检查现有会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        debugLog.error('获取会话失败', error);
        setLoading(false);
      } else if (session) {
        debugLog.auth('发现现有会话', { userId: session.user.id });
        // 使用 setTimeout 避免递归调用
        setTimeout(async () => {
          try {
            const extendedUser = await fetchUserProfile(session.user);
            setUser(extendedUser);
            setSession(session);
            setLoading(false);
          } catch (error) {
            debugLog.error('初始化用户信息失败', error);
            setLoading(false);
          }
        }, 0);
      } else {
        debugLog.auth('无有效会话');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    debugLog.auth('尝试登录', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      debugLog.error('登录失败', error);
    } else {
      debugLog.auth('登录成功', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
    }
    
    return { error };
  };

  const register = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: username ? { username } : undefined
      }
    });
    
    if (error) {
      debugLog.error('注册失败', error);
    } else {
      debugLog.auth('注册成功', { email, username });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    return register(email, password);
  };

  const signIn = async (email: string, password: string) => {
    return login(email, password);
  };

  const signOut = async () => {
    debugLog.auth('用户登出');
    await supabase.auth.signOut();
  };

  const loginAsGuest = async () => {
    const guestEmail = `guest_${Date.now()}@guest.local`;
    const guestPassword = Math.random().toString(36).substring(2, 15);
    
    debugLog.auth('游客登录', { guestEmail });
    
    const { error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
      options: {
        data: { username: `Guest_${Date.now().toString().slice(-6)}` }
      }
    });
    
    if (error) {
      debugLog.error('游客登录失败', error);
      throw error;
    }
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
    user,
    session,
    loading,
    isAuthenticated: !!user && !loading,
    login,
    register,
    signUp,
    signIn,
    signOut,
    loginAsGuest,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
