
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot } from 'lucide-react';
import BattleRoomManager from '@/components/BattleRoomManager';
import BotRoomMenu from '@/components/menus/BotRoomMenu';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';
import { useLanguage } from '@/contexts/LanguageContext';

interface MultiPlayerMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onGameStart, onBack }) => {
  const [view, setView] = useState<'modes' | 'rooms' | 'battle' | 'botRoom'>('modes');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const { connect, isConnected, lastMessage } = useBattleWebSocket();
  const { t } = useLanguage();

  const multiPlayerModes = [
    {
      id: 'quickGame',
      title: t('multiplayer.quick_game'),
      description: t('multiplayer.quick_game_desc'),
      icon: '⚡',
      color: 'bg-game-orange hover:bg-game-orange/80',
      action: () => setView('rooms')
    },
    {
      id: 'league',
      title: t('multiplayer.league'),
      description: t('multiplayer.league_desc'),
      icon: '🏅',
      color: 'bg-game-purple hover:bg-game-purple/80',
      action: () => setView('rooms')
    },
    {
      id: 'customRoom',
      title: t('multiplayer.custom_room'),
      description: t('multiplayer.custom_room_desc'),
      icon: '🏠',
      color: 'bg-game-blue hover:bg-game-blue/80',
      action: () => setView('rooms')
    },
    {
      id: 'botRoom',
      title: 'Bot房间',
      description: '与AI机器人对战练习',
      icon: '🤖',
      color: 'bg-red-500 hover:bg-red-600',
      action: () => setView('botRoom')
    }
  ];

  const handleJoinRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    connect(roomId);
    setView('battle');
  };

  const handleBackToModes = () => {
    setView('modes');
    setCurrentRoomId(null);
  };

  const renderView = () => {
    switch (view) {
      case 'botRoom':
        return (
          <BotRoomMenu
            onGameStart={onGameStart}
            onBack={handleBackToModes}
          />
        );

      case 'rooms':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBackToModes} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
              <h3 className="text-2xl font-bold">{t('multiplayer.select_room')}</h3>
            </div>
            <BattleRoomManager onJoinRoom={handleJoinRoom} />
          </div>
        );

      case 'battle':
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={handleBackToModes} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('multiplayer.leave_room')}
              </Button>
              <h3 className="text-2xl font-bold">{t('multiplayer.battle_room')}</h3>
              <div className="ml-4">
                {isConnected ? (
                  <span className="text-game-green text-sm">● {t('multiplayer.connected')}</span>
                ) : (
                  <span className="text-game-red text-sm">● {t('multiplayer.connecting')}</span>
                )}
              </div>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-lg mb-4">{t('multiplayer.waiting_players')}</p>
                  <p className="text-sm text-muted-foreground">{t('multiplayer.room_id')}: {currentRoomId}</p>
                  {lastMessage && (
                    <div className="mt-4 p-3 bg-muted rounded">
                      <pre className="text-xs">{JSON.stringify(lastMessage, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {multiPlayerModes.map((mode) => (
              <Card key={mode.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{mode.icon}</div>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription className="text-sm">{mode.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className={`w-full text-white ${mode.color}`}
                    onClick={mode.action}
                  >
                    {mode.id === 'botRoom' ? '进入Bot房间' : t('multiplayer.enter_game')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }
  };

  if (view === 'botRoom') {
    return renderView();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {view === 'modes' && (
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h2 className="text-3xl font-bold bg-game-gradient-primary bg-clip-text text-transparent">{t('menu.multiPlayer')}</h2>
        </div>
      )}

      {renderView()}

      {view === 'modes' && (
        <div className="mt-8 bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Game Mode Information:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>{t('multiplayer.quick_game')}</strong>: Join or leave anytime, challenge higher-level players</li>
            <li>• <strong>{t('multiplayer.league')}</strong>: Official matches, best of 5, affects league score</li>
            <li>• <strong>{t('multiplayer.custom_room')}</strong>: Supports practice mode (with undo) and battle mode</li>
            <li>• <strong>Bot房间</strong>: 与AI机器人对战，提升技巧的最佳选择</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiPlayerMenu;
