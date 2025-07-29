
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReplayAction } from '@/utils/gameTypes';

interface ReplayData {
  actions: ReplayAction[];
  startTime: number;
  initialBoard: number[][];
  settings: any;
}

export const useReplayRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const actionsRef = useRef<ReplayAction[]>([]);
  const startTimeRef = useRef<number>(0);
  const { user } = useAuth();

  // 开始录制
  const startRecording = useCallback((initialBoard: number[][], settings: any) => {
    console.log('Starting replay recording...');
    startTimeRef.current = Date.now();
    actionsRef.current = [];
    setReplayData({
      actions: [],
      startTime: startTimeRef.current,
      initialBoard: initialBoard.map(row => [...row]),
      settings
    });
    setIsRecording(true);
  }, []);

  // 记录动作
  const recordAction = useCallback((
    action: 'move' | 'rotate' | 'drop' | 'hold' | 'place',
    data: any
  ) => {
    if (!isRecording) return;

    const replayAction: ReplayAction = {
      timestamp: Date.now() - startTimeRef.current,
      action,
      data
    };

    actionsRef.current.push(replayAction);
    
    // 更新状态（但不频繁更新以避免性能问题）
    if (actionsRef.current.length % 10 === 0) {
      setReplayData(prev => prev ? {
        ...prev,
        actions: [...actionsRef.current]
      } : null);
    }
  }, [isRecording]);

  // 停止录制并保存
  const stopRecording = useCallback(async (gameStats: {
    score: number;
    lines: number;
    level: number;
    pps: number;
    apm: number;
    duration: number;
    gameMode: string;
    opponentId?: string;
  }) => {
    if (!isRecording || !user || user.isGuest) {
      setIsRecording(false);
      return null;
    }

    console.log('Stopping replay recording with', actionsRef.current.length, 'actions');

    const finalReplayData = {
      actions: [...actionsRef.current],
      startTime: startTimeRef.current,
      initialBoard: replayData?.initialBoard || [],
      settings: replayData?.settings || {}
    };

    try {
      const { data, error } = await supabase
        .from('game_replays_new')
        .insert({
          user_id: user.id,
          opponent_id: gameStats.opponentId || null,
          game_mode: gameStats.gameMode,
          final_score: gameStats.score,
          final_lines: gameStats.lines,
          final_level: gameStats.level,
          pps: gameStats.pps,
          apm: gameStats.apm,
          duration: gameStats.duration,
          replay_data: finalReplayData as any
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving replay:', error);
        setIsRecording(false);
        return null;
      }

      console.log('Replay saved successfully:', data);
      setIsRecording(false);
      return data;
    } catch (error) {
      console.error('Error saving replay:', error);
      setIsRecording(false);
      return null;
    }
  }, [isRecording, user, replayData]);

  // 清除录制数据
  const clearRecording = useCallback(() => {
    setIsRecording(false);
    setReplayData(null);
    actionsRef.current = [];
  }, []);

  return {
    isRecording,
    recordAction,
    startRecording,
    stopRecording,
    clearRecording,
    replayData
  };
};
