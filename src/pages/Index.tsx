
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Play, Zap, Trophy, Users } from 'lucide-react';
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
  const isAdmin = user?.email === 'admin@tetris.com' || user?.isAdmin;

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

  const handleGuestPlay = () => {
    setCurrentView('game');
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
          <div className="container mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-game-gradient-primary bg-clip-text text-transparent">
                Tetris Game
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Classic gameplay, modern experience
              </p>
              <Button
                size="lg"
                onClick={handleGuestPlay}
                className="bg-game-gradient-primary hover:opacity-90 text-white font-bold py-4 px-8 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Guest Playing
              </Button>
            </div>

            {/* Game Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-card/50 border border-border">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">🎯</div>
                  <CardTitle className="text-lg">40 Lines</CardTitle>
                  <CardDescription>Sprint mode</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-game-green hover:bg-game-green/80 text-white"
                    onClick={() => setCurrentView('game')}
                  >
                    Play
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-card/50 border border-border">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">⚔️</div>
                  <CardTitle className="text-lg">Ranked</CardTitle>
                  <CardDescription>Competitive play</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-game-red hover:bg-game-red/80 text-white"
                    onClick={() => setCurrentView('ranked')}
                  >
                    Battle
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-card/50 border border-border">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <CardTitle className="text-lg">Leaderboard</CardTitle>
                  <CardDescription>Top scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-game-orange hover:bg-game-orange/80 text-white"
                    onClick={() => {}}
                  >
                    View
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-card/50 border border-border">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">⚙️</div>
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>Customize game</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-game-purple hover:bg-game-purple/80 text-white"
                    onClick={() => setCurrentView('settings')}
                  >
                    Configure
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Optimized game engine ensuring smooth 60FPS gameplay with instant response
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Competitive</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Complete ranking system to track your best scores and compete globally
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Multiplayer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Real-time multiplayer battles, enjoy intense block wars with friends
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
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
