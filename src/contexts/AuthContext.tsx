
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface ExtendedUser extends User {
  isAdmin?: boolean;
  isGuest?: boolean;
  username?: string;
  roles?: string[];
  user_type?: string;
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

  // Log security events
  const logSecurityEvent = async (eventType: string, eventData: any) => {
    try {
      await supabase
        .from('security_events')
        .insert({
          user_id: eventData.user_id || user?.id,
          event_type: eventType,
          event_data: eventData,
          ip_address: null, // Client-side can't get real IP
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.warn('Failed to log security event:', error);
    }
  };

  // 获取用户完整信息的函数 - 使用角色系统
  const fetchUserProfile = async (authUser: User) => {
    try {
      debugLog.auth('开始获取用户档案', { userId: authUser.id, email: authUser.email });
      
      // Fetch user profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('username, user_type, email')
          .eq('id', authUser.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authUser.id)
      ]);

      const profile = profileResult.data;
      const roles = rolesResult.data?.map(r => r.role) || [];
      const isAdmin = roles.includes('admin');
      const isGuest = authUser.email?.includes('@guest.local') || authUser.email?.includes('@example.com') && authUser.email?.startsWith('guest_') || false;
      let username = authUser.email?.split('@')[0] || 'User';
      
      if (profile) {
        username = profile.username || username;
        debugLog.auth('用户档案获取成功', { 
          email: profile.email, 
          userType: profile.user_type, 
          isAdmin,
          username,
          roles
        });
      } else if (isGuest) {
        // 为访客用户生成用户名
        username = `Guest_${Date.now().toString().slice(-6)}`;
        debugLog.auth('未找到用户档案，使用默认设置', { 
          email: authUser.email, 
          isAdmin,
          isGuest,
          username
        });
      }

      // Log security event for successful login
      await logSecurityEvent('user_login', {
        user_id: authUser.id,
        email: authUser.email,
        roles: roles,
        timestamp: new Date().toISOString()
      });
      
      const extendedUser: ExtendedUser = {
        ...authUser,
        isAdmin,
        isGuest,
        username,
        roles,
        user_type: profile?.user_type || 'regular'
      };
      
      debugLog.auth('用户信息设置完成', { 
        userId: authUser.id, 
        email: authUser.email,
        isAdmin,
        isGuest,
        username,
        roles
      });
      
      return extendedUser;
    } catch (error) {
      debugLog.error('获取用户档案时发生错误', error);
      
      // Log failed profile fetch
      await logSecurityEvent('profile_fetch_failed', {
        user_id: authUser.id,
        email: authUser.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      // 错误回退：基本用户权限
      const isGuest = authUser.email?.includes('@guest.local') || authUser.email?.includes('@example.com') && authUser.email?.startsWith('guest_') || false;
      debugLog.auth('使用回退逻辑设置用户权限', { email: authUser.email, isGuest });
      
      return {
        ...authUser,
        isAdmin: false, // Default to no admin access on error
        isGuest,
        username: isGuest ? `Guest_${Date.now().toString().slice(-6)}` : authUser.email?.split('@')[0] || 'User',
        roles: [],
        user_type: 'regular'
      } as ExtendedUser;
    }
  };

  useEffect(() => {
    debugLog.auth('初始化认证状态...');
    
    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debugLog.auth('认证状态变化', { event, hasSession: !!session });
        
        setSession(session);
        
        if (session?.user) {
          try {
            const extendedUser = await fetchUserProfile(session.user);
            setUser(extendedUser);
            debugLog.auth('用户状态更新完成', { 
              isAdmin: extendedUser.isAdmin,
              email: extendedUser.email 
            });
          } catch (error) {
            debugLog.error('设置用户信息失败', error);
          }
        } else {
          setUser(null);
          debugLog.auth('用户已登出');
        }
        setLoading(false);
      }
    );

    // 检查现有会话 - 不自动创建访客用户
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        debugLog.error('获取会话失败', error);
        setLoading(false);
      } else if (session) {
        debugLog.auth('发现现有会话', { userId: session.user.id });
        try {
          const extendedUser = await fetchUserProfile(session.user);
          setUser(extendedUser);
          setSession(session);
          debugLog.auth('初始会话处理完成', { 
            isAdmin: extendedUser.isAdmin,
            email: extendedUser.email 
          });
        } catch (error) {
          debugLog.error('初始化用户信息失败', error);
        }
        setLoading(false);
      } else {
        debugLog.auth('无有效会话，等待用户手动登录');
        setLoading(false);
        // 移除自动创建访客用户 - 让用户主动选择登录方式
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    // Input validation
    if (!email || !password) {
      const error = new Error('Email and password are required');
      debugLog.error('登录验证失败', error);
      return { error };
    }
    
    if (password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      debugLog.error('密码长度不足', error);
      return { error };
    }

    debugLog.auth('尝试登录', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        debugLog.error('登录失败', error);
        // Log failed login attempt
        await logSecurityEvent('login_failed', {
          email,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        debugLog.auth('登录成功', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
      }
      
      return { error };
    } catch (error) {
      debugLog.error('登录过程发生错误', error);
      return { error };
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    // Input validation
    if (!email || !password) {
      const error = new Error('Email and password are required');
      debugLog.error('注册验证失败', error);
      return { error };
    }
    
    if (password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      debugLog.error('密码长度不足', error);
      return { error };
    }
    
    // Basic password strength check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      const error = new Error('Password must contain uppercase, lowercase, and numbers');
      debugLog.error('密码强度不足', error);
      return { error };
    }
    
    // Username validation
    if (username && (username.length < 3 || username.length > 20)) {
      const error = new Error('Username must be between 3 and 20 characters');
      debugLog.error('用户名长度不符', error);
      return { error };
    }
    
    if (username && !/^[a-zA-Z0-9_-]+$/.test(username)) {
      const error = new Error('Username can only contain letters, numbers, underscores, and hyphens');
      debugLog.error('用户名格式不符', error);
      return { error };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: username ? { username } : undefined
        }
      });
      
      if (error) {
        debugLog.error('注册失败', error);
        // Log failed registration attempt
        await logSecurityEvent('registration_failed', {
          email,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        debugLog.auth('注册成功', { email, username });
        // Log successful registration
        if (data.user) {
          await logSecurityEvent('user_registered', {
            user_id: data.user.id,
            email,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      return { error };
    } catch (error) {
      debugLog.error('注册过程发生错误', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    return register(email, password);
  };

  const signIn = async (email: string, password: string) => {
    return login(email, password);
  };

  const signOut = async () => {
    try {
      // Log logout event
      if (user) {
        await logSecurityEvent('user_logout', {
          user_id: user.id,
          timestamp: new Date().toISOString()
        });
      }
      
      debugLog.auth('用户登出');
      await supabase.auth.signOut();
    } catch (error) {
      debugLog.error('登出过程发生错误', error);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    // 不使用 Supabase 认证，直接创建本地访客用户
    const guestId = `guest_${Date.now()}`;
    const guestUsername = `Guest_${Date.now().toString().slice(-6)}`;
    const guestEmail = `${guestId}@example.com`;
    
    debugLog.auth('创建本地访客用户', { guestId, guestUsername });
    
    try {
      // 创建本地访客用户对象
      const guestUser: ExtendedUser = {
        id: guestId,
        email: guestEmail,
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_anonymous: true,
        app_metadata: { provider: 'guest', providers: ['guest'] },
        user_metadata: { username: guestUsername },
        identities: [],
        isAdmin: false,
        isGuest: true,
        username: guestUsername
      };

      // 创建本地会话对象
      const guestSession = {
        access_token: `guest_token_${Date.now()}`,
        refresh_token: `guest_refresh_${Date.now()}`,
        expires_in: 24 * 60 * 60, // 24小时
        expires_at: Date.now() / 1000 + 24 * 60 * 60,
        token_type: 'bearer',
        user: guestUser
      };

      setUser(guestUser);
      setSession(guestSession as any);
      setLoading(false); // 重要：设置loading为false以确保isAuthenticated正确计算
      
      debugLog.auth('访客用户创建成功', { guestId, guestUsername });
    } catch (error) {
      debugLog.error('创建访客用户失败', error);
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
