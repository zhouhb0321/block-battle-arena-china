
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Play, Users, Settings, LogIn, Shield } from 'lucide-react';
import UserMenu from './UserMenu';
import LanguageSelector from './LanguageSelector';
import ThemeSwitcher from './ThemeSwitcher';
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
  const { t } = useLanguage();

  return (
    <nav className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold bg-game-gradient-primary bg-clip-text text-transparent cursor-pointer" 
                onClick={() => onViewChange('home')}>
              {t('game.title')}
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
              {t('nav.play')}
            </Button>

            <Button
              variant={currentView === 'ranked' ? 'default' : 'ghost'}
              onClick={() => onViewChange('ranked')}
              className="flex items-center gap-2"
              disabled={!isAuthenticated}
            >
              <Users className="w-4 h-4" />
              {t('nav.multiplayer')}
            </Button>

            <Button
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              onClick={() => onViewChange('settings')}
              className="flex items-center gap-2"
              disabled={!isAuthenticated}
            >
              <Settings className="w-4 h-4" />
              {t('nav.settings')}
            </Button>

            {/* Admin Button */}
            {user?.isAdmin && (
              <Button
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                onClick={() => {
                  console.log('导航栏管理面板按钮点击', { user: user.isAdmin });
                  onViewChange('admin');
                }}
                className="flex items-center gap-2 text-game-purple"
              >
                <Shield className="w-4 h-4" />
                {t('admin.panel')}
              </Button>
            )}
          </div>

          {/* User Menu, Theme Switcher, Language Selector, and Login Button */}
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSelector />
            {isAuthenticated && user ? (
              <UserMenu 
                onSettingsClick={() => onViewChange('settings')}
                onProfileClick={() => onViewChange('profile')}
                onAdminPanelClick={() => onViewChange('admin')}
              />
            ) : (
              <Button onClick={onAuthModalOpen} className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                {t('auth.login')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
