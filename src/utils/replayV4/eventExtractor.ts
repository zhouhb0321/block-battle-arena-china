/**
 * 回放事件提取和分析工具
 * 用于提取关键事件和统计信息
 */

import { V4ReplayData, V4LockEvent, ReplayOpcode } from './types';

export interface KeyMoment {
  timestamp: number;
  type: 'tetris' | 'tspin' | 'combo' | 'milestone';
  label: string;
  data?: any;
}

/**
 * 从回放中提取关键时刻
 */
export function extractKeyMoments(replay: V4ReplayData): KeyMoment[] {
  const moments: KeyMoment[] = [];
  const lockEvents = replay.events.filter((e): e is V4LockEvent => e.type === ReplayOpcode.LOCK);
  
  let consecutiveClears = 0;
  let totalLines = 0;
  
  lockEvents.forEach((lock, index) => {
    const clearedLines = lock.linesCleared || 0;
    
    // Tetris（4行消除）
    if (clearedLines === 4) {
      moments.push({
        timestamp: lock.timestamp,
        type: 'tetris',
        label: 'Tetris!',
        data: { lockIndex: index }
      });
    }
    
    // T-Spin检测（简化版本，基于piece type和cleared lines）
    if (lock.pieceType === 'T' && clearedLines > 0) {
      moments.push({
        timestamp: lock.timestamp,
        type: 'tspin',
        label: `T-Spin ${clearedLines}`,
        data: { lockIndex: index, lines: clearedLines }
      });
    }
    
    // Combo检测
    if (clearedLines > 0) {
      consecutiveClears++;
      if (consecutiveClears >= 3) {
        moments.push({
          timestamp: lock.timestamp,
          type: 'combo',
          label: `Combo x${consecutiveClears}`,
          data: { lockIndex: index, combo: consecutiveClears }
        });
      }
    } else {
      consecutiveClears = 0;
    }
    
    // 行数里程碑（每50行）
    totalLines += clearedLines;
    if (totalLines % 50 === 0 && totalLines > 0 && clearedLines > 0) {
      moments.push({
        timestamp: lock.timestamp,
        type: 'milestone',
        label: `${totalLines} Lines`,
        data: { lockIndex: index, totalLines }
      });
    }
  });
  
  return moments;
}

/**
 * 计算回放统计信息
 */
export function calculateReplayStats(replay: V4ReplayData) {
  const lockEvents = replay.events.filter((e): e is V4LockEvent => e.type === ReplayOpcode.LOCK);
  
  let totalLines = 0;
  let tetrisCount = 0;
  let tspinCount = 0;
  let maxCombo = 0;
  let currentCombo = 0;
  
  lockEvents.forEach(lock => {
    const clearedLines = lock.linesCleared || 0;
    totalLines += clearedLines;
    
    if (clearedLines === 4) tetrisCount++;
    if (lock.pieceType === 'T' && clearedLines > 0) tspinCount++;
    
    if (clearedLines > 0) {
      currentCombo++;
      maxCombo = Math.max(maxCombo, currentCombo);
    } else {
      currentCombo = 0;
    }
  });
  
  const pps = lockEvents.length / (replay.stats.duration / 1000);
  
  return {
    totalLocks: lockEvents.length,
    totalLines,
    tetrisCount,
    tspinCount,
    maxCombo,
    pps: pps.toFixed(2)
  };
}
