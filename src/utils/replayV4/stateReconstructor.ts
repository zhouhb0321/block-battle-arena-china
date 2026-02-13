/**
 * State Reconstructor - Pre-compute game state timeline from V4 replay data
 * This replaces the broken INPUT-driven replay with direct state snapshots
 */

import type { V4ReplayData, V4GameState, V4LockEvent, V4KeyframeEvent, V4SpawnEvent, V4FrameEvent } from './types';
import { ReplayOpcode } from './types';
import { getPieceShape } from '@/utils/tetrominoShapes';
import { PIECE_TYPE_TO_ID } from '@/utils/tetrominoShapes';

interface FrameState {
  timestamp: number;
  pieceType: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Build a complete timeline of game states from replay data.
 * Returns an array of V4GameState sorted by timestamp.
 */
export function buildStateTimeline(replay: V4ReplayData): V4GameState[] {
  const states: V4GameState[] = [];
  const events = replay.events;
  
  // Collect events by type
  const lockEvents: V4LockEvent[] = [];
  const keyframes: V4KeyframeEvent[] = [];
  const spawnEvents: V4SpawnEvent[] = [];
  const frameEvents: FrameState[] = [];
  
  for (const e of events) {
    switch (e.type) {
      case ReplayOpcode.LOCK:
        lockEvents.push(e as V4LockEvent);
        break;
      case ReplayOpcode.KF:
        keyframes.push(e as V4KeyframeEvent);
        break;
      case ReplayOpcode.SPAWN:
        spawnEvents.push(e as V4SpawnEvent);
        break;
      case ReplayOpcode.FRAME:
        frameEvents.push(e as FrameState);
        break;
    }
  }
  
  console.log('[StateReconstructor] Building timeline:', {
    locks: lockEvents.length,
    keyframes: keyframes.length,
    spawns: spawnEvents.length,
    frames: frameEvents.length
  });
  
  // Strategy: Use boardAfterLock if available (new recordings), else fall back to keyframes
  const hasBoardAfterLock = lockEvents.some(l => l.boardAfterLock);
  
  if (hasBoardAfterLock) {
    return buildFromBoardAfterLock(lockEvents, spawnEvents, frameEvents, replay);
  } else {
    return buildFromKeyframesAndLocks(lockEvents, keyframes, spawnEvents, frameEvents, replay);
  }
}

/**
 * New recordings: each LOCK has boardAfterLock - 100% fidelity
 */
function buildFromBoardAfterLock(
  lockEvents: V4LockEvent[],
  spawnEvents: V4SpawnEvent[],
  frameEvents: FrameState[],
  replay: V4ReplayData
): V4GameState[] {
  const states: V4GameState[] = [];
  
  // Initial state (empty board)
  let currentBoard = createEmptyBoard();
  let nextPieces = replay.metadata.initialPieceSequence?.slice(0, 5) || [];
  let holdPiece: string | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  
  // Add initial state
  states.push({
    timestamp: 0,
    board: cloneBoard(currentBoard),
    currentPiece: spawnEvents.length > 0 ? {
      type: spawnEvents[0].pieceType,
      x: spawnEvents[0].x,
      y: spawnEvents[0].y,
      rotation: 0
    } : null,
    nextPieces: [...nextPieces],
    holdPiece,
    score,
    lines,
    level
  });
  
  // Build state for each lock
  for (let i = 0; i < lockEvents.length; i++) {
    const lock = lockEvents[i];
    
    if (lock.boardAfterLock) {
      currentBoard = lock.boardAfterLock;
    }
    
    // Update stats from lock event
    score = lock.score ?? score;
    lines = lock.lines ?? lines;
    level = lock.level ?? level;
    nextPieces = lock.nextPieces ?? nextPieces;
    holdPiece = lock.holdPiece !== undefined ? lock.holdPiece : holdPiece;
    
    // Find the next spawn after this lock
    const nextSpawn = spawnEvents.find(s => s.timestamp > lock.timestamp);
    
    states.push({
      timestamp: lock.timestamp,
      board: cloneBoard(currentBoard),
      currentPiece: nextSpawn ? {
        type: nextSpawn.pieceType,
        x: nextSpawn.x,
        y: nextSpawn.y,
        rotation: 0
      } : null,
      nextPieces: [...nextPieces],
      holdPiece,
      score,
      lines,
      level
    });
  }
  
  console.log('[StateReconstructor] Built', states.length, 'states from boardAfterLock');
  return states;
}

/**
 * Old recordings: reconstruct from keyframes + piece placement
 */
function buildFromKeyframesAndLocks(
  lockEvents: V4LockEvent[],
  keyframes: V4KeyframeEvent[],
  spawnEvents: V4SpawnEvent[],
  frameEvents: FrameState[],
  replay: V4ReplayData
): V4GameState[] {
  const states: V4GameState[] = [];
  
  // Sort keyframes by timestamp
  const sortedKFs = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  
  // Initial state
  let currentBoard = createEmptyBoard();
  let nextPieces = replay.metadata.initialPieceSequence?.slice(0, 5) || [];
  let holdPiece: string | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  
  // Add initial state
  states.push({
    timestamp: 0,
    board: cloneBoard(currentBoard),
    currentPiece: spawnEvents.length > 0 ? {
      type: spawnEvents[0].pieceType,
      x: spawnEvents[0].x,
      y: spawnEvents[0].y,
      rotation: 0
    } : null,
    nextPieces: [...nextPieces],
    holdPiece,
    score,
    lines,
    level
  });
  
  // Process each lock, using keyframes for board correction
  let lastKFIndex = -1;
  
  for (let i = 0; i < lockEvents.length; i++) {
    const lock = lockEvents[i];
    
    // Check if there's a keyframe at or just after this lock
    const kfIndex = sortedKFs.findIndex((kf, idx) => 
      idx > lastKFIndex && Math.abs(kf.timestamp - lock.timestamp) < 100
    );
    
    if (kfIndex >= 0) {
      // Use keyframe board directly
      const kf = sortedKFs[kfIndex];
      currentBoard = kf.board;
      score = kf.score;
      lines = kf.lines;
      level = kf.level;
      nextPieces = kf.nextPieces;
      holdPiece = kf.holdPiece;
      lastKFIndex = kfIndex;
    } else {
      // Reconstruct: place piece on board then clear lines
      currentBoard = placePieceOnBoard(currentBoard, lock);
      currentBoard = clearLines(currentBoard, lock.linesCleared);
    }
    
    // Find the next spawn after this lock
    const nextSpawn = spawnEvents.find(s => s.timestamp > lock.timestamp);
    
    states.push({
      timestamp: lock.timestamp,
      board: cloneBoard(currentBoard),
      currentPiece: nextSpawn ? {
        type: nextSpawn.pieceType,
        x: nextSpawn.x,
        y: nextSpawn.y,
        rotation: 0
      } : null,
      nextPieces: [...nextPieces],
      holdPiece,
      score,
      lines,
      level
    });
  }
  
  console.log('[StateReconstructor] Built', states.length, 'states from keyframes+locks');
  return states;
}

/**
 * Get interpolated frame states between two lock states
 */
export function getFramesBetween(
  replay: V4ReplayData,
  startTime: number,
  endTime: number
): FrameState[] {
  return replay.events
    .filter(e => 
      e.type === ReplayOpcode.FRAME && 
      e.timestamp >= startTime && 
      e.timestamp <= endTime
    )
    .map(e => {
      const f = e as V4FrameEvent;
      return {
        timestamp: f.timestamp,
        pieceType: f.pieceType,
        x: f.x,
        y: f.y,
        rotation: f.rotation
      };
    });
}

/**
 * Find the game state at a given timestamp using binary search
 */
export function getStateAtTime(states: V4GameState[], timestamp: number): V4GameState {
  if (states.length === 0) {
    return {
      timestamp: 0,
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieces: [],
      holdPiece: null,
      score: 0,
      lines: 0,
      level: 0
    };
  }
  
  // Binary search for the state just before or at timestamp
  let low = 0;
  let high = states.length - 1;
  
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (states[mid].timestamp <= timestamp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return states[low];
}

// Helper functions

function createEmptyBoard(): number[][] {
  return Array(23).fill(null).map(() => Array(10).fill(0));
}

function cloneBoard(board: number[][]): number[][] {
  return board.map(row => [...row]);
}

function placePieceOnBoard(board: number[][], lock: V4LockEvent): number[][] {
  const newBoard = cloneBoard(board);
  const shape = getPieceShape(lock.pieceType, lock.rotation);
  const typeId = PIECE_TYPE_TO_ID[lock.pieceType] || 1;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const boardY = lock.y + row;
        const boardX = lock.x + col;
        if (boardY >= 0 && boardY < newBoard.length && boardX >= 0 && boardX < 10) {
          newBoard[boardY][boardX] = typeId;
        }
      }
    }
  }
  
  return newBoard;
}

function clearLines(board: number[][], linesCount: number): number[][] {
  if (linesCount <= 0) return board;
  
  const newBoard = board.filter(row => row.some(cell => cell === 0));
  
  // Add empty rows at the top
  while (newBoard.length < board.length) {
    newBoard.unshift(Array(10).fill(0));
  }
  
  return newBoard;
}
