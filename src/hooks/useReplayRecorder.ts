
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReplayAction } from '@/utils/gameTypes';
import { ReplayCompressor, SeededRandom } from '@/utils/replayCompression';
import type { OptimizedReplayData } from '@/utils/replayTypes';

interface ReplayData {
  actions: ReplayAction[];
  startTime: number;
  initialBoard: number[][];
  settings: any;
  seed?: string;
  matchId?: string;
  gameId?: string;
}

export const useReplayRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const actionsRef = useRef<ReplayAction[]>([]);
  const startTimeRef = useRef<number>(0);
  const { user } = useAuth();

  // 开始录制 - 支持单人和多人模式
  const startRecording = useCallback((
    initialBoard: number[][], 
    settings: any,
    seed?: string,
    matchId?: string,
    gameId?: string
  ) => {
    console.log('Starting replay recording...', { seed, matchId, gameId });
    startTimeRef.current = Date.now();
    actionsRef.current = [];
    
    // 如果没有提供seed，生成一个新的
    const gameSeed = seed || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setReplayData({
      actions: [],
      startTime: startTimeRef.current,
      initialBoard: initialBoard.map(row => [...row]),
      settings,
      seed: gameSeed,
      matchId,
      gameId
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

  // 停止录制并保存 - 使用优化的压缩格式
  const stopRecording = useCallback(async (gameStats: {
    score: number;
    lines: number;
    level: number;
    pps: number;
    apm: number;
    duration: number;
    gameMode: string;
    opponentId?: string;
    gameType?: 'single' | 'ranked' | '1v1';
  }) => {
    if (!isRecording || !user || user.isGuest) {
      setIsRecording(false);
      return null;
    }

    console.log('Stopping replay recording with', actionsRef.current.length, 'actions');

    try {
      // 创建优化的录像数据
      const optimizedData: OptimizedReplayData = {
        gameMetadata: {
          gameMode: gameStats.gameMode,
          seed: replayData?.seed || `${Date.now()}`,
          startTime: startTimeRef.current,
          endTime: Date.now(),
          playerIds: [user.id, ...(gameStats.opponentId ? [gameStats.opponentId] : [])],
          matchId: replayData?.matchId,
          gameId: replayData?.gameId
        },
        playerActions: {
          [user.id]: ReplayCompressor.compressActions(actionsRef.current)
        },
        gameEvents: [], // 可以在后续版本中添加游戏事件
        checksum: ''
      };

      // 生成校验和
      optimizedData.checksum = ReplayCompressor.generateChecksum(optimizedData);

      // 压缩动作数据为二进制
      const compressedActions = ReplayCompressor.encodeToBinary(
        ReplayCompressor.compressActions(actionsRef.current)
      );

      // 计算压缩比率
      const compressionRatio = ReplayCompressor.calculateCompressionRatio(
        actionsRef.current, 
        compressedActions
      );

      // 保存到新的压缩录像表
      const { data, error } = await supabase
        .from('compressed_replays')
        .insert({
          user_id: user.id,
          opponent_id: gameStats.opponentId || null,
          game_mode: gameStats.gameMode,
          game_type: gameStats.gameType || 'single',
          seed: replayData?.seed || `${Date.now()}`,
          initial_board: replayData?.initialBoard || [],
          game_settings: replayData?.settings || {},
          compressed_actions: compressedActions,
          actions_count: actionsRef.current.length,
          compression_ratio: compressionRatio,
          final_score: gameStats.score,
          final_lines: gameStats.lines,
          final_level: gameStats.level,
          pps: gameStats.pps,
          apm: gameStats.apm,
          duration_seconds: Math.round(gameStats.duration / 1000),
          checksum: optimizedData.checksum,
          version: '2.0'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving compressed replay:', error);
        setIsRecording(false);
        return null;
      }

      console.log('Compressed replay saved successfully:', {
        id: data.id,
        originalActions: actionsRef.current.length,
        compressedSize: compressedActions.length,
        compressionRatio: compressionRatio
      });

      setIsRecording(false);
      return data;
    } catch (error) {
      console.error('Error saving compressed replay:', error);
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
