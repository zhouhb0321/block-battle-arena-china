
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallpaperManager } from '@/hooks/useWallpaperManager';
import MainMenu from '@/components/MainMenu';
import TetrisGame from '@/components/TetrisGame';
import SettingsMenu from '@/components/menus/SettingsMenu';
import AdminPanel from '@/components/AdminPanel';
import MultiPlayerMenu from '@/components/menus/MultiPlayerMenu';
import LeagueMenu from '@/components/menus/LeagueMenu';
import AuthModal from '@/components/AuthModal';

type ViewType = 'menu' | 'game' | 'settings' | 'admin' | 'multiplayer' | 'league';

const Index = () => {
  const { user, isLoading } = useAuth();
  const { actualTheme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('menu');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Initialize wallpaper manager
  useWallpaperManager();

  // Check if user is admin
  const isAdmin = user?.email === 'admin@tetris.com' || user?.isAdmin;

  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, isLoading]);

  const handleViewChange = (view: ViewType) => {
    // Check admin access
    if (view === 'admin' && !isAdmin) {
      console.log('Access denied: User is not admin');
      return;
    }
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'game':
        return <TetrisGame onBackToMenu={() => setCurrentView('menu')} />;
      case 'settings':
        return <SettingsMenu onBackToMenu={() => setCurrentView('menu')} />;
      case 'admin':
        return isAdmin ? (
          <AdminPanel onBackToMenu={() => setCurrentView('menu')} />
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
      case 'multiplayer':
        return <MultiPlayerMenu onBackToMenu={() => setCurrentView('menu')} />;
      case 'league':
        return <LeagueMenu onBackToMenu={() => setCurrentView('menu')} />;
      default:
        return (
          <MainMenu 
            onStartGame={() => handleViewChange('game')}
            onOpenSettings={() => handleViewChange('settings')}
            onOpenAdmin={() => handleViewChange('admin')}
            onOpenMultiplayer={() => handleViewChange('multiplayer')}
            onOpenLeague={() => handleViewChange('league')}
          />
        );
    }
  };

  if (isLoading) {
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
      {renderCurrentView()}
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default Index;
