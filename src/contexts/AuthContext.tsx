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
        // 首先快速检查本地session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user && !error) {
            await loadUserProfile(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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
        
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // 创建默认用户档案
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const newProfile = {
            id: authUser.user.id,
            username: authUser.user.email?.split('@')[0] || 'Player',
            email: authUser.user.email || '',
            isGuest: false,
            isPremium: false,
            rating: 1000,
            avatar: null
          };
          setUser(newProfile);
          setIsAuthenticated(true);
        }
      } else {
        const userData: User = {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          isGuest: false,
          isPremium: profile.user_type === 'premium',
          rating: profile.rating,
          avatar: profile.avatar_url,
          // 检查是否为管理员
          isAdmin: profile.email === 'admin@tetris.com'
        };
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Login error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        toast.success('登录成功！');
        return data;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      setUser(null);
      setIsAuthenticated(false);
      toast.success('已成功退出登录');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
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
        console.error('Registration error:', error);
        throw new Error(error.message);
      }
  
      if (data.user) {
        toast.success('注册成功！请验证您的邮箱。');
        return data;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    try {
      setLoading(true);
      // Generate a random guest ID
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 15);
      
      const guestUser: User = {
        id: guestId,
        username: 'Guest',
        email: '',
        isGuest: true,
        isPremium: false,
        rating: 1000,
        avatar: null
      };
      
      setUser(guestUser);
      setIsAuthenticated(true);
      toast.success('以游客身份登录');
    } catch (error) {
      console.error('Guest login failed:', error);
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
