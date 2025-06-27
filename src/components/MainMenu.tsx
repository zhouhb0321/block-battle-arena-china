
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import MultiPlayerMenu from './menus/MultiPlayerMenu';
import SinglePlayerMenu from './menus/SinglePlayerMenu';
import LeagueMenu from './menus/LeagueMenu';
import SettingsMenu from './menus/SettingsMenu';

type MenuView = 'main' | 'multiplayer' | 'singleplayer' | 'league' | 'settings';

interface MainMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onGameStart }) => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<MenuView>('main');

  const menuItems = [
    {
      id: 'multiplayer',
      title: '多人游戏',
      description: '与其他玩家对战',
      icon: '🎮',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'singleplayer',
      title: '单人游戏',
      description: '练习和挑战模式',
      icon: '🎯',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'league',
      title: '联盟成就',
      description: '排行榜、记录和成就',
      icon: '🏆',
      color: 'bg-yellow-500 hover:bg-yellow-600'
    },
    {
      id: 'settings',
      title: '配置',
      description: '游戏设置和个人资料',
      icon: '⚙️',
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  const handleMenuSelect = (menuId: string) => {
    setCurrentView(menuId as MenuView);
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  if (currentView === 'multiplayer') {
    return <MultiPlayerMenu onGameStart={onGameStart} onBack={handleBackToMain} />;
  }

  if (currentView === 'singleplayer') {
    return <SinglePlayerMenu onGameStart={onGameStart} onBack={handleBackToMain} />;
  }

  if (currentView === 'league') {
    return <LeagueMenu onBack={handleBackToMain} />;
  }

  if (currentView === 'settings') {
    return <SettingsMenu onBack={handleBackToMain} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">俄罗斯方块</h1>
        <p className="text-gray-600">选择游戏模式开始游戏</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="text-6xl mb-4">{item.icon}</div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className={`w-full text-white ${item.color}`}
                onClick={() => handleMenuSelect(item.id)}
              >
                进入
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MainMenu;
