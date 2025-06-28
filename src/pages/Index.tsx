
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import MainMenu from '@/components/MainMenu';
import TetrisGame from '@/components/TetrisGame';
import FixedTetrisGame from '@/components/FixedTetrisGame';
import SettingsMenu from '@/components/menus/SettingsMenu';
import NavigationBar from '@/components/NavigationBar';
import { Toaster } from '@/components/ui/sonner';

type ViewType = 'home' | 'game' | 'settings' | 'profile' | 'ranked' | 'admin' | 'income';

const Index = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);

  console.log('Index rendered, user:', user, 'loading:', loading);

  // 简化认证模态框逻辑 - 不自动弹出，让用户主动点击登录
  const handleGameStart = () => {
    console.log('Game start triggered');
    setCurrentView('game');
  };

  const handleBackToMenu = () => {
    console.log('Back to menu triggered');
    setCurrentView('home');
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
        
        {currentView === 'game' && (
          <FixedTetrisGame onBackToMenu={handleBackToMenu} />
        )}
        
        {currentView === 'settings' && (
          <SettingsMenu onBackToMenu={handleBackToMenu} />
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

        {/* 管理员界面 */}
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

        {/* 收入管理界面 */}
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
