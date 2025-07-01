
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Play, Users, Settings, LogIn } from 'lucide-react';
import UserMenu from './UserMenu';
import type { ViewType } from '@/types/navigation';

interface NavigationBarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onAuthModalOpen: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentView,
  onViewChange,
  onAuthModalOpen
}) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600 cursor-pointer" 
                onClick={() => onViewChange('home')}>
              Tetris Game
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant={currentView === 'game' ? 'default' : 'ghost'}
              onClick={() => onViewChange('game')}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              单人游戏
            </Button>

            <Button
              variant={currentView === 'ranked' ? 'default' : 'ghost'}
              onClick={() => onViewChange('ranked')}
              className="flex items-center gap-2"
              disabled={!isAuthenticated}
            >
              <Users className="w-4 h-4" />
              多人游戏
            </Button>

            <Button
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-2"
              disabled={!isAuthenticated}
            >
              <Settings className="w-4 h-4" />
              设置
            </Button>
          </div>

          {/* User Menu or Login Button */}
          <div className="flex items-center">
            {isAuthenticated && user ? (
              <UserMenu 
                onSettingsClick={() => onViewChange('settings')}
                onProfileClick={() => onViewChange('profile')}
              />
            ) : (
              <Button onClick={onAuthModalOpen} className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
