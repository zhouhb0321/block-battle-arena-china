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

// KEYFRAME generation strategy configuration
const KEYFRAME_CONFIG = {
  lockInterval: 10,      // Generate KEYFRAME every 10 locks
  timeInterval: 30000,   // Generate KEYFRAME every 30 seconds (ms)
  strategy: 'hybrid' as 'lock' | 'time' | 'hybrid'  // Use hybrid mode
};

export function useReplayRecorderV4() {
  const [isRecording, setIsRecording] = useState(false);
  
  const eventsRef = useRef<V4Event[]>([]);
  const startTimeRef = useRef<number>(0);
  const lockCountRef = useRef<number>(0);
  const keyframeIntervalRef = useRef<number>(10);  // KF every 10 locks
  const lastKeyframeTimeRef = useRef<number>(0);   // Track last KEYFRAME timestamp
  
  const metadataRef = useRef<V4ReplayData['metadata'] | null>(null);
  const lastBoardRef = useRef<number[][]>([]);
  const lastNextRef = useRef<string[]>([]);
  const lastHoldRef = useRef<string | null>(null);
  const fullPieceSequenceRef = useRef<string[]>([]); // ✅ Track all spawned pieces

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
    lastKeyframeTimeRef.current = 0;  // Reset KEYFRAME time tracking
    
    // ✅ 过滤并验证方块类型
    const validTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const sanitizedSequence = initialPieceSequence
      .map(p => {
        if (typeof p === 'string') {
          const cleaned = p.trim().charAt(0).toUpperCase();
          return validTypes.includes(cleaned) ? cleaned : null;
        } else if (p && typeof p === 'object') {
          // 如果是对象，尝试提取 type 或 name
          const type = (p as any).type || (p as any).name;
          if (typeof type === 'string') {
            const cleaned = type.charAt(0).toUpperCase();
            return validTypes.includes(cleaned) ? cleaned : null;
          }
        }
        console.warn('[RecorderV4] ⚠️ Invalid piece type detected:', p);
        return null;
      })
      .filter(Boolean) as string[];
    
    // ✅ Initialize with sanitized piece sequence (at least 100 pieces)
    fullPieceSequenceRef.current = sanitizedSequence.slice(0, 100);
    
    if (sanitizedSequence.length < 50) {
      console.warn('[RecorderV4] ⚠️ Initial sequence too short:', sanitizedSequence.length);
    }
    
    console.log('[RecorderV4] ✅ Piece sequence sanitized:', {
      originalLength: initialPieceSequence.length,
      sanitizedLength: sanitizedSequence.length,
      invalidCount: initialPieceSequence.length - sanitizedSequence.length,
      first20: sanitizedSequence.slice(0, 20).join('')
    });
    
    metadataRef.current = {
      userId,
      username,
      gameMode,
      seed,
      initialPieceSequence: sanitizedSequence.slice(0, 100),  // ✅ Store sanitized sequence
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
      initialSequence: initialPieceSequence.slice(0, 14),
      keyframeStrategy: KEYFRAME_CONFIG
    });
  }, []);

  const sanitizePieceType = (pieceType: string): string | null => {
    const validTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const cleaned = (pieceType || '').charAt(0).toUpperCase();
    if (!validTypes.includes(cleaned)) {
      console.error('[RecorderV4] Invalid pieceType:', pieceType, 'cleaned:', cleaned);
      return null;
    }
    return cleaned;
  };

  const recordSpawn = useCallback((pieceType: string, x: number, y: number) => {
    if (!isRecording) return;
    
    const sanitized = sanitizePieceType(pieceType);
    if (!sanitized) return;
    
    // ✅ Track all spawned pieces for complete sequence
    fullPieceSequenceRef.current.push(sanitized);
    
    const timestamp = Date.now() - startTimeRef.current;
    eventsRef.current.push({
      type: ReplayOpcode.SPAWN,
      timestamp,
      pieceType: sanitized,
      x,
      y
    });
    
    console.log(`[RecorderV4] 📝 SPAWN: ${sanitized} at (${x}, ${y}) @ ${timestamp}ms, total pieces: ${fullPieceSequenceRef.current.length}`);
    
    // Log sequence every 10 pieces for verification
    if (fullPieceSequenceRef.current.length % 10 === 0) {
      const recentSequence = fullPieceSequenceRef.current.slice(-10).join('');
      console.log(`[RecorderV4] 📊 Last 10 pieces recorded: ${recentSequence}`);
    }
  }, [isRecording]);

  const recordInput = useCallback((
    action: string, 
    success: boolean,
    position?: { x: number; y: number },
    rotation?: number
  ) => {
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
      success,
      position, // ✅ P1 新增：记录位置
      rotation  // ✅ P1 新增：记录旋转
    });
  }, [isRecording]);

  // ✅ 方案B：帧级位置采样 - 每帧记录方块位置
  const lastFrameTimeRef = useRef<number>(0);
  const FRAME_INTERVAL = 16; // ~60fps, 每16ms采样一次

  const recordFrame = useCallback((
    pieceType: string,
    x: number,
    y: number,
    rotation: number
  ) => {
    if (!isRecording) return;
    
    const timestamp = Date.now() - startTimeRef.current;
    
    // 节流：至少间隔 FRAME_INTERVAL 毫秒才记录一帧
    if (timestamp - lastFrameTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    
    const sanitized = sanitizePieceType(pieceType);
    if (!sanitized) return;
    
    lastFrameTimeRef.current = timestamp;
    
    eventsRef.current.push({
      type: ReplayOpcode.FRAME,
      timestamp,
      x,
      y,
      rotation,
      pieceType: sanitized
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
    
    const sanitized = sanitizePieceType(pieceType);
    if (!sanitized) return;
    
    const sanitizedNext = nextPieces.map(p => sanitizePieceType(p)).filter(Boolean) as string[];
    const sanitizedHold = holdPiece ? sanitizePieceType(holdPiece) : null;
    
    const timestamp = Date.now() - startTimeRef.current;
    lockCountRef.current++;
    
    // Record LOCK event
    const lockEvent: V4LockEvent = {
      type: ReplayOpcode.LOCK,
      timestamp,
      pieceType: sanitized,
      x,
      y,
      rotation,
      linesCleared,
      isTSpin,
      isMini
    };
    eventsRef.current.push(lockEvent);
    
    console.log(`[RecorderV4] LOCK #${lockCountRef.current}: ${sanitized} at (${x},${y}) R${rotation}, cleared=${linesCleared}, T-spin=${isTSpin} @ ${timestamp}ms`);
    
    // Store current game state
    lastBoardRef.current = currentBoard;
    lastNextRef.current = sanitizedNext;
    lastHoldRef.current = sanitizedHold;
    
    // Hybrid KEYFRAME generation logic
    const timeSinceLastKF = timestamp - lastKeyframeTimeRef.current;
    const lockCondition = 
      lockCountRef.current === 1 || 
      lockCountRef.current % KEYFRAME_CONFIG.lockInterval === 0;
    const timeCondition = timeSinceLastKF >= KEYFRAME_CONFIG.timeInterval;
    
    let shouldGenerateKF = false;
    let kfReason = '';
    
    switch (KEYFRAME_CONFIG.strategy) {
      case 'lock':
        shouldGenerateKF = lockCondition;
        kfReason = 'lock-count';
        break;
      case 'time':
        shouldGenerateKF = timeCondition;
        kfReason = 'time-interval';
        break;
      case 'hybrid':
        shouldGenerateKF = lockCondition || timeCondition;
        kfReason = lockCondition ? 'lock-count' : 'time-interval';
        break;
    }
    
    if (shouldGenerateKF) {
      const kfEvent: V4KeyframeEvent = {
        type: ReplayOpcode.KF,
        timestamp,
        board: JSON.parse(JSON.stringify(currentBoard)),  // Deep copy
        nextPieces: sanitizedNext,
        holdPiece: sanitizedHold,
        score,
        lines,
        level
      };
      eventsRef.current.push(kfEvent);
      lastKeyframeTimeRef.current = timestamp;
      
      console.log(`[RecorderV4] KEYFRAME generated:`, {
        reason: kfReason,
        lockCount: lockCountRef.current,
        timeSinceLastKF: (timeSinceLastKF / 1000).toFixed(1) + 's',
        score,
        lines,
        level
      });
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
    
    // Add final keyframe if we have game state and significant time has passed
    const timeSinceLastKF = timestamp - lastKeyframeTimeRef.current;
    if (lastBoardRef.current.length > 0 && 
        (lockCountRef.current > 0 || timeSinceLastKF > 5000)) {  // If more than 5s since last KF
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
      console.log('[RecorderV4] Added final keyframe', {
        timeSinceLastKF: (timeSinceLastKF / 1000).toFixed(1) + 's'
      });
    }
    
    // Build replay data
    if (!metadataRef.current) {
      console.error('[RecorderV4] No metadata - recording was not properly started');
      return { saved: false };
    }
    
    const replayData: V4ReplayData = {
      version: '4.0',
      metadata: {
        ...metadataRef.current,
        initialPieceSequence: fullPieceSequenceRef.current // ✅ Save complete piece sequence
      },
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
    
    // Position data coverage statistics
    const inputsWithPosition = replayData.events.filter(
      e => e.type === ReplayOpcode.INPUT && e.position
    ).length;
    const totalInputs = replayData.events.filter(
      e => e.type === ReplayOpcode.INPUT
    ).length;
    const positionCoverage = totalInputs > 0 ? (inputsWithPosition / totalInputs * 100) : 0;
    
    console.log('[RecorderV4] Validation result:', validation);
    console.log('[RecorderV4] Position data coverage:', {
      inputsWithPosition,
      totalInputs,
      coverage: `${positionCoverage.toFixed(1)}%`
    });
    
    // ✅ P1：详细事件统计
    const eventStats = {
      SPAWN: replayData.events.filter(e => e.type === ReplayOpcode.SPAWN).length,
      INPUT: totalInputs,
      INPUT_with_position: inputsWithPosition,
      LOCK: replayData.events.filter(e => e.type === ReplayOpcode.LOCK).length,
      KF: replayData.events.filter(e => e.type === ReplayOpcode.KF).length,
      END: replayData.events.filter(e => e.type === ReplayOpcode.END).length,
      totalEvents: replayData.events.length
    };
    
    console.log('[RecorderV4] ✅ Event breakdown:', eventStats);
    console.log('[RecorderV4] Expected: SPAWN ≈ LOCK (each piece spawns once and locks once)');
    console.log('[RecorderV4] Actual: SPAWN =', eventStats.SPAWN, ', LOCK =', eventStats.LOCK);
    
    if (Math.abs(eventStats.SPAWN - eventStats.LOCK) > 1) {
      console.warn('[RecorderV4] ⚠️ SPAWN/LOCK count mismatch - possible recording issue!');
    }
    
    if (positionCoverage < 90) {
      console.warn('[RecorderV4] ⚠️ Low position coverage, animations may be choppy');
    }
    
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

      // 计算解码成功率和事件丢失率
      const eventLoss = eventsRef.current.length - decodedEventCount;
      const eventLossRate = eventLoss / eventsRef.current.length;
      
      // 关键数据必须匹配
      const lockMismatch = decodedLockCount !== lockCountRef.current;
      const checksumMismatch = decodedChecksum !== extractedChecksum;

      console.log('[RecorderV4] Round-trip validation:', {
        encodedEvents: eventsRef.current.length,
        decodedEvents: decodedEventCount,
        eventLoss,
        eventLossRate: `${(eventLossRate * 100).toFixed(1)}%`,
        encodedLocks: lockCountRef.current,
        decodedLocks: decodedLockCount,
        lockMismatch,
        checksumMismatch,
        extractedChecksum,
        decodedChecksum
      });

      // 致命错误：关键数据不匹配
      if (lockMismatch || checksumMismatch) {
        console.error('[RecorderV4] ❌ Critical data mismatch', {
          lockMismatch,
          checksumMismatch
        });
        toast.error('录像编码自检失败', { 
          description: '关键数据损坏，保存已取消' 
        });
        return { saved: false };
      }

      // 警告：事件丢失率超过 5%
      if (eventLossRate > 0.05) {
        console.warn('[RecorderV4] ⚠️ High event loss rate', {
          eventLoss,
          eventLossRate: `${(eventLossRate * 100).toFixed(1)}%`
        });
        toast.warning('录像质量警告', {
          description: `${eventLoss} 个非关键事件丢失，但录像仍可播放`
        });
      } else if (eventLoss > 0) {
        console.log('[RecorderV4] ℹ️ Minor event loss acceptable:', {
          eventLoss,
          eventLossRate: `${(eventLossRate * 100).toFixed(1)}%`
        });
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
    lastKeyframeTimeRef.current = 0;
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
    recordFrame,  // ✅ 方案B：帧级位置采样
    recordLock,
    stopRecording,
    clearRecording,
    getLockCount: () => lockCountRef.current,
    getEventCount: () => eventsRef.current.length
  };
}
