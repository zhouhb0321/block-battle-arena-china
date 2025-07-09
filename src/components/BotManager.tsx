
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Users, Settings, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BotProfile {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  description: string;
  avatar: string;
  pps: number;
  apm: number;
  isActive: boolean;
}

interface BotManagerProps {
  roomId?: string;
  onBotJoin?: (botId: string) => void;
  onBotLeave?: (botId: string) => void;
}

const BotManager: React.FC<BotManagerProps> = ({
  roomId,
  onBotJoin,
  onBotLeave
}) => {
  const { user } = useAuth();
  const [availableBots, setAvailableBots] = useState<BotProfile[]>([]);
  const [activeBots, setActiveBots] = useState<BotProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 预定义的Bot配置
  const defaultBots: BotProfile[] = [
    {
      id: 'bot-novice',
      name: 'Novice Bot',
      difficulty: 'easy',
      description: '基础AI，适合初学者练习',
      avatar: '🤖',
      pps: 1.2,
      apm: 80,
      isActive: false
    },
    {
      id: 'bot-casual',
      name: 'Casual Bot',
      difficulty: 'medium',
      description: '中等难度，会使用T-Spin',
      avatar: '🔵',
      pps: 2.5,
      apm: 140,
      isActive: false
    },
    {
      id: 'bot-competitive',
      name: 'Competitive Bot',
      difficulty: 'hard',
      description: '高级AI，擅长连击和完美清',
      avatar: '🔴',
      pps: 4.2,
      apm: 220,
      isActive: false
    },
    {
      id: 'bot-master',
      name: 'Master Bot',
      difficulty: 'expert',
      description: '专家级AI，接近人类高手水平',
      avatar: '👑',
      pps: 6.8,
      apm: 350,
      isActive: false
    }
  ];

  useEffect(() => {
    loadAvailableBots();
    if (roomId) {
      loadRoomBots();
    }
  }, [roomId]);

  const loadAvailableBots = () => {
    setAvailableBots(defaultBots);
    setLoading(false);
  };

  const loadRoomBots = async () => {
    if (!roomId) return;

    try {
      const { data: participants } = await supabase
        .from('battle_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_bot', true);

      if (participants) {
        const roomBots = participants.map(p => {
          const botProfile = defaultBots.find(bot => bot.id === p.user_id);
          return botProfile ? { ...botProfile, isActive: true } : null;
        }).filter(Boolean) as BotProfile[];
        
        setActiveBots(roomBots);
      }
    } catch (error) {
      console.error('Failed to load room bots:', error);
    }
  };

  const addBotToRoom = async (bot: BotProfile) => {
    if (!roomId || !user) return;

    try {
      // 添加Bot到房间参与者
      const { error } = await supabase
        .from('battle_participants')
        .insert({
          room_id: roomId,
          user_id: bot.id,
          username: bot.name,
          is_bot: true,
          position: activeBots.length + 1
        });

      if (error) throw error;

      // 更新本地状态
      setActiveBots(prev => [...prev, { ...bot, isActive: true }]);
      setAvailableBots(prev => 
        prev.map(b => b.id === bot.id ? { ...b, isActive: true } : b)
      );

      // 通知外部组件
      onBotJoin?.(bot.id);

      // 启动Bot游戏逻辑
      await startBotGameLogic(bot.id, roomId);
    } catch (error) {
      console.error('Failed to add bot to room:', error);
    }
  };

  const removeBotFromRoom = async (bot: BotProfile) => {
    if (!roomId) return;

    try {
      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', bot.id);

      if (error) throw error;

      // 更新本地状态
      setActiveBots(prev => prev.filter(b => b.id !== bot.id));
      setAvailableBots(prev => 
        prev.map(b => b.id === bot.id ? { ...b, isActive: false } : b)
      );

      onBotLeave?.(bot.id);
    } catch (error) {
      console.error('Failed to remove bot from room:', error);
    }
  };

  const startBotGameLogic = async (botId: string, roomId: string) => {
    try {
      // 调用Edge Function启动Bot游戏逻辑
      const { error } = await supabase.functions.invoke('bot-controller', {
        body: {
          action: 'start',
          botId,
          roomId
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to start bot game logic:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-orange-500';
      case 'expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      case 'expert': return '专家';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 当前房间中的Bot */}
      {roomId && activeBots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              房间中的Bot ({activeBots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{bot.avatar}</div>
                    <div>
                      <div className="font-medium text-red-600">{bot.name}</div>
                      <div className="text-sm text-gray-500">
                        PPS: {bot.pps} | APM: {bot.apm}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-white ${getDifficultyColor(bot.difficulty)}`}>
                      {getDifficultyLabel(bot.difficulty)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeBotFromRoom(bot)}
                    >
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 可用的Bot列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            可用Bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableBots.map((bot) => (
              <div
                key={bot.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  bot.isActive ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{bot.avatar}</div>
                  <div>
                    <div className="font-medium">{bot.name}</div>
                    <div className="text-sm text-gray-500">{bot.description}</div>
                    <div className="text-xs text-gray-400">
                      PPS: {bot.pps} | APM: {bot.apm}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-white ${getDifficultyColor(bot.difficulty)}`}>
                    {getDifficultyLabel(bot.difficulty)}
                  </Badge>
                  {roomId && (
                    <Button
                      size="sm"
                      onClick={() => addBotToRoom(bot)}
                      disabled={bot.isActive}
                    >
                      {bot.isActive ? '已加入' : '添加'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bot说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Bot说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-600">
          <p>• <strong>简单Bot</strong>: 基础行消除，适合初学者练习</p>
          <p>• <strong>中等Bot</strong>: 会使用基础T-Spin，有一定策略性</p>
          <p>• <strong>困难Bot</strong>: 高级策略，擅长连击和完美清</p>
          <p>• <strong>专家Bot</strong>: 接近人类高手水平，极具挑战性</p>
          <p className="mt-4 text-red-600">
            <strong>注意</strong>: Bot显示为红色方块，易于识别
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotManager;
