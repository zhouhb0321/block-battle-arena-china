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

    // Check for top 500 qualification for sprint40 and timeAttack2, always save 1v1/ranked
    if (isSprint40 || isTimeAttack2 || is1v1League) {
      // For 1v1/ranked, always save but may not be featured
      if (!is1v1League) {
        let query = supabase.from('compressed_replays').select('id, final_score, duration_seconds, is_featured');
        
        if (isTimeAttack2) {
          // For 2-minute mode: rank by score (higher is better)
          query = query.in('game_mode', ['timeAttack2', 'ultra2min'])
            .eq('is_featured', true)
            .order('final_score', { ascending: false })
            .limit(500);
        } else if (isSprint40) {
          // For 40-line mode: rank by time (lower is better)
          query = query.eq('game_mode', 'sprint40')
            .eq('is_featured', true)
            .order('duration_seconds', { ascending: true })
            .limit(500);
        }
        
        const { data: existing, error: fetchError } = await query;

        if (fetchError) {
          console.warn('Could not fetch leaderboard. Saving replay without checking rank.', fetchError);
        } else {
          const gameDurationInSeconds = gameStats.duration / 1000;
          
          if (existing && existing.length >= 500) {
            const worst = existing[existing.length - 1];
            const isWorseOrEqual = isTimeAttack2
              ? gameStats.score <= (worst.final_score ?? 0)
              : gameDurationInSeconds >= (worst.duration_seconds ?? Number.MAX_SAFE_INTEGER);
            
            if (isWorseOrEqual) {
              console.log(`Score not in top 500. ${isTimeAttack2 ? 'Score' : 'Time'}: ${isTimeAttack2 ? gameStats.score : gameDurationInSeconds}, Worst in top 500: ${isTimeAttack2 ? worst.final_score : worst.duration_seconds}`);
              setIsRecording(false);
              return { saved: false, isNewRecord: false };
            }
          }
          
          // Qualifies for top 500
          isNewRecord = true;
        }
      }
    }

    // Check if this is a personal best
    let isPersonalBest = false;
    try {
      const { data: userBests } = await supabase
        .from('compressed_replays')
        .select('final_score, duration_seconds')
        .eq('user_id', user.id)
        .eq('game_mode', mode);
        
      if (userBests) {
        const gameDurationInSeconds = gameStats.duration / 1000;
        isPersonalBest = isTimeAttack2 
          ? !userBests.some(best => (best.final_score ?? 0) >= gameStats.score)
          : !userBests.some(best => (best.duration_seconds ?? Number.MAX_SAFE_INTEGER) <= gameDurationInSeconds);
      } else {
        isPersonalBest = true; // First replay
      }
    } catch (e) {
      console.warn('Could not check personal best status:', e);
    }

    const compressed = ReplayCompressor.compressActions(actionsRef.current);
    const compressedActions = ReplayCompressor.encodeToBinary(compressed);
    
    // Convert Uint8Array to base64 string for proper storage
    const base64Actions = btoa(String.fromCharCode(...compressedActions));
    
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

    console.log('Replay save:', {
      actionsRecorded: actionsRef.current.length,
      compressedSize: compressed.length,
      binarySize: compressedActions.length,
      base64Length: base64Actions.length,
      placeActions: actionsRef.current.filter(a => a.action === 'place').length
    });

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
        compressed_actions: base64Actions,
        actions_count: actionsRef.current.length,
        compression_ratio: ReplayCompressor.calculateCompressionRatio(actionsRef.current, compressedActions),
        final_score: gameStats.score,
        final_lines: gameStats.lines,
        final_level: gameStats.level,
        pps: gameStats.pps,
        apm: gameStats.apm,
        duration_seconds: gameStats.duration / 1000,
        is_personal_best: isPersonalBest,
        is_world_record: false,
        is_featured: isNewRecord && !is1v1League,
        checksum: checksum,
        version: '2.1',
        username: user.username || 'Player'
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
