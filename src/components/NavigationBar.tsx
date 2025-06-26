
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
  isAdmin?: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ 
  currentView, 
  onViewChange, 
  onAuthModalOpen,
  isAdmin = false
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
            variant={currentView === 'single' ? 'default' : 'ghost'}
            onClick={() => onViewChange('single')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Play className="w-4 h-4" />
            {t('nav.play')}
          </Button>
          
          <Button
            variant={currentView === 'multi' ? 'default' : 'ghost'}
            onClick={() => onViewChange('multi')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Users className="w-4 h-4" />
            {t('nav.multiplayer')}
          </Button>
          
          <Button
            variant={currentView === 'ranked' ? 'default' : 'ghost'}
            onClick={() => onViewChange('ranked')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Trophy className="w-4 h-4" />
            {t('game.ranked')}
          </Button>
          
          <Button
            variant={currentView === 'settings' ? 'default' : 'ghost'}
            onClick={() => onViewChange('settings')}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <Settings className="w-4 h-4" />
            {t('nav.settings')}
          </Button>

          {/* Admin Only Navigation */}
          {isAdmin && (
            <>
              <Button
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                onClick={() => onViewChange('admin')}
                className="flex items-center gap-2 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-400/10"
              >
                <Shield className="w-4 h-4" />
                {t('admin.panel')}
              </Button>
              
              <Button
                variant={currentView === 'income' ? 'default' : 'ghost'}
                onClick={() => onViewChange('income')}
                className="flex items-center gap-2 text-green-300 hover:text-green-200 hover:bg-green-400/10"
              >
                <DollarSign className="w-4 h-4" />
                {t('admin.income')}
              </Button>
            </>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <LanguageSelector />
          
          {user && !user.isGuest ? (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
              <User className="w-4 h-4 text-gray-300" />
              <span className="text-white font-medium">{user.username}</span>
              {isAdmin && <span className="text-yellow-300 text-sm font-semibold">[管理员]</span>}
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={onAuthModalOpen}
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
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
