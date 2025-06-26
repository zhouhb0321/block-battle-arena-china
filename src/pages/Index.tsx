
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Users, Settings, Trophy, Gamepad2, Book } from 'lucide-react';
import TetrisGame from '@/components/TetrisGame';
import FixedTetrisGame from '@/components/FixedTetrisGame';
import GameSettingsDialog from '@/components/GameSettingsDialog';
import KeyboardSettings from '@/components/KeyboardSettings';
import ReplaySystem from '@/components/ReplaySystem';
import AuthModal from '@/components/AuthModal';
import NavigationBar from '@/components/NavigationBar';
import RankedMatchmaking from '@/components/RankedMatchmaking';
import AdSpace from '@/components/AdSpace';
import IncomeSystem from '@/components/IncomeSystem';
import AdminPanel from '@/components/AdminPanel';
import BrowserShortcut from '@/components/BrowserShortcut';
import { ViewType } from '@/types/navigation';

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewType>('menu');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Admin user check - replace this email with your admin email
  const isAdmin = user?.email === 'admin@tetris.com';

  const handleViewChange = (view: string) => {
    setCurrentView(view as ViewType);
  };

  const handleStartSingle = () => {
    setCurrentView('single');
  };

  const handleStartMulti = () => {
    if (!user || user.isGuest) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentView('multi');
  };

  const handleStartRanked = () => {
    if (!user || user.isGuest) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentView('ranked');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  if (currentView === 'single') {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <div className="w-60 flex-shrink-0 p-4">
          <AdSpace position="left" />
        </div>
        <div className="flex-1">
          <FixedTetrisGame />
        </div>
        <div className="w-60 flex-shrink-0 p-4">
          <AdSpace position="right" />
        </div>
      </div>
    );
  }

  if (currentView === 'multi') {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <div className="w-60 flex-shrink-0 p-4">
          <AdSpace position="left" />
        </div>
        <div className="flex-1">
          <TetrisGame mode="multi" />
        </div>
        <div className="w-60 flex-shrink-0 p-4">
          <AdSpace position="right" />
        </div>
      </div>
    );
  }

  if (currentView === 'ranked') {
    return (
      <div>
        <NavigationBar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onAuthModalOpen={() => setAuthModalOpen(true)}
          isAdmin={isAdmin}
        />
        <RankedMatchmaking onStartMatch={() => setCurrentView('multi')} />
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div>
        <NavigationBar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onAuthModalOpen={() => setAuthModalOpen(true)}
          isAdmin={isAdmin}
        />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button onClick={handleBackToMenu} variant="outline">
                ← {t('nav.home')}
              </Button>
              <h1 className="text-3xl font-bold text-white">{t('nav.settings')}</h1>
            </div>
            
            <Tabs defaultValue="keyboard" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="keyboard">{t('settings.keyboard')}</TabsTrigger>
                <TabsTrigger value="game">{t('settings.game')}</TabsTrigger>
                <TabsTrigger value="shortcuts">{t('settings.shortcuts')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="keyboard" className="mt-6">
                <KeyboardSettings />
              </TabsContent>
              
              <TabsContent value="game" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <GameSettingsDialog trigger={
                      <Button className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('common.openSettings')}
                      </Button>
                    } />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="shortcuts" className="mt-6">
                <BrowserShortcut />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'replays') {
    return (
      <div>
        <NavigationBar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onAuthModalOpen={() => setAuthModalOpen(true)}
          isAdmin={isAdmin}
        />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button onClick={handleBackToMenu} variant="outline">
                ← {t('nav.home')}
              </Button>
              <h1 className="text-3xl font-bold text-white">{t('replay.title')}</h1>
            </div>
            <ReplaySystem />
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'income' && isAdmin) {
    return (
      <div>
        <NavigationBar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onAuthModalOpen={() => setAuthModalOpen(true)}
          isAdmin={isAdmin}
        />
        <div className="min-h-screen bg-gray-100 p-4">
          <IncomeSystem />
        </div>
      </div>
    );
  }

  if (currentView === 'admin' && isAdmin) {
    return (
      <div>
        <NavigationBar 
          currentView={currentView} 
          onViewChange={handleViewChange}
          onAuthModalOpen={() => setAuthModalOpen(true)}
          isAdmin={isAdmin}
        />
        <div className="min-h-screen bg-gray-100 p-4">
          <AdminPanel />
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationBar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        onAuthModalOpen={() => setAuthModalOpen(true)}
        isAdmin={isAdmin}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex">
        {/* Left Ad Space */}
        <div className="w-60 flex-shrink-0 p-4 hidden lg:block">
          <AdSpace position="left" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            {/* 标题 */}
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t('game.title')}
              </h1>
              <p className="text-xl text-gray-300">{t('game.description')}</p>
            </div>

            {/* 用户信息 */}
            <div className="text-center mb-8">
              {user && !user.isGuest ? (
                <p className="text-white">
                  {t('common.welcome')}，<span className="font-semibold text-blue-400">{user.username}</span>！
                  {isAdmin && <span className="ml-2 text-yellow-400">[{t('admin.panel')}]</span>}
                </p>
              ) : (
                <p className="text-gray-300">
                  {t('common.guestMode')} | 
                  <Button 
                    variant="link" 
                    className="text-blue-400 p-0 ml-2"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    {t('auth.login')}/{t('auth.register')}
                  </Button>
                </p>
              )}
            </div>

            {/* 主菜单 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* 单人模式 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8 text-center" onClick={handleStartSingle}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('game.singlePlayer')}</h3>
                  <p className="text-gray-300 mb-4">{t('game.singlePlayerDesc')}</p>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {t('game.play')}
                  </Button>
                </CardContent>
              </Card>

              {/* 多人对战 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8 text-center" onClick={handleStartMulti}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('game.multiPlayer')}</h3>
                  <p className="text-gray-300 mb-4">{t('game.multiPlayerDesc')}</p>
                  <Button className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                    {user && !user.isGuest ? t('common.startMatch') : t('common.needLogin')}
                  </Button>
                </CardContent>
              </Card>

              {/* 排位赛 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-8 text-center" onClick={handleStartRanked}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('game.ranked')}</h3>
                  <p className="text-gray-300 mb-4">{t('game.rankedDesc')}</p>
                  <Button className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700">
                    {user && !user.isGuest ? t('common.startRank') : t('common.needLogin')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 次要功能 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 游戏设置 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center" onClick={() => setCurrentView('settings')}>
                  <Settings className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <h4 className="font-semibold text-white mb-2">{t('nav.settings')}</h4>
                  <p className="text-sm text-gray-400">{t('settings.controlsDesc')}</p>
                </CardContent>
              </Card>

              {/* 回放系统 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center" onClick={() => setCurrentView('replays')}>
                  <Gamepad2 className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <h4 className="font-semibold text-white mb-2">{t('replay.title')}</h4>
                  <p className="text-sm text-gray-400">{t('replay.description')}</p>
                </CardContent>
              </Card>

              {/* 管理员功能 */}
              {isAdmin && (
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-6 text-center" onClick={() => setCurrentView('admin')}>
                    <Trophy className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                    <h4 className="font-semibold text-white mb-2">{t('admin.title')}</h4>
                    <p className="text-sm text-gray-400">{t('admin.description')}</p>
                  </CardContent>
                </Card>
              )}

              {/* 教程 */}
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Book className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  <h4 className="font-semibold text-white mb-2">{t('tutorial.title')}</h4>
                  <p className="text-sm text-gray-400">{t('tutorial.description')}</p>
                </CardContent>
              </Card>
            </div>

            {/* 版权信息 */}
            <div className="text-center mt-12 text-gray-500 text-sm">
              <p>© 2024 {t('game.title')} | {t('common.copyright')}</p>
            </div>
          </div>
        </div>

        {/* Right Ad Space */}
        <div className="w-60 flex-shrink-0 p-4 hidden lg:block">
          <AdSpace position="right" />
        </div>
      </div>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
