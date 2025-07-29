
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Bot, Trophy, Gamepad2, Crown, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { toast } from 'sonner';

interface MultiPlayerMenuProps {
  onSelectMode: (mode: string, config?: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onSelectMode, onBack }) => {
  const { user, loginAsGuest } = useAuth();
  const [activeRooms, setActiveRooms] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoomStats();
  }, []);

  const loadRoomStats = async () => {
    try {
      setError(null);
      const { data: rooms, error } = await supabase
        .from('battle_rooms')
        .select('current_players')
        .eq('status', 'waiting');

      if (error) {
        debugLog.error('Error loading room stats', error);
        setError('加载房间统计失败');
        return;
      }

      setActiveRooms(rooms?.length || 0);
      setOnlinePlayers(rooms?.reduce((sum, room) => sum + room.current_players, 0) || 0);
    } catch (error) {
      debugLog.error('Exception loading room stats', error);
      setError('网络连接错误');
    }
  };

  const handleModeSelect = async (mode: string) => {
    if (!user) {
      setError('需要登录才能进行多人游戏');
      return;
    }

    if (user.isGuest && (mode === 'ranked' || mode === 'tournament')) {
      toast.error('访客用户无法参与排位赛和锦标赛');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onSelectMode(mode);
    } catch (error) {
      debugLog.error('Mode selection failed', error);
      setError('模式选择失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await loginAsGuest();
      toast.success('访客登录成功');
    } catch (error) {
      debugLog.error('Guest login failed', error);
      setError('访客登录失败，请重试');
      toast.error('访客登录失败');
    } finally {
      setLoading(false);
    }
  };

  const menuOptions = [
    {
      id: 'quick-match',
      title: '快速匹配',
      description: '立即匹配在线玩家进行1v1对战',
      icon: <Zap className="w-6 h-6" />,
      color: 'bg-blue-500',
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'create-room',
      title: '创建房间',
      description: '创建自定义房间，邀请好友对战',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'join-room',
      title: '加入房间',
      description: '输入房间代码加入现有房间',
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'bg-purple-500',
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'bot-room',
      title: 'Bot 对战室',
      description: '与AI机器人对战，练习技巧',
      icon: <Bot className="w-6 h-6" />,
      color: 'bg-orange-500',
      disabled: false,
      guestAllowed: true,
      note: '🤖 与智能AI对战，有初级、中级、高级三种难度可选择'
    },
    {
      id: 'ranked',
      title: '排位赛',
      description: '参与排位赛，提升你的段位',
      icon: <Trophy className="w-6 h-6" />,
      color: 'bg-yellow-500',
      disabled: true,
      guestAllowed: false,
      comingSoon: true
    },
    {
      id: 'tournament',
      title: '锦标赛',
      description: '参加多人锦标赛，争夺冠军',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-red-500',
      disabled: true,
      guestAllowed: false,
      comingSoon: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">多人游戏</h1>
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span>🎮 活跃房间: {activeRooms}</span>
          <span>👥 在线玩家: {onlinePlayers}</span>
          {user && <span>👤 {user.isGuest ? '访客用户' : '注册用户'}: {user.username}</span>}
        </div>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadRoomStats}
              className="ml-auto"
            >
              重试
            </Button>
          </div>
        )}

        {!user && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-blue-800 mb-3">需要登录才能进行多人游戏</p>
            <Button 
              onClick={handleGuestLogin} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? '登录中...' : '访客快速登录'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {menuOptions.map((option) => {
          const isDisabledForGuest = user?.isGuest && !option.guestAllowed;
          const finalDisabled = option.disabled || !user || isDisabledForGuest || loading;
          
          return (
            <Card 
              key={option.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                finalDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              onClick={() => !finalDisabled && handleModeSelect(option.id)}
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
                    {isDisabledForGuest && (
                      <Badge variant="outline" className="mt-1">需要注册</Badge>
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
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button onClick={onBack} variant="outline" disabled={loading}>
          返回主菜单
        </Button>
      </div>
    </div>
  );
};

export default MultiPlayerMenu;
