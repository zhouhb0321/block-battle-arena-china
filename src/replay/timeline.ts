/**
 * Replay timeline: turns a decoded V4 replay into sorted arrays so playback is
 * a binary search, not a simulation.
 *
 * Two important details learned from the stored data:
 * - the engine board is 23 rows (20 visible + 3 spawn buffer), so boards must
 *   be cropped, not rejected;
 * - LOCK events carry next/hold/score even when they carry no board, so state
 *   and board are tracked separately.
 */
import { ReplayOpcode } from '@/utils/replayV4/types';
import type {
  V4Event,
  V4FrameEvent,
  V4KeyframeEvent,
  V4LockEvent,
  V4ReplayData,
} from '@/utils/replayV4/types';

export const VISIBLE_ROWS = 20;
export const BOARD_COLS = 10;

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
  eventCounters: { locks: number; keyframes: number; inputs: number };
}

export function emptyBoard(): number[][] {
  return Array.from({ length: VISIBLE_ROWS }, () => new Array(BOARD_COLS).fill(0));
}

/**
 * Normalise any engine board to 20 visible rows x 10 columns.
 * Returns null only when the value cannot be a board at all.
 */
export function cropBoard(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length < VISIBLE_ROWS) return null;
  const rows = value as number[][];
  if (!rows.every((row) => Array.isArray(row) && row.length === BOARD_COLS)) return null;
  return rows.slice(rows.length - VISIBLE_ROWS).map((row) => row.slice());
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

  for (const event of events) {
    switch (event.type) {
      case ReplayOpcode.KF: {
        const kf = event as V4KeyframeEvent;
        keyframes += 1;
        const board = cropBoard(kf.board);
        if (board) boards.push({ t: kf.timestamp, board });
        states.push({
          t: kf.timestamp,
          next: Array.isArray(kf.nextPieces) ? kf.nextPieces : [],
          hold: kf.holdPiece ?? null,
          score: kf.score ?? 0,
          lines: kf.lines ?? 0,
          level: kf.level ?? 1,
        });
        break;
      }
      case ReplayOpcode.LOCK: {
        const lock = event as V4LockEvent;
        locks += 1;
        const board = cropBoard(lock.boardAfterLock);
        if (board) boards.push({ t: lock.timestamp, board });
        states.push({
          t: lock.timestamp,
          next: Array.isArray(lock.nextPieces) ? lock.nextPieces : [],
          hold: lock.holdPiece ?? null,
          score: lock.score ?? 0,
          lines: lock.lines ?? 0,
          level: lock.level ?? 1,
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
    eventCounters: { locks, keyframes, inputs },
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
