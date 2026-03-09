
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { isNetworkError, getNetworkErrorMessage, withNetworkRetry } from '@/utils/networkUtils';
import { authRecoveryManager } from '@/utils/authRecovery';

interface ExtendedUser extends User {
  isAdmin?: boolean;
  isGuest?: boolean;
  username?: string;
  roles?: string[];
  user_type?: string;
}

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  subscription: SubscriptionStatus;
  checkSubscription: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: (skipGameCheck?: boolean) => Promise<void>;
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

  // Improved cache clearing logic
  useEffect(() => {
    const clearCorruptedCache = () => {
      try {
        // Clear any localStorage items that might contain wrong Supabase URLs
        const storageTypes = [localStorage, sessionStorage];
        storageTypes.forEach(storage => {
          const keys = Object.keys(storage);
          keys.forEach(key => {
            if (key.includes('supabase') && !key.includes('wcwnyvoezudyxiayyzek')) {
              storage.removeItem(key);
              console.log(`[AUTH] 清除损坏的缓存项: ${key}`);
            }
          });
        });
      } catch (error) {
        console.warn('[AUTH] 清除缓存时出错:', error);
      }
    };

    clearCorruptedCache();
  }, []);

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
    
    // 设置认证状态监听器 - 简化回调函数避免异步操作阻塞
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        debugLog.auth('认证状态变化', { event, hasSession: !!session });
        
        // 只进行同步的状态更新
        setSession(session);
        
        if (session?.user) {
          // 延迟执行异步操作，避免阻塞回调
          setTimeout(() => {
            fetchUserProfile(session.user)
              .then(extendedUser => {
                setUser(extendedUser);
                debugLog.auth('用户状态更新完成', { 
                  isAdmin: extendedUser.isAdmin,
                  email: extendedUser.email 
                });
                // 触发设置重新加载的事件
                window.dispatchEvent(new CustomEvent('userSettingsReload', { 
                  detail: { userId: extendedUser.id, isGuest: extendedUser.isGuest } 
                }));
              })
              .catch(profileError => {
                debugLog.error('设置用户信息失败', profileError);
                
                // 即使profile获取失败，也设置基础用户信息
                const fallbackUser = {
                  ...session.user,
                  isAdmin: false,
                  isGuest: session.user.email?.includes('@guest.local') || session.user.email?.includes('@local.guest') || false,
                  username: session.user.email?.split('@')[0] || 'User',
                  roles: [],
                  user_type: 'regular'
                };
                setUser(fallbackUser);
              });
          }, 0);
        } else {
          setUser(null);
          debugLog.auth('用户已注销');
        }
        
        // 总是在状态更新后结束loading
        setTimeout(() => setLoading(false), 100);
      }
    );

    // 检查现有会话
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        debugLog.error('获取会话失败', error);
        setLoading(false);
      } else if (session) {
        debugLog.auth('发现现有会话', { userId: session.user.id });
        // 延迟处理初始会话，避免阻塞初始化
        setTimeout(() => {
            fetchUserProfile(session.user)
              .then(extendedUser => {
                setUser(extendedUser);
                setSession(session);
                debugLog.auth('初始会话处理完成', { 
                  isAdmin: extendedUser.isAdmin,
                  email: extendedUser.email 
                });
                // 触发设置重新加载的事件
                window.dispatchEvent(new CustomEvent('userSettingsReload', { 
                  detail: { userId: extendedUser.id, isGuest: extendedUser.isGuest } 
                }));
              })
            .catch(error => {
              debugLog.error('初始化用户信息失败', error);
              // 设置基础用户信息作为回退
              setUser({
                ...session.user,
                isAdmin: false,
                isGuest: session.user.email?.includes('@local.guest') || false,
                username: session.user.email?.split('@')[0] || 'User',
                roles: [],
                user_type: 'regular'
              });
            });
        }, 0);
        setLoading(false);
      } else {
        debugLog.auth('无有效会话，等待用户手动登录');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Clear any existing session before login
      await supabase.auth.signOut();
      
      const { data, error } = await withNetworkRetry(() => 
        supabase.auth.signInWithPassword({
          email,
          password,
        })
      );
      
      if (error) {
        debugLog.auth('登录失败', error);
        await logSecurityEvent('login_failed', {
          email,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return { error };
      }
      
      debugLog.auth('登录成功', { user: data.user?.email });
      return { error: null };
    } catch (error) {
      debugLog.error('登录过程中发生错误', error);
      const errorMessage = isNetworkError(error) ? getNetworkErrorMessage(error) : '登录失败';
      await logSecurityEvent('login_error', {
        email,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      return { error };
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    try {
      const { data, error } = await withNetworkRetry(() => 
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
            }
          }
        })
      );
      
      if (error) {
        debugLog.auth('注册失败', error);
        return { error };
      }
      
      debugLog.auth('注册成功', { user: data.user?.email });
      
      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: username || data.user.email?.split('@')[0] || 'User',
            user_type: 'regular'
          });
        
        if (profileError) {
          debugLog.error('创建用户档案失败', profileError);
        }
      }
      
      return { error: null };
    } catch (error) {
      debugLog.error('注册过程中发生错误', error);
      const errorMessage = isNetworkError(error) ? getNetworkErrorMessage(error) : '注册失败';
      return { error: new Error(errorMessage) };
    }
  };

  const signUp = async (email: string, password: string) => {
    return register(email, password);
  };

  const signIn = async (email: string, password: string) => {
    return login(email, password);
  };

  const signOut = async (skipGameCheck: boolean = false) => {
    try {
      debugLog.auth('用户注销', { skipGameCheck });
      
      // 实际执行注销
      await supabase.auth.signOut();
      
      // Force clear all auth related storage
      const storageTypes = [localStorage, sessionStorage];
      storageTypes.forEach(storage => {
        const keys = Object.keys(storage);
        keys.forEach(key => {
          if (key.includes('supabase')) {
            storage.removeItem(key);
          }
        });
      });
      
      setUser(null);
      setSession(null);
      
      await logSecurityEvent('user_logout', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      debugLog.error('注销过程中发生错误', error);
    }
  };

  const loginAsGuest = async () => {
    try {
      // 生成本地访客用户，不通过Supabase注册
      const guestId = `guest_${Date.now()}`;
      const guestUsername = `Guest_${Date.now().toString().slice(-6)}`;
      
      // 创建本地访客用户对象
      const guestUser: ExtendedUser = {
        id: guestId,
        aud: 'local',
        role: 'authenticated',
        email: `${guestId}@local.guest`,
        user_metadata: {
          username: guestUsername,
        },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        isGuest: true,
        username: guestUsername,
        roles: [],
        user_type: 'guest'
      };
      
      // 创建访客会话
      const guestSession = {
        access_token: `local_guest_token_${guestId}`,
        refresh_token: `local_guest_refresh_${guestId}`,
        expires_in: 3600, // 1小时
        token_type: 'bearer',
        user: guestUser
      };
      
      // 更新状态
      setUser(guestUser);
      setSession(guestSession as any);
      
      debugLog.auth('本地访客登录成功', { userId: guestId, username: guestUsername });
    } catch (error) {
      debugLog.error('访客登录过程中发生错误', error);
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
    isAuthenticated: !!user,
    login,
    register,
    signUp,
    signIn,
    signOut,
    loginAsGuest,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
