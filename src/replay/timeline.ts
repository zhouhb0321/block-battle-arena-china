/**
 * Replay timeline: turns a decoded V4 replay into sorted arrays so playback is
 * a binary search, not a live re-simulation.
 *
 * Facts learned from the stored replays:
 * - the engine board is 23 rows (20 visible + 3 spawn buffer) → crop, never reject;
 * - newer LOCK events embed the full board, older ones only embed keyframes, so
 *   the board is rebuilt by placing each locked piece when the snapshot is absent;
 * - LOCK/KEYFRAME events often omit next/hold/score → inherit from the previous
 *   state instead of resetting to zero.
 */
import { ReplayOpcode } from '@/utils/replayV4/types';
import type {
  V4Event,
  V4FrameEvent,
  V4KeyframeEvent,
  V4LockEvent,
  V4ReplayData,
} from '@/utils/replayV4/types';
import { getPieceShape } from '@/utils/tetrominoShapes';

export const VISIBLE_ROWS = 20;
export const BOARD_COLS = 10;
const HIDDEN_ROWS = 3;

export interface BoardSnapshot {
  t: number;
  board: number[][];
}

export interface StateSnapshot {
  t: number;
  next: string[];
  hold: string | null;
  score: number;
  lines: number;
  level: number;
}

export interface PieceFrame {
  t: number;
  type: string;
  x: number;
  y: number;
  rotation: number;
}

export interface FrameState {
  t: number;
  board: number[][];
  piece: PieceFrame | null;
  next: string[];
  hold: string | null;
  score: number;
  lines: number;
  level: number;
}

export interface Timeline {
  duration: number;
  meta: V4ReplayData['metadata'];
  stats: V4ReplayData['stats'];
  boards: BoardSnapshot[];
  states: StateSnapshot[];
  frames: PieceFrame[];
  eventCounters: { locks: number; keyframes: number; inputs: number; rebuiltBoards: number };
}

export function emptyBoard(): number[][] {
  return Array.from({ length: VISIBLE_ROWS }, () => new Array(BOARD_COLS).fill(0));
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

/** Normalise an engine board to 20 visible rows x 10 columns. */
export function cropBoard(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length < VISIBLE_ROWS) return null;
  const rows = value as number[][];
  if (!rows.every((row) => Array.isArray(row) && row.length === BOARD_COLS)) return null;
  return rows.slice(rows.length - VISIBLE_ROWS).map((row) => row.slice());
}

function numberOr<T>(value: T | undefined | null, fallback: T): T {
  return typeof value === 'number' || typeof value === 'string' ? (value as T) : fallback;
}

/** Place a locked piece and clear completed lines, mirroring the engine. */
function applyLock(board: number[][], lock: V4LockEvent): number[][] {
  const next = cloneBoard(board);
  const shape = getPieceShape(lock.pieceType, lock.rotation);
  const x = lock.x;
  const y = lock.y - HIDDEN_ROWS;
  for (let r = 0; r < shape.length; r += 1) {
    for (let c = 0; c < (shape[r]?.length ?? 0); c += 1) {
      if (!shape[r][c]) continue;
      const row = y + r;
      const col = x + c;
      if (row >= 0 && row < VISIBLE_ROWS && col >= 0 && col < BOARD_COLS) {
        next[row][col] = 1;
      }
    }
  }

  const cleared = next.filter((row) => row.every((cell) => cell !== 0)).length;
  if (cleared > 0) {
    for (let i = 0; i < cleared; i += 1) {
      next.shift();
      next.push(new Array(BOARD_COLS).fill(0));
    }
  }
  return next;
}

