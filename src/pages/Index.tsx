
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GameLauncher from '@/components/GameLauncher';
import MultiPlayerMenu from '@/components/menus/MultiPlayerMenu';
import SettingsMenu from '@/components/menus/SettingsMenu';
import AuthModal from '@/components/AuthModal';
import NavigationBar from '@/components/NavigationBar';
import ReplaySystem from '@/components/ReplaySystem';
import AdSpace from '@/components/AdSpace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Users, Trophy, Settings, LogIn } from 'lucide-react';
import type { ViewType } from '@/types/navigation';

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Reset to main menu when user logs out
  useEffect(() => {
    if (!isAuthenticated && currentView !== 'home') {
      setCurrentView('home');
    }
  }, [isAuthenticated, currentView]);

  const handleBackToMenu = () => {
    setCurrentView('home');
  };

  const handleViewChange = (view: ViewType) => {
    if (!isAuthenticated && (view === 'settings' || view === 'replays' || view === 'ranked')) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'game':
        return (
          <GameLauncher 
            onBackToMenu={handleBackToMenu}
          />
        );
      case 'ranked':
        return (
          <MultiPlayerMenu 
            onGameStart={(gameType, gameMode) => {
              console.log('Multi-player game start:', { gameType, gameMode });
            }}
            onBack={handleBackToMenu}
          />
        );
      case 'settings':
        return (
          <SettingsMenu 
            onBackToMenu={handleBackToMenu}
          />
        );
      case 'replays':
        return (
          <ReplaySystem />
        );
      case 'profile':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">个人资料</h2>
            <p>个人资料页面开发中...</p>
            <Button onClick={handleBackToMenu} className="mt-4">
              返回首页
            </Button>
          </div>
        );
      case 'home':
      default:
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('welcome.title') || 'Tetris Game'}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('welcome.subtitle') || '经典俄罗斯方块游戏，支持单人和多人模式'}
              </p>
              {user && (
                <p className="text-lg text-green-600 font-medium">
                  {t('welcome.greeting') || `欢迎回来，${user.username}！`}
                </p>
              )}
            </div>

            {/* Main Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => handleViewChange('game')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Play className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('menu.singlePlayer') || '单人游戏'}</h3>
                    <p className="text-sm text-muted-foreground">{t('menu.singlePlayerDesc') || '挑战自己的极限'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => handleViewChange('ranked')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('menu.multiPlayer') || '多人游戏'}</h3>
                    <p className="text-sm text-muted-foreground">{t('menu.multiPlayerDesc') || '与朋友一起游戏'}</p>
                  </div>
                  {!isAuthenticated && (
                    <div className="text-xs text-amber-600 font-medium">
                      {t('menu.loginRequired') || '需要登录'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => handleViewChange('replays')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('menu.replays') || '回放系统'}</h3>
                    <p className="text-sm text-muted-foreground">{t('menu.replaysDesc') || '观看和分享回放'}</p>
                  </div>
                  {!isAuthenticated && (
                    <div className="text-xs text-amber-600 font-medium">
                      {t('menu.loginRequired') || '需要登录'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => handleViewChange('settings')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Settings className="w-8 h-8 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('menu.settings') || '设置'}</h3>
                    <p className="text-sm text-muted-foreground">{t('menu.settingsDesc') || '个性化设置'}</p>
                  </div>
                  {!isAuthenticated && (
                    <div className="text-xs text-amber-600 font-medium">
                      {t('menu.loginRequired') || '需要登录'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Login Button for Guests */}
            {!isAuthenticated && (
              <div className="text-center">
                <Button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  {t('auth.login') || '登录 / 注册'}
                </Button>
              </div>
            )}

            {/* Ad Space */}
            <AdSpace position="bottom" width={728} height={90} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <NavigationBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        onAuthModalOpen={() => setShowAuthModal(true)}
      />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default Index;
