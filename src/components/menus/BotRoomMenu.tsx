
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BotManager from '@/components/BotManager';
import { useBattleWebSocket } from '@/hooks/useBattleWebSocket';

interface BotRoomMenuProps {
  onGameStart: (gameType: string, gameMode: any) => void;
  onBack: () => void;
}

const BotRoomMenu: React.FC<BotRoomMenuProps> = ({ onGameStart, onBack }) => {
  const { user } = useAuth();
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

      // 加入参与者表
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
      // 检查房间状态
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!room || room.status !== 'waiting') {
        alert('房间不可用');
        return;
      }

      // 加入房间
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

    // 发送开始游戏消息
    sendMessage({
      type: 'start_game',
      data: {
        roomId: currentRoomId,
        gameMode: 'bot_battle'
      }
    });

    // 启动游戏
    onGameStart('multiplayer', {
      gameMode: {
        id: 'bot_battle',
        displayName: 'Bot对战',
        description: '与AI机器人对战',
        isTimeAttack: false
      },
      roomId: currentRoomId,
      isBotRoom: true
    });
  };

  const handleBackToMenu = () => {
    if (roomStatus === 'room') {
      setRoomStatus('selecting');
      setCurrentRootId(null);
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
              返回
            </Button>
            <h2 className="text-3xl font-bold text-red-500 flex items-center gap-2">
              <Bot className="w-8 h-8" />
              Bot房间
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              {isConnected ? (
                <span className="text-green-500">● 已连接</span>
              ) : (
                <span className="text-red-500">● 连接中...</span>
              )}
            </div>
            <Button onClick={startGame} className="bg-red-500 hover:bg-red-600">
              <Play className="w-4 h-4 mr-2" />
              开始游戏
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
          返回
        </Button>
        <h2 className="text-3xl font-bold text-red-500 flex items-center gap-2">
          <Bot className="w-8 h-8" />
          Bot房间
        </h2>
      </div>

      {/* 创建新的Bot房间 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-red-500" />
            创建Bot房间
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            创建一个专门的Bot房间，可以添加不同难度的AI机器人进行对战练习
          </p>
          <Button 
            onClick={createBotRoom}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? '创建中...' : '创建Bot房间'}
          </Button>
        </CardContent>
      </Card>

      {/* 现有的Bot房间 */}
      <Card>
        <CardHeader>
          <CardTitle>可用的Bot房间</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : availableRooms.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无可用的Bot房间</p>
          ) : (
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">Bot房间 #{room.room_code}</div>
                      <div className="text-sm text-gray-500">
                        创建者: {room.created_by} | 玩家: {room.current_players}/{room.max_players}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => joinBotRoom(room.id)}
                    disabled={room.current_players >= room.max_players}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    加入
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot房间说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>关于Bot房间</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-600">
          <p>• Bot房间是专门与AI机器人对战的游戏模式</p>
          <p>• 房间中的Bot显示为<span className="text-red-500 font-bold">红色方块</span>，易于识别</p>
          <p>• 支持4种不同难度的Bot：简单、中等、困难、专家</p>
          <p>• 可以同时与多个Bot和真实玩家一起游戏</p>
          <p>• 适合练习技巧和挑战更高难度</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotRoomMenu;
