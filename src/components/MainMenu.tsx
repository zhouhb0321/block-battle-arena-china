
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface MainMenuProps {
  onGameStart: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onGameStart, onLeaderboard, onSettings }) => {
  const { t } = useLanguage();

  const menuItems = [
    {
      id: 'game',
      title: t('game.play'),
      description: t('game.singlePlayerDesc'),
      icon: '🎯',
      color: 'bg-game-green hover:bg-game-green/80',
      action: onGameStart
    },
    {
      id: 'leaderboard',
      title: t('nav.leaderboard'),
      description: t('game.rankedDesc'),
      icon: '🏆',
      color: 'bg-game-orange hover:bg-game-orange/80',
      action: onLeaderboard
    },
    {
      id: 'settings',
      title: t('nav.settings'),
      description: t('settings.controlsDesc'),
      icon: '⚙️',
      color: 'bg-game-purple hover:bg-game-purple/80',
      action: onSettings
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-game-gradient-primary bg-clip-text text-transparent">{t('game.title')}</h1>
        <p className="text-muted-foreground">{t('game.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow bg-card/50 border border-border">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">{item.icon}</div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className={`w-full text-white ${item.color}`}
                onClick={item.action}
              >
                {t('common.enter')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MainMenu;
