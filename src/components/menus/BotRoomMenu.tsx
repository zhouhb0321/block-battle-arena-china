import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import BotManager from '@/components/BotManager';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';

interface BotRoomMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const BotRoomMenu: React.FC<BotRoomMenuProps> = ({ onGameStart, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<'selecting' | 'room'>('selecting');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { connect, isConnected, sendMessage } = useBattleWebSocket();

  useEffect(() => {
    loadBotRooms();
  }, []);

  const loadBotRooms = async () => {
    setLoading(true);
    try {
      const { data: rooms } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(count)
        `)
        .eq('mode', 'bot_room')
        .eq('status', 'waiting');

      setAvailableRooms(rooms || []);
    } catch (error) {
      console.error('Failed to load bot rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBotRoom = async () => {
    if (!user || user.isGuest) return;

    setLoading(true);
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: room, error } = await supabase
        .from('battle_rooms')
        .insert({
          room_code: roomCode,
          mode: 'bot_room',
          max_players: 8,
          created_by: user.id,
          settings: {
            allowBots: true,
            botDifficulty: 'mixed'
          }
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('battle_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: user.username,
          position: 1,
          is_bot: false
        });

      setCurrentRoomId(room.id);
      setRoomStatus('room');
      connect(room.id);
    } catch (error) {
      console.error('Failed to create bot room:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinBotRoom = async (roomId: string) => {
    if (!user || user.isGuest) return;

    try {
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!room || room.status !== 'waiting') {
        alert(t('room.roomUnavailable'));
        return;
      }

      await supabase
        .from('battle_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: user.username,
          position: room.current_players + 1,
          is_bot: false
        });

      setCurrentRoomId(roomId);
      setRoomStatus('room');
      connect(roomId);
    } catch (error) {
      console.error('Failed to join bot room:', error);
    }
  };

  const startGame = () => {
    if (!currentRoomId) return;

    sendMessage({
      type: 'start_game',
      data: {
        roomId: currentRoomId,
        gameMode: 'bot_battle'
      }
    });

    onGameStart('multiplayer', {
      gameMode: {
        id: 'bot_battle',
        displayName: t('bot.room'),
        description: t('multiplayer.botRoomDesc'),
        isTimeAttack: false
      },
      roomId: currentRoomId,
      isBotRoom: true
    });
  };

  const handleBackToMenu = () => {
    if (roomStatus === 'room') {
      setRoomStatus('selecting');
      setCurrentRoomId(null);
    } else {
      onBack();
    }
  };

  if (roomStatus === 'room' && currentRoomId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleBackToMenu} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Bot className="w-8 h-8" />
              {t('bot.room')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              {isConnected ? (
                <span className="text-green-500">● {t('bot.connected')}</span>
              ) : (
                <span className="text-destructive">● {t('bot.connecting')}</span>
              )}
            </div>
            <Button onClick={startGame} className="bg-primary hover:bg-primary/90">
              <Play className="w-4 h-4 mr-2" />
              {t('bot.startGame')}
            </Button>
          </div>
        </div>

        <BotManager 
          roomId={currentRoomId}
          onBotJoin={(botId) => {
            console.log('Bot joined:', botId);
          }}
          onBotLeave={(botId) => {
            console.log('Bot left:', botId);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
        <h2 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-8 h-8" />
          {t('bot.room')}
        </h2>
      </div>

      {/* Create new Bot room */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {t('bot.createRoom')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {t('bot.createRoomDesc')}
          </p>
          <Button 
            onClick={createBotRoom}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? t('common.creating') : t('bot.createRoom')}
          </Button>
        </CardContent>
      </Card>

      {/* Available Bot rooms */}
      <Card>
        <CardHeader>
          <CardTitle>{t('bot.availableRooms')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : availableRooms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('bot.noRooms')}</p>
          ) : (
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">{t('bot.room')} #{room.room_code}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('bot.creator')}: {room.created_by} | {t('bot.players')}: {room.current_players}/{room.max_players}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => joinBotRoom(room.id)}
                    disabled={room.current_players >= room.max_players}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {t('room.join')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot room description */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('bot.aboutRooms')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• {t('bot.aboutDesc1')}</p>
          <p>• {t('bot.aboutDesc2')}</p>
          <p>• {t('bot.aboutDesc3')}</p>
          <p>• {t('bot.aboutDesc4')}</p>
          <p>• {t('bot.aboutDesc5')}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotRoomMenu;
