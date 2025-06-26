
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import LanguageSelector from '@/components/LanguageSelector';
import { Home, Play, Users, User, Trophy, Settings } from 'lucide-react';

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
    <nav className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">{t('game.title')}</h1>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Button
            variant={currentView === 'menu' ? 'default' : 'ghost'}
            onClick={() => onViewChange('menu')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            {t('nav.home')}
          </Button>
          
          <Button
            variant={currentView === 'single' ? 'default' : 'ghost'}
            onClick={() => onViewChange('single')}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {t('nav.play')}
          </Button>
          
          <Button
            variant={currentView === 'multi' ? 'default' : 'ghost'}
            onClick={() => onViewChange('multi')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {t('nav.multiplayer')}
          </Button>
          
          <Button
            variant={currentView === 'ranked' ? 'default' : 'ghost'}
            onClick={() => onViewChange('ranked')}
            className="flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            {t('game.ranked')}
          </Button>
          
          <Button
            variant={currentView === 'settings' ? 'default' : 'ghost'}
            onClick={() => onViewChange('settings')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('nav.settings')}
          </Button>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <LanguageSelector />
          
          {user && !user.isGuest ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-white">{user.username}</span>
            </div>
          ) : (
            <Button variant="outline" onClick={onAuthModalOpen}>
              {t('auth.login')}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
