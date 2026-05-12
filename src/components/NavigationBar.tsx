import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Play, Users, LogIn, Medal, MessageCircle, Lock } from 'lucide-react';
import UserMenu from './UserMenu';
import LanguageSelector from './LanguageSelector';
import ThemeSwitcher from './ThemeSwitcher';
import { Badge } from '@/components/ui/badge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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
  const { unreadCount } = useUnreadMessages();

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

          {/* Navigation Links - 精简为3个核心按钮 */}
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
              variant={currentView === 'multiplayer' ? 'default' : 'ghost'}
              onClick={() => isAuthenticated ? onViewChange('multiplayer') : onAuthModalOpen()}
              className={`flex items-center gap-2 relative ${!isAuthenticated ? 'opacity-60' : ''}`}
              title={!isAuthenticated ? t('common.needLogin') : undefined}
            >
              <Users className="w-4 h-4" />
              {t('nav.multiplayer')}
              {!isAuthenticated && <Lock className="w-3 h-3 ml-1 opacity-70" />}
            </Button>

            <Button
              variant={currentView === 'leaderboard' ? 'default' : 'ghost'}
              onClick={() => onViewChange('leaderboard')}
              className="flex items-center gap-2"
            >
              <Medal className="w-4 h-4" />
              {t('nav.leaderboard')}
            </Button>
          </div>

          {/* User Menu, Theme Switcher, Language Selector, and Login Button */}
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSelector />
            {isAuthenticated && unreadCount > 0 && (
              <div className="relative">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </div>
            )}
            {isAuthenticated && user ? (
              <UserMenu 
                onNavigate={onViewChange}
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
