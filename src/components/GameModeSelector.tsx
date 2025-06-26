
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GameMode {
  id: string;
  title: string;
  description: string;
  maxPlayers?: number;
  icon: string;
}

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
  onBackToMenu?: () => void;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onModeSelect, onBackToMenu }) => {
  const { t } = useLanguage();

  const singlePlayerModes: GameMode[] = [
    {
      id: 'sprint40',
      title: t('game.sprint40'),
      description: '尽快消除40行',
      icon: '🏃',
    },
    {
      id: 'ultra2min',
      title: t('game.ultra2min'),
      description: '2分钟内获得最高分',
      icon: '⚡',
    },
    {
      id: 'endless',
      title: t('game.endless'),
      description: '无尽模式，挑战极限',
      icon: '♾️',
    },
  ];

  const multiPlayerModes: GameMode[] = [
    {
      id: 'freeForAll',
      title: t('game.freeForAll'),
      description: '最多128人混战',
      maxPlayers: 128,
      icon: '⚔️',
    },
    {
      id: 'oneVsOne',
      title: t('game.oneVsOne'),
      description: '1对1对战',
      maxPlayers: 2,
      icon: '🥊',
    },
    {
      id: 'customRoom',
      title: t('game.customRoom'),
      description: '创建自定义房间',
      maxPlayers: 64,
      icon: '🏠',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center mb-2">{t('game.singlePlayer')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {singlePlayerModes.map((mode) => (
            <Card key={mode.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">{mode.icon}</div>
                <CardTitle>{mode.title}</CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => onModeSelect(mode)}
                >
                  {t('game.play')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-center mb-2">{t('game.multiPlayer')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {multiPlayerModes.map((mode) => (
            <Card key={mode.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">{mode.icon}</div>
                <CardTitle>{mode.title}</CardTitle>
                <CardDescription>
                  {mode.description}
                  {mode.maxPlayers && (
                    <div className="text-sm text-muted-foreground mt-1">
                      最大 {mode.maxPlayers} 人
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => onModeSelect(mode)}
                >
                  {t('game.play')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {onBackToMenu && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={onBackToMenu}>
            返回主菜单
          </Button>
        </div>
      )}
    </div>
  );
};

export default GameModeSelector;
