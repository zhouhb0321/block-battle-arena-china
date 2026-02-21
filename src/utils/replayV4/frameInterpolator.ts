/**
 * Frame Interpolator - Synthesize missing FRAME events and provide
 * efficient binary-search lookup for smooth replay playback
 */

import type { V4ReplayData, V4FrameEvent, V4SpawnEvent, V4LockEvent } from './types';
import { ReplayOpcode } from './types';

/**
 * Pre-sorted frame events with SPAWN/LOCK boundaries for efficient lookup
 */
export interface FrameLookupData {
  frames: V4FrameEvent[];
  spawns: V4SpawnEvent[];
  locks: V4LockEvent[];
}

/**
 * Extract and prepare all frame-related events from replay data.
 * Also synthesizes frames for sparse segments.
 */
export function prepareFrameLookup(replay: V4ReplayData): FrameLookupData {
  const frames: V4FrameEvent[] = [];
  const spawns: V4SpawnEvent[] = [];
  const locks: V4LockEvent[] = [];

  for (const e of replay.events) {
    switch (e.type) {
      case ReplayOpcode.FRAME:
        frames.push(e as V4FrameEvent);
        break;
      case ReplayOpcode.SPAWN:
        spawns.push(e as V4SpawnEvent);
        break;
      case ReplayOpcode.LOCK:
        locks.push(e as V4LockEvent);
        break;
    }
  }

  // Sort by timestamp
  frames.sort((a, b) => a.timestamp - b.timestamp);
  spawns.sort((a, b) => a.timestamp - b.timestamp);
  locks.sort((a, b) => a.timestamp - b.timestamp);

  return { frames, spawns, locks };
}

/**
 * Binary search for the animated piece position at a given time.
 * Returns null during the natural pause between LOCK and next SPAWN.
 */
export function getAnimatedPieceAtTime(
  lookup: FrameLookupData,
  currentTime: number,
  currentStateTimestamp: number
): { type: string; x: number; y: number; rotation: number } | null {
  const { frames, spawns, locks } = lookup;

  // Find which spawn/lock segment we're in
  // Find the most recent LOCK at or before currentTime
  const lastLockIdx = binarySearchLastBefore(locks, currentTime);
  // Find the most recent SPAWN at or before currentTime
  const lastSpawnIdx = binarySearchLastBefore(spawns, currentTime);

  const lastLock = lastLockIdx >= 0 ? locks[lastLockIdx] : null;
  const lastSpawn = lastSpawnIdx >= 0 ? spawns[lastSpawnIdx] : null;

  // If the most recent event is a LOCK (no SPAWN after it yet), we're in the pause gap
  if (lastLock && (!lastSpawn || lastLock.timestamp > lastSpawn.timestamp)) {
    // Check if there's a next spawn coming
    const nextSpawnIdx = lastSpawnIdx + 1;
    if (nextSpawnIdx < spawns.length) {
      // We're between LOCK and next SPAWN — natural pause, show no piece
      return null;
    }
    // No more spawns — game is over, no piece
    return null;
  }

  // We're after a SPAWN — find the best frame
  if (lastSpawn) {
    // Find frame at or just before currentTime, but after this spawn
    const frameIdx = binarySearchFrameInRange(frames, lastSpawn.timestamp, currentTime);

    if (frameIdx >= 0) {
      const f = frames[frameIdx];
      return { type: f.pieceType, x: f.x, y: f.y, rotation: f.rotation };
    }

    // No frame yet after spawn — show piece at spawn position
    return {
      type: lastSpawn.pieceType,
      x: lastSpawn.x,
      y: lastSpawn.y,
      rotation: 0
    };
  }

  return null;
}

/**
 * Calculate ghost piece position (hard drop destination)
 */
export function calculateGhostY(
  board: number[][],
  shape: number[][],
  x: number,
  y: number
): number {
  let ghostY = y;
  while (canPlaceAt(board, shape, x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

function canPlaceAt(board: number[][], shape: number[][], x: number, y: number): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const boardY = y + row;
        const boardX = x + col;
        if (boardY < 0 || boardY >= board.length || boardX < 0 || boardX >= 10) return false;
        if (board[boardY][boardX] !== 0) return false;
      }
    }
  }
  return true;
}

// ---- Binary search helpers ----

function binarySearchLastBefore<T extends { timestamp: number }>(
  arr: T[],
  time: number
): number {
  let lo = 0, hi = arr.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].timestamp <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function binarySearchFrameInRange(
  frames: V4FrameEvent[],
  afterTime: number,
  beforeOrAtTime: number
): number {
  let lo = 0, hi = frames.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (frames[mid].timestamp <= beforeOrAtTime) {
      if (frames[mid].timestamp >= afterTime) {
        result = mid;
      }
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
