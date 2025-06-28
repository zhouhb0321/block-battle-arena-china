
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/LanguageSelector';
import { Home, Play, Users, User, Trophy, Settings, Shield, DollarSign } from 'lucide-react';

interface NavigationBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onAuthModalOpen: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ 
  currentView, 
  onViewChange, 
  onAuthModalOpen
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <nav className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-600 px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center shadow-md">
            <Play className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white drop-shadow-sm">{t('game.title')}</h1>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-4">
          <Button
            variant={currentView === 'menu' ? 'default' : 'ghost'}
            onClick={() => onViewChange('menu')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Home className="w-4 h-4" />
            {t('nav.home')}
          </Button>
          
          <Button
            variant={currentView === 'game' ? 'default' : 'ghost'}
            onClick={() => onViewChange('game')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Play className="w-4 h-4" />
            开始游戏
          </Button>
          
          <Button
            variant={currentView === 'ranked' ? 'default' : 'ghost'}
            onClick={() => onViewChange('ranked')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Trophy className="w-4 h-4" />
            排行榜
          </Button>
          
          <Button
            variant={currentView === 'settings' ? 'default' : 'ghost'}
            onClick={() => onViewChange('settings')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Settings className="w-4 h-4" />
            设置
          </Button>

          {/* 管理员导航 - 只有管理员才能看到 */}
          {user?.isAdmin && (
            <>
              <Button
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                onClick={() => onViewChange('admin')}
                className="flex items-center gap-2 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-400/10 border border-yellow-400/30"
              >
                <Shield className="w-4 h-4" />
                管理面板
              </Button>
              
              <Button
                variant={currentView === 'income' ? 'default' : 'ghost'}
                onClick={() => onViewChange('income')}
                className="flex items-center gap-2 text-green-300 hover:text-green-200 hover:bg-green-400/10 border border-green-400/30"
              >
                <DollarSign className="w-4 h-4" />
                收入管理
              </Button>
            </>
          )}
        </div>

        {/* Right Side - 更明显的登录按钮 */}
        <div className="flex items-center gap-4">
          <LanguageSelector />
          
          {user && !user.isGuest ? (
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/20">
              <User className="w-4 h-4 text-gray-300" />
              <span className="text-white font-medium">{user.username}</span>
              {user.isAdmin && (
                <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold">
                  管理员
                </span>
              )}
            </div>
          ) : (
            <Button 
              variant="default"
              onClick={onAuthModalOpen}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 shadow-lg border border-blue-500"
            >
              {t('auth.login')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;

