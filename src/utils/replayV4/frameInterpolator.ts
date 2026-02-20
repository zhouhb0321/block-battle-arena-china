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

  // Synthesize frames for segments with sparse data
  const synthesized = synthesizeAllMissingFrames(spawns, locks, frames);
  if (synthesized.length > 0) {
    frames.push(...synthesized);
    frames.sort((a, b) => a.timestamp - b.timestamp);
  }

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

// ---- Synthesis ----

function synthesizeAllMissingFrames(
  spawns: V4SpawnEvent[],
  locks: V4LockEvent[],
  existingFrames: V4FrameEvent[]
): V4FrameEvent[] {
  const synthetic: V4FrameEvent[] = [];

  for (let i = 0; i < spawns.length; i++) {
    const spawn = spawns[i];
    // Find corresponding lock (first lock after this spawn)
    const lock = locks.find(l => l.timestamp > spawn.timestamp);
    if (!lock) continue;

    // Count existing frames in this segment
    const segFrames = existingFrames.filter(
      f => f.timestamp >= spawn.timestamp && f.timestamp <= lock.timestamp
    );

    // Only synthesize if fewer than 3 real frames
    if (segFrames.length < 3) {
      synthetic.push(...synthesizeFramesBetween(spawn, lock));
    }
  }

  return synthetic;
}

/**
 * Generate synthetic FRAME events between a spawn and lock.
 * Simulates: thinking pause → horizontal movement → vertical drop
 */
function synthesizeFramesBetween(
  spawn: V4SpawnEvent,
  lock: V4LockEvent
): V4FrameEvent[] {
  const frames: V4FrameEvent[] = [];
  const duration = lock.timestamp - spawn.timestamp;

  if (duration < 50) return frames; // Too short to synthesize

  // Thinking pause: ~20% of duration (min 50ms, max 200ms)
  const thinkTime = Math.min(200, Math.max(50, duration * 0.2));

  // Calculate movement phases
  const moveStartTime = spawn.timestamp + thinkTime;
  const moveEndTime = lock.timestamp - 16; // Leave 1 frame before lock
  const moveDuration = moveEndTime - moveStartTime;

  if (moveDuration < 32) {
    // Very fast placement — just show at spawn then lock
    frames.push({
      type: ReplayOpcode.FRAME,
      timestamp: spawn.timestamp,
      x: spawn.x,
      y: spawn.y,
      rotation: 0,
      pieceType: spawn.pieceType
    });
    return frames;
  }

  const dx = lock.x - spawn.x;
  const dy = lock.y - spawn.y;
  const dr = lock.rotation; // rotation from 0

  // Phase 1: Show at spawn position during think time
  frames.push({
    type: ReplayOpcode.FRAME,
    timestamp: spawn.timestamp,
    x: spawn.x,
    y: spawn.y,
    rotation: 0,
    pieceType: spawn.pieceType
  });

  // Phase 2: Horizontal movement + rotation (first 40% of move time)
  const hMoveEnd = moveStartTime + moveDuration * 0.4;
  const hSteps = Math.max(1, Math.floor((hMoveEnd - moveStartTime) / 33)); // ~30fps

  for (let s = 0; s <= hSteps; s++) {
    const t = s / hSteps;
    const time = moveStartTime + (hMoveEnd - moveStartTime) * t;
    frames.push({
      type: ReplayOpcode.FRAME,
      timestamp: Math.round(time),
      x: Math.round(spawn.x + dx * t),
      y: spawn.y + Math.round(dy * t * 0.1), // slight downward during horizontal
      rotation: t >= 0.5 ? dr : 0,
      pieceType: spawn.pieceType
    });
  }

  // Phase 3: Vertical drop (remaining 60%)
  const vSteps = Math.max(1, Math.floor((moveEndTime - hMoveEnd) / 33));
  for (let s = 1; s <= vSteps; s++) {
    const t = s / vSteps;
    const time = hMoveEnd + (moveEndTime - hMoveEnd) * t;
    frames.push({
      type: ReplayOpcode.FRAME,
      timestamp: Math.round(time),
      x: lock.x,
      y: Math.round(spawn.y + dy * (0.1 + 0.9 * t)),
      rotation: dr,
      pieceType: spawn.pieceType
    });
  }

  return frames;
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
  // Find the last frame with timestamp <= beforeOrAtTime and >= afterTime
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
