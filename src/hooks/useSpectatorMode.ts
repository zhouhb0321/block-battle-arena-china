/**
 * 观战模式 Hook
 * 管理观战/参战状态切换
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SpectatorState {
  isSpectating: boolean;
  spectators: SpectatorInfo[];
  canToggle: boolean;
}

export interface SpectatorInfo {
  id: string;
  user_id: string;
  username: string;
  joined_at: string;
}

export interface UseSpectatorModeReturn {
  isSpectating: boolean;
  spectators: SpectatorInfo[];
  spectatorCount: number;
  toggleSpectatorMode: () => Promise<void>;
  joinAsSpectator: (roomId: string) => Promise<boolean>;
  leaveSpectatorMode: (roomId: string) => Promise<void>;
  canToggle: boolean;
  loading: boolean;
}

export const useSpectatorMode = (roomId: string | null): UseSpectatorModeReturn => {
  const { user } = useAuth();
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [canToggle, setCanToggle] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 加载观战者列表
  const loadSpectators = useCallback(async () => {
    if (!roomId) return;
    
    const { data, error } = await supabase
      .from('room_spectators')
      .select('*')
      .eq('room_id', roomId);
    
    if (!error && data) {
      setSpectators(data);
      // 检查当前用户是否在观战
      if (user) {
        const isUserSpectating = data.some(s => s.user_id === user.id);
        setIsSpectating(isUserSpectating);
      }
    }
  }, [roomId, user]);

  // 订阅观战者变化
  useEffect(() => {
    if (!roomId) return;

    loadSpectators();

    // 订阅实时更新
    channelRef.current = supabase
      .channel(`spectators_${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_spectators',
        filter: `room_id=eq.${roomId}`
      }, () => {
        loadSpectators();
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, loadSpectators]);

  // 加入观战
  const joinAsSpectator = useCallback(async (targetRoomId: string): Promise<boolean> => {
    if (!user) {
      toast.error('请先登录');
      return false;
    }

    setLoading(true);
    try {
      // 先检查房间是否允许观战
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('allow_spectators, spectator_count')
        .eq('id', targetRoomId)
        .single();

      if (!room?.allow_spectators) {
        toast.error('该房间不允许观战');
        return false;
      }

      // 如果是参与者，先从参与者中移除
      await supabase
        .from('battle_participants')
        .delete()
        .eq('room_id', targetRoomId)
        .eq('user_id', user.id);

      // 添加到观战者列表
      const { error } = await supabase
        .from('room_spectators')
        .upsert({
          room_id: targetRoomId,
          user_id: user.id,
          username: user.username || 'Spectator',
          joined_at: new Date().toISOString()
        }, { onConflict: 'room_id,user_id' });

      if (error) throw error;

      // 更新房间观战人数
      await supabase
        .from('battle_rooms')
        .update({ spectator_count: (room.spectator_count || 0) + 1 })
        .eq('id', targetRoomId);

      setIsSpectating(true);
      toast.success('已切换到观战模式');
      return true;
    } catch (error) {
      console.error('Failed to join as spectator:', error);
      toast.error('切换观战模式失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 离开观战
  const leaveSpectatorMode = useCallback(async (targetRoomId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // 从观战者列表移除
      await supabase
        .from('room_spectators')
        .delete()
        .eq('room_id', targetRoomId)
        .eq('user_id', user.id);

      // 更新房间观战人数
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('spectator_count')
        .eq('id', targetRoomId)
        .single();

      if (room) {
        await supabase
          .from('battle_rooms')
          .update({ spectator_count: Math.max(0, (room.spectator_count || 1) - 1) })
          .eq('id', targetRoomId);
      }

      setIsSpectating(false);
    } catch (error) {
      console.error('Failed to leave spectator mode:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 切换观战/参战状态
  const toggleSpectatorMode = useCallback(async () => {
    if (!roomId || !user || !canToggle) return;

    if (isSpectating) {
      // 从观战切换到参战
      await leaveSpectatorMode(roomId);
      
      // 重新加入为参与者
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('current_players, max_players')
        .eq('id', roomId)
        .single();

      if (room && room.current_players < room.max_players) {
        const nextPosition = room.current_players + 1;
        
        const { error } = await supabase
          .from('battle_participants')
          .insert({
            room_id: roomId,
            user_id: user.id,
            username: user.username || 'Player',
            position: nextPosition,
            status: 'waiting',
            score: 0
          });

        if (!error) {
          await supabase
            .from('battle_rooms')
            .update({ current_players: room.current_players + 1 })
            .eq('id', roomId);
          
          toast.success('已切换到参战模式');
        }
      } else {
        toast.error('房间已满，无法加入');
        // 重新变为观战者
        await joinAsSpectator(roomId);
      }
    } else {
      // 从参战切换到观战
      await joinAsSpectator(roomId);
    }
  }, [roomId, user, isSpectating, canToggle, joinAsSpectator, leaveSpectatorMode]);

  return {
    isSpectating,
    spectators,
    spectatorCount: spectators.length,
    toggleSpectatorMode,
    joinAsSpectator,
    leaveSpectatorMode,
    canToggle,
    loading
  };
};
