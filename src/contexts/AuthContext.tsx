
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateGuestName = (): string => {
  const randomId = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `Guest-${randomId}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // 模拟登录API调用
    const mockUser: User = {
      id: '1',
      username: 'TestUser',
      email,
      isGuest: false,
      rating: 1500,
      gamesPlayed: 0,
      friendsCount: 0,
      maxFriends: 50,
      isPremium: false,
      isVip: false
    };
    
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    // 模拟注册API调用
    const newUser: User = {
      id: Date.now().toString(),
      username,
      email,
      isGuest: false,
      rating: 1000,
      gamesPlayed: 0,
      friendsCount: 0,
      maxFriends: 50,
      isPremium: false,
      isVip: false
    };
    
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
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
      isVip: false
    };
    
    setUser(guestUser);
    localStorage.setItem('user', JSON.stringify(guestUser));
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginAsGuest,
      logout,
      isAuthenticated: !!user
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
