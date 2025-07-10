import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Bot, Trophy, Gamepad2, Crown, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface MultiPlayerMenuProps {
  onSelectMode: (mode: string, config?: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onSelectMode, onBack }) => {
  const { user } = useAuth();
  const [activeRooms, setActiveRooms] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  useEffect(() => {
    loadRoomStats();
  }, []);

  const loadRoomStats = async () => {
    try {
      const { data: rooms, error } = await supabase
        .from('battle_rooms')
        .select('current_players')
        .eq('status', 'waiting');

      if (error) {
        debugLog.error('Error loading room stats', error);
        return;
      }

      setActiveRooms(rooms?.length || 0);
      setOnlinePlayers(rooms?.reduce((sum, room) => sum + room.current_players, 0) || 0);
    } catch (error) {
      debugLog.error('Exception loading room stats', error);
    }
  };

  const menuOptions = [
    {
      id: 'quick-match',
      title: '快速匹配',
      description: '立即匹配在线玩家进行1v1对战',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-blue-500',
      disabled: false
    },
    {
      id: 'create-room',
      title: '创建房间',
      description: '创建自定义房间，邀请好友对战',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
      disabled: false
    },
    {
      id: 'join-room',
      title: '加入房间',
      description: '输入房间代码加入现有房间',
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'bg-purple-500',
      disabled: false
    },
    {
      id: 'bot-room',
      title: 'Bot 对战室',
      description: '与AI机器人对战，练习技巧',
      icon: <Bot className="w-6 h-6" />,
      color: 'bg-orange-500',
      disabled: false,
      note: '🤖 与智能AI对战，有初级、中级、高级三种难度可选择'
    },
    {
      id: 'ranked',
      title: '排位赛',
      description: '参与排位赛，提升你的段位',
      icon: <Trophy className="w-6 h-6" />,
      color: 'bg-yellow-500',
      disabled: true,
      comingSoon: true
    },
    {
      id: 'tournament',
      title: '锦标赛',
      description: '参加多人锦标赛，争夺冠军',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-red-500',
      disabled: true,
      comingSoon: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">多人游戏</h1>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>🎮 活跃房间: {activeRooms}</span>
          <span>👥 在线玩家: {onlinePlayers}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {menuOptions.map((option) => (
          <Card 
            key={option.id} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            onClick={() => !option.disabled && onSelectMode(option.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${option.color} text-white`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  {option.comingSoon && (
                    <Badge variant="secondary" className="mt-1">即将推出</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{option.description}</p>
              {option.note && (
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{option.note}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={onBack} variant="outline">
          返回主菜单
        </Button>
      </div>
    </div>
  );
};

export default MultiPlayerMenu;
