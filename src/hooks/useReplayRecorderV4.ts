/**
 * Replay Recorder V4 - Placement-driven with Keyframes
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { V4ReplayData, V4Event, V4LockEvent, V4KeyframeEvent } from '@/utils/replayV4/types';
import { ReplayOpcode, InputAction } from '@/utils/replayV4/types';
import { encodeV4Replay, validateV4Replay, decodeV4Replay } from '@/utils/replayV4/codec';

interface RecorderSettings {
  das: number;
  arr: number;
  sdf: number;
}

interface GameStats {
  score: number;
  lines: number;
  level: number;
  duration: number;
  pps: number;
  apm: number;
}

export function useReplayRecorderV4() {
  const [isRecording, setIsRecording] = useState(false);
  
  const eventsRef = useRef<V4Event[]>([]);
  const startTimeRef = useRef<number>(0);
  const lockCountRef = useRef<number>(0);
  const keyframeIntervalRef = useRef<number>(10);  // KF every 10 locks
  
  const metadataRef = useRef<V4ReplayData['metadata'] | null>(null);
  const lastBoardRef = useRef<number[][]>([]);
  const lastNextRef = useRef<string[]>([]);
  const lastHoldRef = useRef<string | null>(null);

  const startRecording = useCallback((
    seed: string,
    initialPieceSequence: string[],
    settings: RecorderSettings,
    userId: string,
    username: string,
    gameMode: string
  ) => {
    console.log('[RecorderV4] Starting recording', { seed, gameMode, username });
    
    eventsRef.current = [];
    startTimeRef.current = Date.now();
    lockCountRef.current = 0;
    
    metadataRef.current = {
      userId,
      username,
      gameMode,
      seed,
      initialPieceSequence: initialPieceSequence.slice(0, 14),  // First 2 bags
      recordedAt: new Date().toISOString(),
      settings: {
        das: settings.das,
        arr: settings.arr,
        sdf: settings.sdf
      }
    };
    
    setIsRecording(true);
    
    console.log('[RecorderV4] Recording started', {
      metadata: metadataRef.current,
      initialSequence: initialPieceSequence.slice(0, 14)
    });
  }, []);

  const recordSpawn = useCallback((pieceType: string, x: number, y: number) => {
    if (!isRecording) return;
    
    const timestamp = Date.now() - startTimeRef.current;
    eventsRef.current.push({
      type: ReplayOpcode.SPAWN,
      timestamp,
      pieceType,
      x,
      y
    });
    
    console.log(`[RecorderV4] SPAWN: ${pieceType} at (${x}, ${y}) @ ${timestamp}ms`);
  }, [isRecording]);

  const recordInput = useCallback((action: string, success: boolean) => {
    if (!isRecording) return;
    
    const actionMap: Record<string, InputAction> = {
      'moveLeft': InputAction.MOVE_LEFT,
      'moveRight': InputAction.MOVE_RIGHT,
      'softDrop': InputAction.SOFT_DROP,
      'hardDrop': InputAction.HARD_DROP,
      'rotateClockwise': InputAction.ROTATE_CW,
      'rotateCounterclockwise': InputAction.ROTATE_CCW,
      'rotate180': InputAction.ROTATE_180,
      'hold': InputAction.HOLD
    };
    
    const inputAction = actionMap[action];
    if (inputAction === undefined) return;
    
    const timestamp = Date.now() - startTimeRef.current;
    eventsRef.current.push({
      type: ReplayOpcode.INPUT,
      timestamp,
      action: inputAction,
      success
    });
  }, [isRecording]);

  const recordLock = useCallback((
    pieceType: string,
    x: number,
    y: number,
    rotation: number,
    linesCleared: number,
    isTSpin: boolean,
    isMini: boolean,
    currentBoard: number[][],
    nextPieces: string[],
    holdPiece: string | null,
    score: number,
    lines: number,
    level: number
  ) => {
    if (!isRecording) return;
    
    const timestamp = Date.now() - startTimeRef.current;
    lockCountRef.current++;
    
    // Record LOCK event
    const lockEvent: V4LockEvent = {
      type: ReplayOpcode.LOCK,
      timestamp,
      pieceType,
      x,
      y,
      rotation,
      linesCleared,
      isTSpin,
      isMini
    };
    eventsRef.current.push(lockEvent);
    
    console.log(`[RecorderV4] LOCK #${lockCountRef.current}: ${pieceType} at (${x},${y}) R${rotation}, cleared=${linesCleared}, T-spin=${isTSpin} @ ${timestamp}ms`);
    
    // Store current game state
    lastBoardRef.current = currentBoard;
    lastNextRef.current = nextPieces;
    lastHoldRef.current = holdPiece;
    
    // Record keyframe: at first lock, then every N locks
    if (lockCountRef.current === 1 || lockCountRef.current % keyframeIntervalRef.current === 0) {
      const kfEvent: V4KeyframeEvent = {
        type: ReplayOpcode.KF,
        timestamp,
        board: JSON.parse(JSON.stringify(currentBoard)),  // Deep copy
        nextPieces: [...nextPieces],
        holdPiece,
        score,
        lines,
        level
      };
      eventsRef.current.push(kfEvent);
      
      console.log(`[RecorderV4] KEYFRAME at lock #${lockCountRef.current}: score=${score}, lines=${lines}, level=${level}`);
    }
  }, [isRecording]);

  const stopRecording = useCallback(async (
    gameStats: GameStats,
    gameMode: string,
    endReason: 'complete' | 'gameover' | 'quit' = 'complete'
  ): Promise<{ saved: boolean; replayId?: string; isNewRecord?: boolean }> => {
    if (!isRecording) {
      console.warn('[RecorderV4] Not recording');
      return { saved: false };
    }
    
    console.log('[RecorderV4] Stopping recording', { 
      lockCount: lockCountRef.current, 
      eventCount: eventsRef.current.length,
      endReason 
    });
    
    setIsRecording(false);
    
    // Verify user authentication before saving
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('[RecorderV4] ❌ User not authenticated:', authError);
      toast.error('无法保存录像', {
        description: '用户未登录或会话已过期'
      });
      return { saved: false };
    }
    
    console.log('[RecorderV4] User authenticated:', {
      userId: currentUser.id,
      email: currentUser.email
    });
    
    // Add END event
    const timestamp = Date.now() - startTimeRef.current;
    eventsRef.current.push({
      type: ReplayOpcode.END,
      timestamp,
      reason: endReason
    });
    
    // Add final keyframe if we have game state
    if (lastBoardRef.current.length > 0 && lockCountRef.current > 0) {
      const finalKF: V4KeyframeEvent = {
        type: ReplayOpcode.KF,
        timestamp,
        board: lastBoardRef.current,
        nextPieces: lastNextRef.current,
        holdPiece: lastHoldRef.current,
        score: gameStats.score,
        lines: gameStats.lines,
        level: gameStats.level
      };
      eventsRef.current.push(finalKF);
      console.log('[RecorderV4] Added final keyframe');
    }
    
    // Build replay data
    if (!metadataRef.current) {
      console.error('[RecorderV4] No metadata - recording was not properly started');
      return { saved: false };
    }
    
    const replayData: V4ReplayData = {
      version: '4.0',
      metadata: metadataRef.current,
      events: eventsRef.current,
      stats: {
        finalScore: gameStats.score,
        finalLines: gameStats.lines,
        finalLevel: gameStats.level,
        duration: gameStats.duration,
        pps: gameStats.pps,
        apm: gameStats.apm,
        lockCount: lockCountRef.current,
        keyframeCount: eventsRef.current.filter(e => e.type === ReplayOpcode.KF).length
      },
      checksum: ''  // Will be filled by codec
    };
    
    // Validate
    const validation = validateV4Replay(replayData);
    
    console.log('[RecorderV4] Validation result:', validation);
    
    if (!validation.valid) {
      console.error('[RecorderV4] ❌ Validation failed:', validation.errors);
      console.error('[RecorderV4] Event stats:', validation.stats);
      toast.error('录像验证失败', {
        description: validation.errors.join(', ')
      });
      return { saved: false };
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[RecorderV4] ⚠️ Validation warnings:', validation.warnings);
    }
    
    // Encode to binary
    try {
      const binaryData = await encodeV4Replay(replayData);
      console.log('[RecorderV4] Encoded to binary:', {
        size: binaryData.length,
        sizeKB: (binaryData.length / 1024).toFixed(2)
      });
      
      // Extract checksum from binary (last 16 bytes as text) BEFORE Base64 encoding
      const checksumBytes = binaryData.slice(-16);
      const extractedChecksum = new TextDecoder().decode(checksumBytes);
      console.log('[RecorderV4] Extracted checksum from binary:', extractedChecksum);

      // Round-trip decode to validate integrity BEFORE saving
      let decodedRoundTrip = null as any;
      try {
        decodedRoundTrip = await decodeV4Replay(binaryData);
      } catch (rtErr) {
        console.error('[RecorderV4] Round-trip decode failed:', rtErr);
      }

      if (!decodedRoundTrip) {
        toast.error('录像自检失败', { description: '无法解码刚编码的数据，已取消保存' });
        return { saved: false };
      }

      const decodedEventCount = decodedRoundTrip.events.length;
      const decodedLockCount = decodedRoundTrip.events.filter((e: any) => e.type === ReplayOpcode.LOCK).length;
      const decodedChecksum = decodedRoundTrip.checksum;

      if (
        decodedEventCount !== eventsRef.current.length ||
        decodedLockCount !== lockCountRef.current ||
        decodedChecksum !== extractedChecksum
      ) {
        console.warn('[RecorderV4] ⚠️ Round-trip mismatch detected', {
          encodedEvents: eventsRef.current.length,
          decodedEvents: decodedEventCount,
          encodedLocks: lockCountRef.current,
          decodedLocks: decodedLockCount,
          extractedChecksum,
          decodedChecksum
        });
        toast.error('录像编码自检失败', { description: '数据不一致，保存已取消。请重试或重新开始录制。' });
        return { saved: false };
      }

      // Convert binary to Base64 for reliable storage
      const base64String = btoa(String.fromCharCode(...binaryData));
      console.log('[RecorderV4] Base64 encoded, length:', base64String.length, 'starts with:', base64String.substring(0, 20));
      
      // Save to database using authenticated user ID
      const { data, error } = await supabase
        .from('compressed_replays')
        .insert({
          user_id: currentUser.id,  // Use confirmed authenticated user ID
          game_mode: gameMode,
          version: '4.0',
          compressed_actions: base64String,
          actions_count: eventsRef.current.length,
          place_actions_count: lockCountRef.current,
          final_score: gameStats.score,
          final_lines: gameStats.lines,
          final_level: gameStats.level,
          pps: gameStats.pps,
          apm: gameStats.apm,
          duration_seconds: Math.floor(gameStats.duration / 1000),
          seed: metadataRef.current.seed,
          game_settings: metadataRef.current.settings,
          checksum: extractedChecksum,
          is_playable: true,
          username: currentUser.email?.split('@')[0] || metadataRef.current.username
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('[RecorderV4] Database save error:', error, {
          attemptedUserId: currentUser.id,
          authUserId: currentUser.id
        });
        toast.error('录像保存失败', { description: error.message });
        return { saved: false };
      }
      
      console.log('[RecorderV4] ✅ Replay saved successfully:', {
        id: data.id,
        lockCount: lockCountRef.current,
        eventCount: eventsRef.current.length,
        size: binaryData.length
      });
      
      toast.success('录像已保存', {
        description: `${lockCountRef.current} 个方块锁定, ${(binaryData.length / 1024).toFixed(1)} KB`
      });
      
      return {
        saved: true,
        replayId: data.id
      };
      
    } catch (err) {
      console.error('[RecorderV4] Encoding/save error:', err);
      toast.error('录像编码失败');
      return { saved: false };
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    eventsRef.current = [];
    lockCountRef.current = 0;
    metadataRef.current = null;
    lastBoardRef.current = [];
    lastNextRef.current = [];
    lastHoldRef.current = null;
    setIsRecording(false);
    console.log('[RecorderV4] Recording cleared');
  }, []);

  return {
    isRecording,
    startRecording,
    recordSpawn,
    recordInput,
    recordLock,
    stopRecording,
    clearRecording,
    getLockCount: () => lockCountRef.current,
    getEventCount: () => eventsRef.current.length
  };
}
