
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import GameLauncher from '@/components/GameLauncher';
import MultiPlayerMenu from '@/components/menus/MultiPlayerMenu';
import SettingsMenu from '@/components/menus/SettingsMenu';
import RankedMatchmakingSystem from '@/components/RankedMatchmakingSystem';
import PracticeMode from '@/components/PracticeMode';
import AuthModal from '@/components/AuthModal';
import NavigationBar from '@/components/NavigationBar';
import ReplaySystem from '@/components/ReplaySystem';
import LeaderboardView from '@/components/LeaderboardView';
import FixSummary from '@/components/FixSummary';
import AdminPanel from '@/components/AdminPanel';
import AdSpace from '@/components/AdSpace';
import EnhancedMusicPlayer from '@/components/EnhancedMusicPlayer';
import OneVsOneGameArea from '@/components/game/OneVsOneGameArea';
import TeamGameArea from '@/components/game/TeamGameArea';
import { AIBattleGame } from '@/components/game/AIBattleGame';
import { BattleRoomLobby } from '@/components/battle/BattleRoomLobby';
import { BattleGameView } from '@/components/battle/BattleGameView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Users, Trophy, Settings, LogIn, Music, ArrowLeft, GraduationCap } from 'lucide-react';
import type { ViewType } from '@/types/navigation';
import { GAME_MODES } from '@/utils/gameTypes';

