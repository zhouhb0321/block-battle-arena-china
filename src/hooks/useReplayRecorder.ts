import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReplayAction, GameSettings } from '@/utils/gameTypes';
import { ReplayCompressor } from '@/utils/replayCompression';
import type { OptimizedReplayData } from '@/utils/replayTypes';

interface ReplayData {
  actions: ReplayAction[];
  startTime: number;
  initialBoard: number[][];
  settings: Partial<GameSettings>;
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

  const startRecording = useCallback((
    initialBoard: number[][], 
    settings: Partial<GameSettings>,
    seed?: string,
    matchId?: string,
    gameId?: string
  ) => {
    startTimeRef.current = Date.now();
    actionsRef.current = [];
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

  const recordAction = useCallback((
    action: 'move' | 'rotate' | 'drop' | 'hold' | 'place',
    data: Record<string, unknown>
  ) => {
    if (!isRecording) return;
    actionsRef.current.push({
      timestamp: Date.now() - startTimeRef.current,
      action,
      data
    });
  }, [isRecording]);

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
  } | null): Promise<{ saved: boolean; isNewRecord: boolean }> => {
    if (!isRecording) return { saved: false, isNewRecord: false };
    if (!gameStats || !user || user.isGuest) {
      setIsRecording(false);
      return { saved: false, isNewRecord: false };
    }

    // Don't save replays for endless mode
    if (gameStats.gameMode === 'endless') {
      console.log('Endless mode - not saving replay');
      setIsRecording(false);
      return { saved: false, isNewRecord: false };
    }

    let isNewRecord = false;
    const mode = gameStats.gameMode;
    const isSprint40 = mode === 'sprint40';
    const isTimeAttack2 = mode === 'timeAttack2' || mode === 'ultra2min';
    const is1v1League = gameStats.gameType === '1v1' || gameStats.gameType === 'ranked';

    // Save top 500 for sprint40 and timeAttack2, always save 1v1/ranked
    if (isSprint40 || isTimeAttack2 || is1v1League) {
      let query = supabase.from('compressed_replays').select('id, final_score, duration_seconds');
      if (isTimeAttack2) {
        query = query.in('game_mode', ['timeAttack2', 'ultra2min']).order('final_score', { ascending: false }).limit(500);
      } else {
        query = query.eq('game_mode', 'sprint40').order('duration_seconds', { ascending: true }).limit(500);
      }
      const { data: existing, error: fetchError } = await query;

      if (fetchError) {
        console.warn('Could not fetch leaderboard. Saving replay without checking rank.', fetchError);
      } else {
        if (existing.length < 500) {
          isNewRecord = true;
        } else {
          const worst = existing[existing.length - 1];
          const gameDurationInSeconds = gameStats.duration / 1000;
          const isWorseOrEqual = isTimeAttack2
            ? gameStats.score <= (worst.final_score ?? 0)
            : gameDurationInSeconds >= (worst.duration_seconds ?? Number.MAX_SAFE_INTEGER);
          if (isWorseOrEqual) {
            setIsRecording(false);
            return { saved: false, isNewRecord: false };
          }
          isNewRecord = true;
        }
      }
    }

    const compressed = ReplayCompressor.compressActions(actionsRef.current);
    const compressedActions = ReplayCompressor.encodeToBinary(compressed);
    const checksumData: OptimizedReplayData = {
      gameMetadata: {
        gameMode: gameStats.gameMode,
        seed: replayData?.seed || `${Date.now()}`,
        startTime: replayData?.startTime || startTimeRef.current,
        endTime: (replayData?.startTime || startTimeRef.current) + gameStats.duration,
        playerIds: [user.id],
        matchId: replayData?.matchId,
        gameId: replayData?.gameId,
      },
      playerActions: { [user.id]: compressed },
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
        compression_ratio: ReplayCompressor.calculateCompressionRatio(actionsRef.current, compressedActions),
        final_score: gameStats.score,
        final_lines: gameStats.lines,
        final_level: gameStats.level,
        pps: gameStats.pps,
        apm: gameStats.apm,
        duration_seconds: gameStats.duration / 1000,
        checksum: checksum,
        version: '2.1'
      }).select().single();

    if (error) {
      console.error('Error saving compressed replay:', error);
      setIsRecording(false);
      return { saved: false, isNewRecord: false };
    }

    setIsRecording(false);
    return { saved: true, isNewRecord };
  }, [isRecording, user, replayData]);

  const clearRecording = useCallback(() => {
    setIsRecording(false);
    setReplayData(null);
    actionsRef.current = [];
  }, []);

  return { isRecording, recordAction, startRecording, stopRecording, clearRecording, replayData };
};
