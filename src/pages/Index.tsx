
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallpaperManager } from '@/hooks/useWallpaperManager';
import { useMusicManager } from '@/hooks/useMusicManager';
import NavigationBar from '@/components/NavigationBar';
import MainMenu from '@/components/MainMenu';
import TetrisGame from '@/components/TetrisGame';
import SettingsMenu from '@/components/menus/SettingsMenu';
import AdminPanel from '@/components/AdminPanel';
import MultiPlayerMenu from '@/components/menus/MultiPlayerMenu';
import LeagueMenu from '@/components/menus/LeagueMenu';
import AuthModal from '@/components/AuthModal';
import type { ViewType } from '@/types/navigation';

const Index = () => {
  const { user } = useAuth();
  const { actualTheme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // 初始化资源管理器但不显示在UI上
  useWallpaperManager();
  useMusicManager();

  // 检查是否为管理员
  const isAdmin = user?.email === 'admin@tetris.com';

  useEffect(() => {
    // 模拟认证检查
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      setAuthLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleViewChange = (view: ViewType) => {
    // 检查管理员权限
    if (view === 'admin' && !isAdmin) {
      console.log('Access denied: User is not admin');
      return;
    }
    setCurrentView(view);
  };

  const handleAuthModalOpen = () => {
    setShowAuthModal(true);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'game':
        return <TetrisGame onBackToMenu={() => setCurrentView('home')} />;
      case 'settings':
        return <SettingsMenu onBackToMenu={() => setCurrentView('home')} />;
      case 'admin':
        return isAdmin ? (
          <AdminPanel onBackToMenu={() => setCurrentView('home')} />
        ) : (
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle>访问被拒绝</CardTitle>
              <CardDescription>您没有管理员权限访问此页面</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                当前用户: {user?.email || '未登录'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                需要管理员账户 (admin@tetris.com) 才能访问管理面板
              </p>
            </CardContent>
          </Card>
        );
      case 'ranked':
        return (
          <MultiPlayerMenu 
            onSelectMode={() => {}} 
            onBack={() => setCurrentView('home')} 
          />
        );
      case 'profile':
        return (
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardHeader>
                <CardTitle>用户资料</CardTitle>
              </CardHeader>
              <CardContent>
                <p>用户资料页面开发中...</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <MainMenu 
            onGameStart={() => setCurrentView('game')}
            onLeaderboard={() => {}}
            onSettings={() => setCurrentView('settings')}
            onRanked={() => setCurrentView('ranked')}
          />
        );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      actualTheme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
    }`}>
      <NavigationBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        onAuthModalOpen={handleAuthModalOpen}
      />
      
      <main className="pt-4">
        {renderCurrentView()}
      </main>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default Index;