export function buildTimeline(replay: V4ReplayData): Timeline {
  const events: V4Event[] = Array.isArray(replay?.events) ? replay.events : [];

  const boards: BoardSnapshot[] = [{ t: 0, board: emptyBoard() }];
  const states: StateSnapshot[] = [
    { t: 0, next: [], hold: null, score: 0, lines: 0, level: 1 },
  ];
  const frames: PieceFrame[] = [];
  let locks = 0;
  let keyframes = 0;
  let inputs = 0;
  let rebuiltBoards = 0;

  let workingBoard = emptyBoard();

  const lastState = () => states[states.length - 1];

  for (const event of events) {
    switch (event.type) {
      case ReplayOpcode.KF: {
        const kf = event as V4KeyframeEvent;
        keyframes += 1;
        const board = cropBoard(kf.board);
        if (board) {
          workingBoard = board;
          boards.push({ t: kf.timestamp, board });
        }
        const prev = lastState();
        states.push({
          t: kf.timestamp,
          next: Array.isArray(kf.nextPieces) && kf.nextPieces.length ? kf.nextPieces : prev.next,
          hold: kf.holdPiece ?? prev.hold,
          score: numberOr(kf.score, prev.score),
          lines: numberOr(kf.lines, prev.lines),
          level: numberOr(kf.level, prev.level),
        });
        break;
      }
      case ReplayOpcode.LOCK: {
        const lock = event as V4LockEvent;
        locks += 1;
        const embedded = cropBoard(lock.boardAfterLock);
        const board = embedded ?? applyLock(workingBoard, lock);
        if (!embedded) rebuiltBoards += 1;
        workingBoard = board;
        boards.push({ t: lock.timestamp, board });
        const prev = lastState();
        states.push({
          t: lock.timestamp,
          next: Array.isArray(lock.nextPieces) && lock.nextPieces.length ? lock.nextPieces : prev.next,
          hold: lock.holdPiece ?? prev.hold,
          score: numberOr(lock.score, prev.score),
          lines: numberOr(lock.lines, prev.lines),
          level: numberOr(lock.level, prev.level),
        });
        break;
      }
      case ReplayOpcode.FRAME: {
        const frame = event as V4FrameEvent;
        if (frame.pieceType) {
          frames.push({
            t: frame.timestamp,
            type: frame.pieceType,
            x: frame.x,
            y: frame.y,
            rotation: frame.rotation,
          });
        }
        break;
      }
      case ReplayOpcode.INPUT:
        inputs += 1;
        break;
      default:
        break;
    }
  }

  boards.sort((a, b) => a.t - b.t);
  states.sort((a, b) => a.t - b.t);
  frames.sort((a, b) => a.t - b.t);

  const lastEvent = events.length ? events[events.length - 1].timestamp : 0;
  const duration = Math.max(replay?.stats?.duration ?? 0, lastEvent, 1);

  return {
    duration,
    meta: replay.metadata,
    stats: replay.stats,
    boards,
    states,
    frames,
    eventCounters: { locks, keyframes, inputs, rebuiltBoards },
  };
}

/** Index of the last element with time <= t. -1 when t precedes all. */
function lastAtOrBefore<T extends { t: number }>(list: T[], t: number): number {
  let lo = 0;
  let hi = list.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function sampleAt(timeline: Timeline, time: number): FrameState {
  const t = Math.max(0, Math.min(time, timeline.duration));

  const boardIndex = lastAtOrBefore(timeline.boards, t);
  const boardSnapshot = boardIndex >= 0 ? timeline.boards[boardIndex] : timeline.boards[0];

  const stateIndex = lastAtOrBefore(timeline.states, t);
  const stateSnapshot = stateIndex >= 0 ? timeline.states[stateIndex] : timeline.states[0];

  const frameIndex = lastAtOrBefore(timeline.frames, t);
  let piece: PieceFrame | null = null;
  if (frameIndex >= 0) {
    const frame = timeline.frames[frameIndex];
    // A frame stays valid only until the next lock: after the piece locks it is
    // gone from the board until the following frame of the new piece arrives.
    if (frame.t >= boardSnapshot.t) piece = frame;
  }

  return {
    t,
    board: boardSnapshot?.board ?? emptyBoard(),
    piece,
    next: stateSnapshot?.next ?? [],
    hold: stateSnapshot?.hold ?? null,
    score: stateSnapshot?.score ?? 0,
    lines: stateSnapshot?.lines ?? 0,
    level: stateSnapshot?.level ?? 1,
  };
}
