
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import MainMenu from '@/components/MainMenu';
import TetrisGame from '@/components/TetrisGame';
import FixedTetrisGame from '@/components/FixedTetrisGame';
import SettingsMenu from '@/components/menus/SettingsMenu';
import NavigationBar from '@/components/NavigationBar';
import { Toaster } from '@/components/ui/sonner';

type AppState = 'menu' | 'game' | 'settings' | 'leaderboard';

const Index = () => {
  const { user, loading } = useAuth();
  const [appState, setAppState] = useState<AppState>('menu');
  const [showAuthModal, setShowAuthModal] = useState(false);

  console.log('Index rendered, user:', user, 'loading:', loading);

  // 如果未登录且不在加载中，显示认证模态框
  React.useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  const handleGameStart = () => {
    console.log('Game start triggered');
    setAppState('game');
  };

  const handleBackToMenu = () => {
    console.log('Back to menu triggered');
    setAppState('menu');
  };

  const handleSettings = () => {
    setAppState('settings');
  };

  const handleLeaderboard = () => {
    setAppState('leaderboard');
  };

  // 如果正在加载，显示加载界面
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-8">
        {appState === 'menu' && (
          <MainMenu
            onGameStart={handleGameStart}
            onLeaderboard={handleLeaderboard}
            onSettings={handleSettings}
          />
        )}
        
        {appState === 'game' && (
          <FixedTetrisGame onBackToMenu={handleBackToMenu} />
        )}
        
        {appState === 'settings' && (
          <SettingsMenu onBackToMenu={handleBackToMenu} />
        )}
        
        {appState === 'leaderboard' && (
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