const Index = () => {
  const { user, isAuthenticated, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [battleRoomId, setBattleRoomId] = useState<string | null>(null);

  // 调试管理员状态
  useEffect(() => {
    console.log('Index页面用户状态更新:', { 
      user: user?.email, 
      isAdmin: user?.isAdmin, 
      isAuthenticated 
    });
  }, [user, isAuthenticated]);

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
    console.log('视图切换请求:', { view, isAuthenticated, isAdmin: user?.isAdmin });
    
    if (!isAuthenticated && (view === 'settings' || view === 'replays' || view === 'ranked' || view === 'admin' || view === 'multiplayer' || view === 'practice')) {
      setShowAuthModal(true);
      return;
    }
    
    // 管理员权限检查
    if (view === 'admin' && !user?.isAdmin) {
      console.log('非管理员用户尝试访问管理面板');
      return;
    }
    
    setCurrentView(view);
  };

  const handleGameModeStart = (gameType: string, gameMode: any) => {
    console.log('Starting game directly with mode:', gameMode);
    setCurrentView('game');
    // Store game mode for TetrisGame component
    (window as any).selectedGameMode = gameMode;
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'game':
        return (
          <GameLauncher 
            onBackToMenu={handleBackToMenu}
          />
        );
      case 'multiplayer':
        return (
          <MultiPlayerMenu 
            onSelectMode={(mode, config) => {
              if (mode === 'battle-lobby' && config?.roomId) {
                setBattleRoomId(config.roomId);
                setCurrentView('battle-lobby' as ViewType);
              } else {
                setCurrentView('game');
              }
            }} 
            onBack={handleBackToMenu}
          />
        );
      case 'battle-lobby':
        return battleRoomId ? (
          <BattleRoomLobby 
            roomId={battleRoomId}
            onGameStart={() => setCurrentView('battle-game' as ViewType)}
            onLeave={() => {
              setBattleRoomId(null);
              handleBackToMenu();
            }}
          />
        ) : null;
      case 'battle-game':
        return battleRoomId ? (
          <BattleGameView 
            roomId={battleRoomId}
            onBack={() => {
              setBattleRoomId(null);
              handleBackToMenu();
            }}
          />
        ) : null;
      case 'ranked':
        return (
          <RankedMatchmakingSystem 
            onStartMatch={() => setCurrentView('game')} 
            onBack={handleBackToMenu}
          />
        );
      case 'practice':
        return (
          <PracticeMode 
            onGameStart={(gameType, options) => {
              console.log('Practice game start:', gameType, options);
              // AI对战模式：显示AI战斗提示
              if (gameType === 'practice' && options?.botDifficulty) {
                setCurrentView('ai-battle');
                (window as any).aiBattleOptions = options;
              } else {
                // 其他练习模式（T-Spin练习等）
                handleGameModeStart('practice', options?.gameMode || GAME_MODES[0]);
              }
            }}
            onBack={handleBackToMenu}
          />
        );
      case 'ai-battle':
        return <AIBattleGame difficulty={(window as any).aiBattleOptions?.botDifficulty || 'medium'} onBack={handleBackToMenu} />;
      case 'settings':
        return (
          <SettingsMenu 
            onBackToMenu={handleBackToMenu}
          />
        );
      case 'replays':
        return (
          <div className="max-w-6xl mx-auto space-y-6">
            <ReplaySystem />
            <FixSummary />
          </div>
        );
      case 'admin':
        return <AdminPanel />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'profile':
        return (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">{t('nav.profile')}</h2>
            <p>Profile page under development...</p>
            <Button onClick={handleBackToMenu} className="mt-4">
              {t('common.backToHome')}
            </Button>
          </div>
        );
      case 'home':
      default:
        return (
          <div className="space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-6 py-12">
              <h1 className="text-5xl md:text-7xl font-bold bg-game-gradient-primary bg-clip-text text-transparent">
                {t('game.title')}
              </h1>
              <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
                {t('game.description')}
              </p>
              {user && (
                <div className="inline-block px-6 py-3 bg-game-gradient-primary rounded-full text-white font-medium shadow-lg">
                  {t('common.welcome')}, {user.username}!
                </div>
              )}
            </div>

            {/* Quick Start Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={async () => {
                  if (!isAuthenticated) {
                    await loginAsGuest();
                  }
                  handleViewChange('game');
                }}
                className="bg-game-gradient-primary hover:opacity-90 text-white px-8 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Play className="w-6 h-6 mr-3" />
                {isAuthenticated ? t('game.play') : 'Start Guest Playing'}
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                onClick={() => handleViewChange('multiplayer')}
                disabled={!isAuthenticated}
                className="border-2 border-primary px-8 py-4 text-lg font-medium rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Users className="w-6 h-6 mr-3" />
                {t('nav.multiplayer')}
              </Button>
              
              {!isAuthenticated && (
                <Button 
                  size="lg"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-game-gradient-secondary hover:opacity-90 text-white px-8 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <LogIn className="w-6 h-6 mr-3" />
                  {t('auth.login')} / {t('auth.register')}
                </Button>
              )}
            </div>

            {/* Game Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-card/50 backdrop-blur-sm hover:scale-105" onClick={() => handleGameModeStart('singleplayer', GAME_MODES.find(m => m.id === 'sprint40'))}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-game-blue/10 rounded-2xl flex items-center justify-center group-hover:bg-game-blue/20 transition-colors">
                    <Play className="w-8 h-8 text-game-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{t('game.sprint40')}</h3>
                    <p className="text-xs text-muted-foreground">{t('game.singlePlayerDesc')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-card/50 backdrop-blur-sm hover:scale-105" onClick={() => handleGameModeStart('singleplayer', GAME_MODES.find(m => m.id === 'timeAttack2'))}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-game-orange/10 rounded-2xl flex items-center justify-center group-hover:bg-game-orange/20 transition-colors">
                    <Trophy className="w-8 h-8 text-game-orange" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{t('game.ultra2min')}</h3>
                    <p className="text-xs text-muted-foreground">{t('game.singlePlayerDesc')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-card/50 backdrop-blur-sm hover:scale-105" onClick={() => handleGameModeStart('singleplayer', GAME_MODES.find(m => m.id === 'endless'))}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-game-green/10 rounded-2xl flex items-center justify-center group-hover:bg-game-green/20 transition-colors">
                    <Settings className="w-8 h-8 text-game-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{t('game.endless')}</h3>
                    <p className="text-xs text-muted-foreground">{t('game.singlePlayerDesc')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-card/50 backdrop-blur-sm hover:scale-105" onClick={() => handleViewChange('practice')}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-game-cyan/10 rounded-2xl flex items-center justify-center group-hover:bg-game-cyan/20 transition-colors">
                    <GraduationCap className="w-8 h-8 text-game-cyan" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{t('nav.practice')}</h3>
                    <p className="text-xs text-muted-foreground">{t('practice.description')}</p>
                    {!isAuthenticated && (
                      <div className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded mt-1">
                        {t('common.needLogin')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-card/50 backdrop-blur-sm hover:scale-105" onClick={() => handleViewChange('multiplayer')}>
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-game-purple/10 rounded-2xl flex items-center justify-center group-hover:bg-game-purple/20 transition-colors">
                    <Users className="w-8 h-8 text-game-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{t('nav.multiplayer')}</h3>
                    <p className="text-xs text-muted-foreground">{t('game.multiPlayerDesc')}</p>
                    {!isAuthenticated && (
                      <div className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded mt-1">
                        {t('common.needLogin')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Features */}
            <div className="bg-card/30 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-border/50">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-game-gradient-primary bg-clip-text text-transparent">
                Platform Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-game-blue/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-game-blue" />
                  </div>
                  <h3 className="text-xl font-semibold">Professional Competition</h3>
                  <p className="text-muted-foreground">Standard SRS system with T-Spin support</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-game-orange/10 rounded-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-game-orange" />
                  </div>
                  <h3 className="text-xl font-semibold">Social Features</h3>
                  <p className="text-muted-foreground">Multiplayer battles, room system, friend interactions</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-game-green/10 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-game-green" />
                  </div>
                  <h3 className="text-xl font-semibold">Replay System</h3>
                  <p className="text-muted-foreground">Record and share exciting moments, improve your skills</p>
                </div>
              </div>
            </div>

            {/* Ready to Start */}
            <div className="text-center space-y-6 py-8">
              <h2 className="text-2xl md:text-3xl font-bold">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground">Join our gaming community and start your Tetris journey</p>
              {!isAuthenticated && (
                <Button 
                  size="lg"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-game-gradient-primary hover:opacity-90 text-white px-10 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {t('auth.register')} & Start Playing
                </Button>
              )}
            </div>

            {/* Ad Space */}
            <div className="flex justify-center">
              <AdSpace position="bottom" width={728} height={90} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-game-gradient-bg">
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
