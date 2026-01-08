import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BattleRoom {
  id: string;
  room_code: string;
  mode: string;
  status: string;
  max_players: number;
  current_players: number;
  created_by: string;
  custom_settings?: any;
  room_password?: string;
  allow_spectators?: boolean;
}

export interface BattleParticipant {
  id: string;
  user_id: string;
  username: string;
  position: number;
  status: string;
  team?: string;
}

export const useBattleRoom = () => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<BattleRoom | null>(null);
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 创建房间
  const createRoom = useCallback(async (
    mode: 'versus' | 'battle_royale' | 'league',
    settings?: {
      password?: string;
      allowSpectators?: boolean;
      customSettings?: any;
    }
  ) => {
    if (!user) {
      setError('需要登录才能创建房间');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 生成唯一房间号
      let roomCode: string;
      let attempts = 0;
      
      do {
        roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        attempts++;
        
        const { data: existing } = await supabase
          .from('battle_rooms')
          .select('id')
          .eq('room_code', roomCode)
          .eq('status', 'waiting')
          .single();
          
        if (!existing) break;
      } while (attempts < 10);

      if (attempts >= 10) {
        throw new Error('无法生成唯一房间号');
      }

      // 创建房间
      const { data: room, error: roomError } = await supabase
        .from('battle_rooms')
        .insert({
          room_code: roomCode,
          mode,
          max_players: mode === 'versus' ? 2 : 8,
          created_by: user.id,
          room_password: settings?.password,
          allow_spectators: settings?.allowSpectators ?? true,
          custom_settings: settings?.customSettings
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 加入房间 (使用数据库允许的状态值: active, eliminated, disconnected)
      const { error: joinError } = await supabase
        .from('battle_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: user.username || 'Player',
          position: 1,
          status: 'active'
        });

      if (joinError) throw joinError;

      // 更新房间人数
      await supabase
        .from('battle_rooms')
        .update({ current_players: 1 })
        .eq('id', room.id);

      setCurrentRoom(room);
      toast.success(`房间创建成功! 房间号: ${roomCode}`);
      
      return room;
    } catch (err: any) {
      setError(err.message || '创建房间失败');
      toast.error('创建房间失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 加入房间
  const joinRoom = useCallback(async (roomIdOrCode: string, password?: string): Promise<BattleRoom | null> => {
    if (!user) {
      setError('需要登录才能加入房间');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 查找房间 (支持ID或房间号)
      let room: BattleRoom | null = null;
      
      // 先尝试用ID查找
      const { data: roomById } = await supabase
        .from('battle_rooms')
        .select('*')
        .eq('id', roomIdOrCode)
        .single();
      
      if (roomById) {
        room = roomById;
      } else {
        // 用房间号查找
        const { data: roomByCode } = await supabase
          .from('battle_rooms')
          .select('*')
          .eq('room_code', roomIdOrCode)
          .eq('status', 'waiting')
          .single();
        room = roomByCode;
      }

      if (!room) {
        throw new Error('房间不存在或已关闭');
      }

      // 检查密码 - 更明确的错误提示
      if (room.room_password) {
        if (!password) {
          throw new Error('此房间需要密码');
        }
        if (room.room_password !== password) {
          throw new Error('房间密码错误');
        }
      }

      // 检查人数
      if (room.current_players >= room.max_players) {
        throw new Error('房间已满');
      }

      // 检查是否已在房间中
      const { data: existing } = await supabase
        .from('battle_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        setCurrentRoom(room);
        return room;
      }

      // 团队模式：自动分配队伍
      let assignedTeam: string | undefined;
      const customSettings = room.custom_settings as any;
      if (customSettings?.team_mode) {
        // 获取当前队伍人数
        const { data: currentParticipants } = await supabase
          .from('battle_participants')
          .select('team')
          .eq('room_id', room.id);
        
        const teamACount = currentParticipants?.filter(p => p.team === 'A').length || 0;
        const teamBCount = currentParticipants?.filter(p => p.team === 'B').length || 0;
        
        // 分配到人数较少的队伍
        assignedTeam = teamACount <= teamBCount ? 'A' : 'B';
      }

      // 加入房间 (使用数据库允许的状态值: active, eliminated, disconnected)
      const { error: joinError } = await supabase
        .from('battle_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: user.username || 'Player',
          position: room.current_players + 1,
          status: 'active',
          team: assignedTeam
        });

      if (joinError) throw joinError;

      // 更新房间人数
      await supabase
        .from('battle_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      const updatedRoom = { ...room, current_players: room.current_players + 1 };
      setCurrentRoom(updatedRoom);
      toast.success('成功加入房间');
      
      return updatedRoom;
    } catch (err: any) {
      setError(err.message || '加入房间失败');
      toast.error(err.message || '加入房间失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 离开房间
  const leaveRoom = useCallback(async () => {
    if (!user || !currentRoom) return;

    try {
      // 删除参与者记录
      await supabase
        .from('battle_participants')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);

      // 更新房间人数
      const newCount = Math.max(0, currentRoom.current_players - 1);
      
      if (newCount === 0) {
        // 如果没人了，关闭房间
        await supabase
          .from('battle_rooms')
          .update({ status: 'finished' })
          .eq('id', currentRoom.id);
      } else {
        await supabase
          .from('battle_rooms')
          .update({ current_players: newCount })
          .eq('id', currentRoom.id);
      }

      setCurrentRoom(null);
      setParticipants([]);
    } catch (err) {
      console.error('离开房间失败:', err);
    }
  }, [user, currentRoom]);

  // 更新准备状态 - 使用score字段标记准备状态 (score=1表示准备就绪)
  const setReady = useCallback(async (ready: boolean) => {
    if (!user || !currentRoom) return;

    try {
      await supabase
        .from('battle_participants')
        .update({ score: ready ? 1 : 0 })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('更新准备状态失败:', err);
    }
  }, [user, currentRoom]);

  // 开始游戏
  const startGame = useCallback(async () => {
    if (!user || !currentRoom) return false;

    // 检查是否是房主
    if (currentRoom.created_by !== user.id) {
      toast.error('只有房主可以开始游戏');
      return false;
    }

    try {
      // 检查所有玩家是否准备
      const { data: participants } = await supabase
        .from('battle_participants')
        .select('*')
        .eq('room_id', currentRoom.id);

      if (!participants || participants.length < 2) {
        toast.error('需要至少2名玩家才能开始游戏');
        return false;
      }

      // 使用score字段判断准备状态 (score=1表示准备就绪)
      const allReady = participants.every(p => p.score === 1);
      if (!allReady) {
        toast.error('所有玩家需要准备就绪');
        return false;
      }

      // 更新房间状态
      await supabase
        .from('battle_rooms')
        .update({ 
          status: 'playing',
          started_at: new Date().toISOString()
        })
        .eq('id', currentRoom.id);

      return true;
    } catch (err) {
      console.error('开始游戏失败:', err);
      return false;
    }
  }, [user, currentRoom]);

  // 监听房间变化
  useEffect(() => {
    if (!currentRoom) return;

    const channel = supabase
      .channel(`room_changes_${currentRoom.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_participants',
        filter: `room_id=eq.${currentRoom.id}`
      }, async () => {
        const { data } = await supabase
          .from('battle_participants')
          .select('*')
          .eq('room_id', currentRoom.id)
          .order('position');
        
        if (data) {
          setParticipants(data);
        }
      })
      .subscribe();

    // 初始加载参与者
    supabase
      .from('battle_participants')
      .select('*')
      .eq('room_id', currentRoom.id)
      .order('position')
      .then(({ data }) => {
        if (data) setParticipants(data);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id]);

  return {
    currentRoom,
    participants,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame
  };
};
