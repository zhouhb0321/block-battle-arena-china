
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
            {/* 一键访客游戏 */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                俄罗斯方块
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                经典游戏，现代体验
              </p>
              <Button
                size="lg"
                onClick={handleGuestPlay}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Play className="w-6 h-6 mr-2" />
                立即开始游戏
              </Button>
            </div>

            {/* 主菜单 */}
            <MainMenu 
              onGameStart={() => setCurrentView('game')}
              onLeaderboard={() => {}}
              onSettings={() => setCurrentView('settings')}
              onRanked={() => setCurrentView('ranked')}
            />

            {/* 网站优势说明 */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <CardTitle>闪电般的速度</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    优化的游戏引擎，确保流畅的60FPS游戏体验，响应迅速无延迟
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                  <CardTitle>竞技排行</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    完整的排行榜系统，记录你的最佳成绩，与全球玩家竞技较量
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Users className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <CardTitle>多人对战</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    实时多人对战模式，与朋友一起享受紧张刺激的方块大战
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 底部说明 */}
            <div className="mt-16 text-center">
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-0">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4">为什么选择我们的俄罗斯方块？</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div>
                      <h4 className="font-semibold mb-2">🎮 经典玩法</h4>
                      <p className="text-sm text-muted-foreground">完美还原经典俄罗斯方块玩法，支持SRS旋转系统</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">⚙️ 自定义设置</h4>
                      <p className="text-sm text-muted-foreground">丰富的个性化设置，打造属于你的游戏体验</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">📱 跨平台支持</h4>
                      <p className="text-sm text-muted-foreground">完美适配电脑、平板、手机，随时随地畅玩</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🔄 撤销重做</h4>
                      <p className="text-sm text-muted-foreground">独有的撤销重做功能，让你的游戏更加从容</p>
                    </div>
                  </div>
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
