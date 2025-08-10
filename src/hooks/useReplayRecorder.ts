
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
    duration: number; // Duration in milliseconds
    gameMode: string;
    opponentId?: string;
    gameType?: 'single' | 'ranked' | '1v1';
  } | null) => { // 允许传入 null 来停止而不保存
    if (!isRecording) {
      return null;
    }

    // 如果 gameStats 为 null，或者用户是访客，则停止录制但不保存
    if (!gameStats || !user || user.isGuest) {
      console.log('Replay recording stopped without saving.');
      setIsRecording(false);
      return null;
    }

    console.log('Stopping replay recording with', actionsRef.current.length, 'actions. Attempting to save.');

    try {
      // 总是保存录像，移除了原有的 leaderboard 检查逻辑
      const compressed = ReplayCompressor.compressActions(actionsRef.current);
      const compressedActions = ReplayCompressor.encodeToBinary(
        compressed
      );
      const compressionRatio = ReplayCompressor.calculateCompressionRatio(
        actionsRef.current,
        compressedActions
      );
      const checksumData: OptimizedReplayData = {
        gameMetadata: {
          gameMode: gameStats.gameMode,
          seed: replayData?.seed || `${Date.now()}`,
          startTime: replayData?.startTime || startTimeRef.current,
          endTime: (replayData?.startTime || startTimeRef.current) + gameStats.duration,
          playerIds: [user!.id],
          matchId: replayData?.matchId,
          gameId: replayData?.gameId,
        },
        playerActions: { [user!.id]: compressed },
        gameEvents: [],
        checksum: ''
      };
      const checksum = ReplayCompressor.generateChecksum(checksumData);

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
          duration_seconds: gameStats.duration, // Storing duration in ms
          checksum: checksum,
          version: '2.1' // Version bump for new logic
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving compressed replay:', error);
        setIsRecording(false);
        return null;
      }

      console.log('Compressed replay saved successfully:', { id: data.id });
      setIsRecording(false);
      return data;

    } catch (error) {
      console.error('Error in stopRecording logic:', error);
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
