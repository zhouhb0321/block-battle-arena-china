
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type User = {
  id: string;
  username: string;
  email: string;
  isGuest: boolean;
  isPremium: boolean;
  rating: number;
  avatar: string | null;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, username: string) => Promise<any>;
  logout: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 优化登录状态检查
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('初始化认证状态...');
        // 首先快速检查本地session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user && !error) {
            console.log('找到有效会话，加载用户档案');
            await loadUserProfile(session.user.id);
          } else {
            console.log('无有效会话');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('初始化认证失败:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('认证状态变化:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          console.log('用户已登出');
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('清理认证监听器');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('加载用户档案，用户ID:', userId);
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('加载用户档案失败:', error);
        // 获取认证用户信息作为备用
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          console.log('使用认证用户信息创建临时档案');
          const tempProfile = {
            id: authUser.user.id,
            username: authUser.user.email?.split('@')[0] || 'Player',
            email: authUser.user.email || '',
            isGuest: false,
            isPremium: false,
            rating: 1000,
            avatar: null,
            isAdmin: authUser.user.email === 'admin@tetris.com'
          };
          setUser(tempProfile);
          setIsAuthenticated(true);
        }
      } else if (profile) {
        console.log('用户档案加载成功:', profile);
        const userData: User = {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          isGuest: false,
          isPremium: profile.user_type === 'premium',
          rating: profile.rating,
          avatar: profile.avatar_url,
          isAdmin: profile.email === 'admin@tetris.com'
        };
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log('用户档案不存在，使用认证信息');
        // 如果没有档案，使用认证用户信息
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const tempProfile = {
            id: authUser.user.id,
            username: authUser.user.email?.split('@')[0] || 'Player',
            email: authUser.user.email || '',
            isGuest: false,
            isPremium: false,
            rating: 1000,
            avatar: null,
            isAdmin: authUser.user.email === 'admin@tetris.com'
          };
          setUser(tempProfile);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('加载用户档案时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('尝试登录，邮箱:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('登录失败:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('登录成功，用户ID:', data.user.id);
        await loadUserProfile(data.user.id);
        return data;
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log('尝试登出...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('登出失败:', error);
        throw error;
      }
      
      console.log('登出成功');
      setUser(null);
      setIsAuthenticated(false);
      toast.success('已成功退出登录');
    } catch (error) {
      console.error('登出过程出错:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      console.log('尝试注册，邮箱:', email, '用户名:', username);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim(),
          },
        },
      });
  
      if (error) {
        console.error('注册失败:', error);
        throw new Error(error.message);
      }
  
      if (data.user) {
        console.log('注册成功，用户ID:', data.user.id);
        return data;
      }
    } catch (error) {
      console.error('注册过程出错:', error);
      setLoading(false);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    try {
      setLoading(true);
      console.log('尝试游客登录...');
      
      // 生成随机游客ID和用户名
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
      const guestUsername = 'Guest-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const guestUser: User = {
        id: guestId,
        username: guestUsername,
        email: '',
        isGuest: true,
        isPremium: false,
        rating: 1000,
        avatar: null
      };
      
      console.log('游客用户已创建:', guestUser);
      setUser(guestUser);
      setIsAuthenticated(true);
      toast.success(`欢迎，${guestUsername}！以游客身份登录`);
    } catch (error) {
      console.error('游客登录失败:', error);
      toast.error('游客登录失败');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    loginAsGuest
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
