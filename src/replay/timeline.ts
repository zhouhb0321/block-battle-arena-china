/**
 * Replay timeline: turns a decoded V4 replay into two sorted arrays
 * (board snapshots + piece frames) so playback is a binary search,
 * not a simulation. This is the whole point of the rewrite: playback
 * must not depend on the game engine still behaving the same way.
 */
import { ReplayOpcode } from '@/utils/replayV4/types';
import type {
  V4Event,
  V4FrameEvent,
  V4KeyframeEvent,
  V4LockEvent,
  V4ReplayData,
} from '@/utils/replayV4/types';

export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;

export interface BoardSnapshot {
  t: number;
  board: number[][];
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
  frames: PieceFrame[];
  eventCounters: { locks: number; keyframes: number; inputs: number };
}

export function emptyBoard(): number[][] {
  return Array.from({ length: BOARD_ROWS }, () => new Array(BOARD_COLS).fill(0));
}

function isBoard(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length === BOARD_ROWS &&
    value.every((row) => Array.isArray(row) && row.length === BOARD_COLS)
  );
}

export function buildTimeline(replay: V4ReplayData): Timeline {
  const events: V4Event[] = Array.isArray(replay?.events) ? replay.events : [];

  const boards: BoardSnapshot[] = [
    {
      t: 0,
      board: emptyBoard(),
      next: [],
      hold: null,
      score: 0,
      lines: 0,
      level: 1,
    },
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
        if (isBoard(kf.board)) {
          boards.push({
            t: kf.timestamp,
            board: kf.board,
            next: Array.isArray(kf.nextPieces) ? kf.nextPieces : [],
            hold: kf.holdPiece ?? null,
            score: kf.score ?? 0,
            lines: kf.lines ?? 0,
            level: kf.level ?? 1,
          });
        }
        break;
      }
      case ReplayOpcode.LOCK: {
        const lock = event as V4LockEvent;
        locks += 1;
        if (isBoard(lock.boardAfterLock)) {
          const prev = boards[boards.length - 1];
          boards.push({
            t: lock.timestamp,
            board: lock.boardAfterLock,
            next: Array.isArray(lock.nextPieces) ? lock.nextPieces : prev.next,
            hold: lock.holdPiece ?? null,
            score: lock.score ?? prev.score,
            lines: lock.lines ?? prev.lines,
            level: lock.level ?? prev.level,
          });
        }
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
  frames.sort((a, b) => a.t - b.t);

  const lastEvent = events.length ? events[events.length - 1].timestamp : 0;
  const duration = Math.max(replay?.stats?.duration ?? 0, lastEvent, 1);

  return {
    duration,
    meta: replay.metadata,
    stats: replay.stats,
    boards,
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
  const snapshot = boardIndex >= 0 ? timeline.boards[boardIndex] : timeline.boards[0];

  const frameIndex = lastAtOrBefore(timeline.frames, t);
  let piece: PieceFrame | null = null;
  if (frameIndex >= 0) {
    const frame = timeline.frames[frameIndex];
    // A frame is only valid until the next lock: after locking, the piece
    // no longer exists on the board until the following spawn frame arrives.
    if (!snapshot || frame.t >= snapshot.t) {
      piece = frame;
    }
  }

  return {
    t,
    board: snapshot?.board ?? emptyBoard(),
    piece,
    next: snapshot?.next ?? [],
    hold: snapshot?.hold ?? null,
    score: snapshot?.score ?? 0,
    lines: snapshot?.lines ?? 0,
    level: snapshot?.level ?? 1,
  };
}
