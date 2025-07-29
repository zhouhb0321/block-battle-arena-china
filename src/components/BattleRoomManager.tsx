
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Users, Trophy, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { debugLog } from '@/utils/debugLogger';

interface BattleRoom {
  id: string;
  room_code: string;
  mode: 'versus' | 'battle_royale' | 'league';
  current_players: number;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  created_by: string;
  created_at: string;
}

interface BattleRoomManagerProps {
  onJoinRoom: (roomId: string) => void;
}

const BattleRoomManager: React.FC<BattleRoomManagerProps> = ({ onJoinRoom }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
    
    // 订阅房间更新
    const subscription = supabase
      .channel('battle_rooms_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_rooms'
      }, () => {
        loadRooms();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadRooms = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) {
        debugLog.error('Failed to load rooms:', error);
        setError('加载房间列表失败');
        return;
      }
      
      // 正确处理类型转换
      const typedRooms = (data || []).map(room => ({
        ...room,
        mode: room.mode as 'versus' | 'battle_royale' | 'league',
        status: room.status as 'waiting' | 'playing' | 'finished'
      }));
      setRooms(typedRooms);
    } catch (error) {
      debugLog.error('Exception loading rooms:', error);
      setError('网络连接错误');
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (mode: 'versus' | 'battle_royale' | 'league') => {
    if (!user) {
      toast.error('需要登录才能创建房间');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('battle_rooms')
        .insert({
          room_code: roomCode,
          mode,
          max_players: mode === 'versus' ? 2 : 8,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        debugLog.error('Failed to create room:', error);
        toast.error('创建房间失败');
        return;
      }

      // 同时加入参与者表
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          username: user.username || 'Player',
          position: 1
        });

      if (participantError) {
        debugLog.error('Failed to join room as participant:', participantError);
        toast.error('加入房间失败');
        return;
      }

      toast.success(`房间创建成功！房间号: ${roomCode}`);
      onJoinRoom(data.id);
    } catch (error) {
      debugLog.error('Exception creating room:', error);
      setError('创建房间时发生错误');
      toast.error('创建房间失败');
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast.error('需要登录才能加入房间');
      return;
    }

    try {
      setError(null);
      
      // 检查房间是否还有空位
      const { data: room, error: roomError } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(count)')
        .eq('id', roomId)
        .single();

      if (roomError) {
        debugLog.error('Failed to fetch room:', roomError);
        toast.error('房间不存在');
        return;
      }

      if (!room || room.current_players >= room.max_players) {
        toast.error('房间已满或不存在');
        return;
      }

      // 检查是否已经在房间中
      const { data: existingParticipant } = await supabase
        .from('battle_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (existingParticipant) {
        toast.error('您已经在该房间中');
        return;
      }

      // 加入参与者表
      const { error: participantError } = await supabase
        .from('battle_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          username: user.username || 'Player',
          position: room.current_players + 1
        });

      if (participantError) {
        debugLog.error('Failed to join room:', participantError);
        toast.error('加入房间失败');
        return;
      }

      // 更新房间人数
      const { error: updateError } = await supabase
        .from('battle_rooms')
        .update({
          current_players: room.current_players + 1
        })
        .eq('id', roomId);

      if (updateError) {
        debugLog.error('Failed to update room player count:', updateError);
      }

      toast.success('成功加入房间');
      onJoinRoom(roomId);
    } catch (error) {
      debugLog.error('Exception joining room:', error);
      setError('加入房间时发生错误');
      toast.error('加入房间失败');
    }
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) {
      toast.error('请输入房间号');
      return;
    }

    try {
      setError(null);
      
      const { data: room, error } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (error || !room) {
        debugLog.error('Room not found:', error);
        toast.error('房间不存在或已开始游戏');
        return;
      }

      await joinRoom(room.id);
      setJoinCode('');
    } catch (error) {
      debugLog.error('Exception joining by code:', error);
      setError('通过房间号加入失败');
      toast.error('加入房间失败');
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'versus': return <Trophy className="w-4 h-4" />;
      case 'battle_royale': return <Zap className="w-4 h-4" />;
      case 'league': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'versus': return '1v1对战';
      case 'battle_royale': return '多人混战';
      case 'league': return '方块联盟';
      default: return mode;
    }
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">需要登录才能管理对战房间</p>
        <Button onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadRooms}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
      )}

      {/* 创建房间 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            创建房间
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => createRoom('versus')}
              disabled={isCreating}
              className="h-16 flex flex-col gap-2"
            >
              <Trophy className="w-6 h-6" />
              <span>1v1对战</span>
            </Button>
            <Button
              onClick={() => createRoom('battle_royale')}
              disabled={isCreating}
              className="h-16 flex flex-col gap-2"
              variant="outline"
            >
              <Zap className="w-6 h-6" />
              <span>多人混战</span>
            </Button>
            <Button
              onClick={() => createRoom('league')}
              disabled={isCreating}
              className="h-16 flex flex-col gap-2"
              variant="secondary"
            >
              <Users className="w-6 h-6" />
              <span>方块联盟</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 通过房间号加入 */}
      <Card>
        <CardHeader>
          <CardTitle>加入房间</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入房间号"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="uppercase"
              maxLength={6}
              onKeyPress={(e) => e.key === 'Enter' && joinByCode()}
            />
            <Button onClick={joinByCode} disabled={!joinCode.trim()}>
              加入
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 可用房间列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>可用房间</CardTitle>
            <Button variant="outline" size="sm" onClick={loadRooms}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-center text-gray-500 py-8">暂无可用房间</p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getModeIcon(room.mode)}
                    <div>
                      <div className="font-medium">{getModeLabel(room.mode)}</div>
                      <div className="text-sm text-gray-500">房间号: {room.room_code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {room.current_players}/{room.max_players}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => joinRoom(room.id)}
                      disabled={room.current_players >= room.max_players}
                    >
                      加入
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BattleRoomManager;
