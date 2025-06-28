import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Users, Settings, Trophy, Gamepad2, Zap, Target, Clock, Star, ChevronRight, Github, Twitter, Mail, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import GameSettingsDialog from '@/components/GameSettingsDialog';
import TetrisGame from '@/components/TetrisGame';
import MainMenu from '@/components/MainMenu';
import AdSpace from '@/components/AdSpace';
import NavigationBar from '@/components/NavigationBar';
import { toast } from 'sonner';

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'game' | 'settings'>('home');
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 可以在这里添加一些初始化逻辑，例如检查用户是否已登录等
  }, []);

  const handleAuthModalOpen = () => {
    setShowAuthModal(true);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleGameStart = () => {
    setCurrentView('game');
  };

  const handleLeaderboard = () => {
    // Handle leaderboard navigation
    toast.success('排行榜功能即将推出！');
  };

  const handleSettings = () => {
    setCurrentView('settings');
  };

  const handleSettingsOpen = () => {
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  const handleViewChange = (view: string) => {
    setCurrentView(view as 'home' | 'game' | 'settings');
  };

  const handleShowMainMenu = () => {
    setShowMainMenu(true);
  };

  const handleBackToHome = () => {
    setShowMainMenu(false);
    setCurrentView('home');
  };

  if (currentView === 'game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="flex">
          <AdSpace position="left" width={240} height={600} />
          <div className="flex-1">
            <TetrisGame 
              onBackToMenu={handleBackToHome}
            />
          </div>
          <AdSpace position="right" width={240} height={600} />
        </div>
      </div>
    );
  }

  if (showMainMenu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="flex">
          <AdSpace position="left" width={240} height={600} />
          <div className="flex-1">
            <MainMenu 
              onGameStart={handleGameStart} 
              onLeaderboard={handleLeaderboard}
              onSettings={handleSettings}
            />
          </div>
          <AdSpace position="right" width={240} height={600} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <NavigationBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        onAuthModalOpen={handleAuthModalOpen}
      />
      
      <div className="flex">
        <AdSpace position="left" width={240} height={600} />
        
        <main className="flex-1 container mx-auto px-6 py-8">
          {/* 英雄区域 */}
          <section className="mb-16 text-center">
            <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
              方块竞技场
              <Badge variant="outline" className="ml-2 text-sm border-white/30 text-white/90">
                Beta
              </Badge>
            </h1>
            <p className="text-xl text-blue-200 mb-8 drop-shadow-sm">
              经典俄罗斯方块，在线畅玩，随时随地挑战你的极限！
            </p>
            <div className="space-x-4">
              <Button size="lg" onClick={handleShowMainMenu} className="shadow-lg">
                <Play className="w-5 h-5 mr-2" />
                开始游戏
              </Button>
              {!isAuthenticated && (
                <Button variant="secondary" size="lg" onClick={handleAuthModalOpen} className="shadow-lg">
                  <Star className="w-5 h-5 mr-2" />
                  注册/登录
                </Button>
              )}
              {isAuthenticated && (
                <GameSettingsDialog trigger={
                  <Button variant="secondary" size="lg" className="shadow-lg">
                    <Settings className="w-5 h-5 mr-2" />
                    游戏设置
                  </Button>
                } />
              )}
            </div>
          </section>

          {/* 游戏模式选择 */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">选择游戏模式</h2>
              <p className="text-xl text-blue-200">挑战自己或与朋友对战</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* 单人模式 */}
              <Card className="bg-gradient-to-br from-blue-800/20 to-purple-800/20 border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-blue-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">单人游戏</CardTitle>
                  <p className="text-blue-200">挑战自己的极限</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      无尽模式
                    </Button>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      40行冲刺
                    </Button>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      2分钟极限
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-blue-500/20">
                    <div className="flex items-center justify-between text-sm text-blue-200 mb-2">
                      <span>个人最佳</span>
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                        {user?.gamesPlayed || 0} 局游戏
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 多人模式 */}
              <Card className="bg-gradient-to-br from-purple-800/20 to-pink-800/20 border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">多人对战</CardTitle>
                  <p className="text-purple-200">与朋友或陌生人对战</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      即时对战
                    </Button>
                    <Button 
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      排位赛
                    </Button>
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={handleShowMainMenu}
                    >
                      <Gamepad2 className="w-4 h-4 mr-2" />
                      私人房间
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-purple-500/20">
                    <div className="flex items-center justify-between text-sm text-purple-200 mb-2">
                      <span>当前等级</span>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        {user?.rating || 1000} 分
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 主要特性 */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">主要特性</h2>
              <p className="text-xl text-blue-200">更多精彩功能等你来探索</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* 特性 1 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30 hover:border-gray-400/50 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <CardTitle className="text-xl text-white">多人在线对战</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  与全球玩家实时对战，体验竞技乐趣。
                </CardContent>
              </Card>

              {/* 特性 2 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30 hover:border-gray-400/50 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-6 h-6 text-gray-400" />
                  </div>
                  <CardTitle className="text-xl text-white">自定义游戏设置</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  调整游戏速度、控制方式等，打造个性化体验。
                </CardContent>
              </Card>

              {/* 特性 3 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30 hover:border-gray-400/50 transition-all duration-300 hover:scale-105">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-gray-400" />
                  </div>
                  <CardTitle className="text-xl text-white">排行榜与成就</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  挑战自我，赢取成就，登上全球排行榜。
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 统计数据 */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">统计数据</h2>
              <p className="text-xl text-blue-200">了解我们的社区</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {/* 统计 1 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">
                    12,345+
                  </CardTitle>
                  <p className="text-gray-300">注册用户</p>
                </CardHeader>
              </Card>

              {/* 统计 2 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">
                    5,678,901+
                  </CardTitle>
                  <p className="text-gray-300">已完成游戏</p>
                </CardHeader>
              </Card>

              {/* 统计 3 */}
              <Card className="bg-gradient-to-br from-gray-800/20 to-gray-900/20 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">
                    42
                  </CardTitle>
                  <p className="text-gray-300">平均游戏时间 (分钟)</p>
                </CardHeader>
              </Card>
            </div>
          </section>

          {/* 社交分享 */}
          <section className="text-center py-12">
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-sm">加入我们的社区</h2>
            <p className="text-xl text-blue-200 mb-8 drop-shadow-sm">
              分享你的高分，与朋友一起玩！
            </p>
            <div className="flex justify-center space-x-6">
              <Button variant="ghost" size="icon" className="text-white hover:text-blue-300 hover:bg-white/10">
                <Github className="w-5 h-5" />
                <span className="sr-only">GitHub</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:text-blue-300 hover:bg-white/10">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:text-blue-300 hover:bg-white/10">
                <Mail className="w-5 h-5" />
                <span className="sr-only">Email</span>
              </Button>
               <Button variant="ghost" size="icon" className="text-white hover:text-blue-300 hover:bg-white/10">
                <MessageCircle className="w-5 h-5" />
                <span className="sr-only">Discord</span>
              </Button>
            </div>
          </section>
        </main>
        
        <AdSpace position="right" width={240} height={600} />
      </div>

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} />
    </div>
  );
};

export default Index;
