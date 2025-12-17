
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Users, Zap, Target, Coffee, User, Gamepad2, Bot, Trophy, Crown, AlertCircle, Plus, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { toast } from 'sonner';
import TeamBattleMenu from './TeamBattleMenu';
import { useBattleRoom } from '@/hooks/useBattleRoom';

interface MultiPlayerMenuProps {
  onSelectMode: (mode: string, config?: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onSelectMode, onBack }) => {
  const { user, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const { createRoom, joinRoom, loading: battleLoading, error: battleError } = useBattleRoom();
  const [activeRooms, setActiveRooms] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [subView, setSubView] = useState<'menu' | 'team-battle'>('menu');

  useEffect(() => {
    loadRoomStats();
  }, []);

  useEffect(() => {
    if (battleError) {
      setError(battleError);
    }
  }, [battleError]);

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

  const handleCreateRoom = async (mode: 'versus' | 'battle_royale' | 'league') => {
    if (!user) {
      setError('需要登录才能创建房间');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const room = await createRoom(mode);
      if (room) {
        toast.success(`房间创建成功！房间号: ${room.room_code}`);
        // Route to appropriate view based on mode
        if (mode === 'league') {
          onSelectMode('team-battle', { roomId: room.id });
        } else {
          onSelectMode('battle-lobby', { roomId: room.id });
        }
      }
    } catch (error) {
      debugLog.error('Create room failed', error);
      setError('创建房间失败，请重试');
    } finally {
      setIsCreating(false);
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

    // For 1v1 and custom-room, create a room directly
    if (mode === 'one-vs-one' || mode === 'custom-room') {
      await handleCreateRoom('versus');
      return;
    }

    // Team battle - create league room
    if (mode === 'team-battle') {
      await handleCreateRoom('league');
      return;
    }

    // Ranked mode - go to matchmaking system
    if (mode === 'ranked') {
      onSelectMode('ranked');
      return;
    }

    // Bot room - go to practice AI battle
    if (mode === 'bot-room') {
      onSelectMode('ai-battle');
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

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) {
      setError('请输入房间号');
      return;
    }

    if (!user) {
      await handleGuestLogin();
      setTimeout(() => handleJoinByCode(), 1000);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const room = await joinRoom(roomCode.trim());
      if (room) {
        toast.success('成功加入房间');
        onSelectMode('battle-lobby', { roomId: room.id });
      }
    } catch (error) {
      debugLog.error('加入房间失败:', error);
      setError('加入房间失败，请检查房间号');
    } finally {
      setIsJoining(false);
    }
  };

  const menuOptions = [
    {
      id: 'one-vs-one',
      title: '1v1 对战',
      description: '经典一对一俄罗斯方块对战',
      icon: <Sword className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'team-battle',
      title: t('teamBattle.title'),
      description: t('teamBattle.entryDesc'),
      icon: <Users className="w-8 h-8" />,
      disabled: false,
      guestAllowed: false
    },
    {
      id: 'ranked',
      title: '排位赛',
      description: '参与排位匹配，提升段位',
      icon: <Target className="w-8 h-8" />,
      disabled: false,
      guestAllowed: false
    },
    {
      id: 'custom-room',
      title: '自定义房间',
      description: '创建或加入自定义对战房间',
      icon: <Users className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'battle-royal',
      title: '大逃杀模式',
      description: '多人混战，最后一人获胜',
      icon: <Zap className="w-8 h-8" />,
      disabled: true,
      comingSoon: true,
      guestAllowed: false
    },
    {
      id: 'bot-room',
      title: 'AI 机器人对战',
      description: '与不同难度的 AI 机器人对战',
      icon: <Coffee className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
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

      {/* Quick Join by Room Code */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            快速加入房间
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="输入4位数字房间号"
              value={roomCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setRoomCode(value);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
              className="flex-1"
              maxLength={4}
            />
            <Button 
              onClick={handleJoinByCode}
              disabled={!roomCode.trim() || isJoining}
              className="px-6"
            >
              {isJoining ? '加入中...' : '加入'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <CardContent className="p-8 text-center space-y-4">
                <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
                  option.disabled 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                }`}>
                  {option.icon}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">
                    {option.title}
                    {option.comingSoon && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        即将推出
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                  
                  {!user && !option.guestAllowed && (
                    <div className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-1 rounded">
                      需要登录
                    </div>
                  )}
                </div>
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
