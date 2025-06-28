
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
      title: '开始游戏',
      description: '立即开始俄罗斯方块游戏',
      icon: '🎯',
      color: 'bg-green-500 hover:bg-green-600',
      action: onGameStart
    },
    {
      id: 'leaderboard',
      title: '排行榜',
      description: '查看全球玩家排名',
      icon: '🏆',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      action: onLeaderboard
    },
    {
      id: 'settings',
      title: '设置',
      description: '游戏设置和个人资料',
      icon: '⚙️',
      color: 'bg-gray-500 hover:bg-gray-600',
      action: onSettings
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">俄罗斯方块</h1>
        <p className="text-muted-foreground">选择功能开始体验</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                onClick={item.action}
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

