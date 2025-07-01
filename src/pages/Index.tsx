
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import MainMenu from '@/components/MainMenu';
import SimpleTetrisGame from '@/components/SimpleTetrisGame';
import SettingsMenu from '@/components/menus/SettingsMenu';
import GameModeSelector from '@/components/GameModeSelector';
import ReplaySystem from '@/components/ReplaySystem';
import NavigationBar from '@/components/NavigationBar';
import { Toaster } from '@/components/ui/sonner';
import type { GameMode } from '@/utils/gameTypes';

type ViewType = 'home' | 'gameMode' | 'game' | 'settings' | 'profile' | 'ranked' | 'admin' | 'income' | 'replays';

const Index = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);

  console.log('Index rendered, user:', user, 'loading:', loading);

  const handleGameStart = () => {
    console.log('Game start triggered - showing mode selector');
    setCurrentView('gameMode');
  };

  const handleModeSelect = (mode: GameMode) => {
    console.log('Game mode selected:', mode);
    setSelectedGameMode(mode);
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    console.log('Back to menu triggered');
    setCurrentView('home');
    setSelectedGameMode(null);
  };

  const handleBackToModeSelector = () => {
    console.log('Back to mode selector');
    setCurrentView('gameMode');
    setSelectedGameMode(null);
  };

  const handleSettings = () => {
    setCurrentView('settings');
  };

  const handleLeaderboard = () => {
    setCurrentView('ranked');
  };

  const handleViewChange = (view: ViewType) => {
    console.log('View change to:', view);
    setCurrentView(view);
  };

  const handleAuthModalOpen = () => {
    setShowAuthModal(true);
  };

  // 修复加载状态 - 只在真正需要时显示加载
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">正在加载...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <NavigationBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        onAuthModalOpen={handleAuthModalOpen}
      />
      
      <div className="container mx-auto px-4 py-8">
        {currentView === 'home' && (
          <MainMenu
            onGameStart={handleGameStart}
            onLeaderboard={handleLeaderboard}
            onSettings={handleSettings}
          />
        )}

        {currentView === 'gameMode' && (
          <GameModeSelector
            onModeSelect={handleModeSelect}
            onBack={handleBackToMenu}
          />
        )}
        
        {currentView === 'game' && selectedGameMode && (
          <SimpleTetrisGame 
            onBackToMenu={handleBackToModeSelector}
          />
        )}
        
        {currentView === 'settings' && (
          <SettingsMenu onBackToMenu={handleBackToMenu} />
        )}

        {currentView === 'replays' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <button 
                onClick={handleBackToMenu}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-4"
              >
                返回主菜单
              </button>
              <h2 className="text-2xl font-bold text-white">游戏回放</h2>
            </div>
            <ReplaySystem />
          </div>
        )}
        
        {currentView === 'ranked' && (
          <div className="text-center text-white">
            <h2 className="text-2xl mb-4">排行榜</h2>
            <p className="mb-4">排行榜功能开发中...</p>
            <button 
              onClick={handleBackToMenu}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              返回菜单
            </button>
          </div>
        )}

        {currentView === 'admin' && user?.isAdmin && (
          <div className="text-center text-white">
            <h2 className="text-2xl mb-4">管理员面板</h2>
            <p className="mb-4">管理员功能开发中...</p>
            <button 
              onClick={handleBackToMenu}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              返回菜单
            </button>
          </div>
        )}

        {currentView === 'income' && user?.isAdmin && (
          <div className="text-center text-white">
            <h2 className="text-2xl mb-4">收入管理</h2>
            <p className="mb-4">收入管理功能开发中...</p>
            <button 
              onClick={handleBackToMenu}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              返回菜单
            </button>
          </div>
        )}
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <Toaster />
    </div>
  );
};

export default Index;
