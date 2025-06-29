
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  email: string;
  isGuest: boolean;
  rating: number;
  gamesPlayed: number;
  friendsCount: number;
  maxFriends: number;
  isPremium: boolean;
  isVip: boolean;
  isAdmin: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateGuestName = (): string => {
  const randomId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `Guest-${randomId}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('开始初始化认证...');
        
        // 首先检查是否有游客用户
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.isGuest && mounted) {
              console.log('找到游客用户:', parsedUser);
              setUser(parsedUser);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('解析保存的用户数据失败:', error);
            localStorage.removeItem('user');
          }
        }

        // 检查 Supabase 会话
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('获取会话失败:', error);
        }
        
        if (session?.user && mounted) {
          console.log('找到 Supabase 用户会话');
          await loadUserProfile(session.user);
        }
        
        if (mounted) {
          setLoading(false);
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
        console.log('认证状态变化:', event, !!session);
        
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('user');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('加载用户资料失败:', error);
      }

      const isAdmin = supabaseUser.email === 'admin@tetris.com';

      const userData: User = {
        id: supabaseUser.id,
        username: profile?.username || supabaseUser.user_metadata?.username || 'Player',
        email: supabaseUser.email || '',
        isGuest: false,
        rating: profile?.rating || 1000,
        gamesPlayed: profile?.games_played || 0,
        friendsCount: 0,
        maxFriends: 50,
        isPremium: profile?.user_type === 'premium' || profile?.user_type === 'vip',
        isVip: profile?.user_type === 'vip',
        isAdmin: isAdmin,
        avatar: profile?.avatar_url
      };

      console.log('用户数据加载完成:', userData);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('加载用户资料时出错:', error);
    }
  };

  const reloadUserProfile = async () => {
    if (!user || user.isGuest) return;
    
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (supabaseUser) {
      await loadUserProfile(supabaseUser);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user && !data.user.email_confirmed_at) {
      throw new Error('请检查您的邮箱并点击确认链接来激活账户');
    }
  };

  const loginAsGuest = (): void => {
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      username: generateGuestName(),
      email: '',
      isGuest: true,
      rating: 0,
      gamesPlayed: 0,
      friendsCount: 0,
      maxFriends: 0,
      isPremium: false,
      isVip: false,
      isAdmin: false,
    };
    
    console.log('创建游客用户:', guestUser);
    setUser(guestUser);
    localStorage.setItem('user', JSON.stringify(guestUser));
  };

  const logout = async (): Promise<void> => {
    if (user && !user.isGuest) {
      await supabase.auth.signOut();
    } else {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginAsGuest,
      logout,
      isAuthenticated: !!user,
      loading,
      reloadUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
