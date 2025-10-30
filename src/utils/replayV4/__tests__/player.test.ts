import { describe, it, expect } from 'vitest';
import { ReplayOpcode, V4KeyframeEvent, V4LockEvent } from '../types';

describe('V4 Replay Player Logic', () => {
  describe('Keyframe Finding', () => {
    const keyframes: V4KeyframeEvent[] = [
      {
        type: ReplayOpcode.KF,
        timestamp: 0,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['I', 'O', 'T'],
        holdPiece: null,
        score: 0,
        lines: 0,
        level: 1
      },
      {
        type: ReplayOpcode.KF,
        timestamp: 10000,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['S', 'Z', 'J'],
        holdPiece: null,
        score: 1000,
        lines: 10,
        level: 2
      },
      {
        type: ReplayOpcode.KF,
        timestamp: 20000,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['L', 'I', 'O'],
        holdPiece: 'T',
        score: 2500,
        lines: 20,
        level: 3
      }
    ];

    const findRelevantKeyframe = (targetTime: number, kfs: V4KeyframeEvent[]): V4KeyframeEvent | null => {
      if (kfs.length === 0) return null;
      if (targetTime < kfs[0].timestamp) return null;
      
      let result = kfs[0];
      for (const kf of kfs) {
        if (kf.timestamp <= targetTime) {
          result = kf;
        } else {
          break;
        }
      }
      return result;
    };

    it('should find exact keyframe match', () => {
      const kf = findRelevantKeyframe(10000, keyframes);
      expect(kf).not.toBeNull();
      expect(kf?.timestamp).toBe(10000);
      expect(kf?.score).toBe(1000);
    });

    it('should find most recent keyframe before target time', () => {
      const kf = findRelevantKeyframe(15000, keyframes);
      expect(kf).not.toBeNull();
      expect(kf?.timestamp).toBe(10000);
      expect(kf?.score).toBe(1000);
    });

    it('should return null when target time is before first keyframe', () => {
      const kf = findRelevantKeyframe(-1000, keyframes);
      expect(kf).toBeNull();
    });

    it('should return null when no keyframes exist', () => {
      const kf = findRelevantKeyframe(5000, []);
      expect(kf).toBeNull();
    });

    it('should find last keyframe when time is after all keyframes', () => {
      const kf = findRelevantKeyframe(30000, keyframes);
      expect(kf).not.toBeNull();
      expect(kf?.timestamp).toBe(20000);
      expect(kf?.score).toBe(2500);
    });
  });

  describe('Lock Event Application', () => {
    const createEmptyBoard = (): number[][] => 
      Array(20).fill(null).map(() => Array(10).fill(0));

    const applyLockEvent = (board: number[][], lock: V4LockEvent): number[][] => {
      const newBoard = board.map(row => [...row]);
      // Simplified: just mark the lock position
      // In real implementation, this would place the piece shape
      if (lock.y >= 0 && lock.y < 20 && lock.x >= 0 && lock.x < 10) {
        newBoard[lock.y][lock.x] = 1;
      }
      return newBoard;
    };

    it('should apply lock event to board', () => {
      const board = createEmptyBoard();
      const lockEvent: V4LockEvent = {
        type: ReplayOpcode.LOCK,
        timestamp: 1000,
        x: 5,
        y: 19,
        rotation: 0,
        pieceType: 'I',
        linesCleared: 0,
        isTSpin: false,
        isMini: false
      };

      const newBoard = applyLockEvent(board, lockEvent);
      expect(newBoard[19][5]).toBe(1);
    });

    it('should not modify original board', () => {
      const board = createEmptyBoard();
      const lockEvent: V4LockEvent = {
        type: ReplayOpcode.LOCK,
        timestamp: 1000,
        x: 3,
        y: 18,
        rotation: 0,
        pieceType: 'O',
        linesCleared: 0,
        isTSpin: false,
        isMini: false
      };

      applyLockEvent(board, lockEvent);
      expect(board[18][3]).toBe(0); // Original unchanged
    });
  });

  describe('Score Calculation', () => {
    const calculateScoreForLines = (linesCleared: number, isTSpin: boolean, isMini: boolean, level: number): number => {
      if (linesCleared === 0) return 0;
      
      if (isTSpin) {
        if (isMini) {
          return linesCleared === 1 ? 100 * level : 200 * level;
        }
        const baseScores = [0, 800, 1200, 1600, 2000];
        return baseScores[linesCleared] * level;
      }
      
      const lineScores = [0, 100, 300, 500, 800];
      return lineScores[linesCleared] * level;
    };

    it('should calculate single line score', () => {
      expect(calculateScoreForLines(1, false, false, 1)).toBe(100);
      expect(calculateScoreForLines(1, false, false, 2)).toBe(200);
    });

    it('should calculate double line score', () => {
      expect(calculateScoreForLines(2, false, false, 1)).toBe(300);
    });

    it('should calculate triple line score', () => {
      expect(calculateScoreForLines(3, false, false, 1)).toBe(500);
    });

    it('should calculate tetris score', () => {
      expect(calculateScoreForLines(4, false, false, 1)).toBe(800);
      expect(calculateScoreForLines(4, false, false, 2)).toBe(1600);
    });

    it('should calculate T-Spin Single score', () => {
      expect(calculateScoreForLines(1, true, false, 1)).toBe(800);
    });

    it('should calculate T-Spin Double score', () => {
      expect(calculateScoreForLines(2, true, false, 1)).toBe(1200);
    });

    it('should calculate T-Spin Triple score', () => {
      expect(calculateScoreForLines(3, true, false, 1)).toBe(1600);
    });

    it('should calculate Mini T-Spin score', () => {
      expect(calculateScoreForLines(1, true, true, 1)).toBe(100);
      expect(calculateScoreForLines(2, true, true, 1)).toBe(200);
    });

    it('should return 0 for no lines cleared', () => {
      expect(calculateScoreForLines(0, false, false, 1)).toBe(0);
      expect(calculateScoreForLines(0, true, false, 1)).toBe(0);
    });
  });

  describe('State Reconstruction', () => {
    interface GameState {
      board: number[][];
      score: number;
      lines: number;
      level: number;
    }

    const reconstructState = (
      keyframe: V4KeyframeEvent,
      locks: V4LockEvent[]
    ): GameState => {
      let state: GameState = {
        board: keyframe.board.map(row => [...row]),
        score: keyframe.score,
        lines: keyframe.lines,
        level: keyframe.level
      };

      for (const lock of locks) {
        // Apply lock to board (simplified)
        // In real implementation, place piece and clear lines
        state.lines += lock.linesCleared;
        
        // Simplified score calculation
        if (lock.linesCleared > 0) {
          const lineScores = [0, 100, 300, 500, 800];
          state.score += lineScores[lock.linesCleared] * state.level;
        }
      }

      return state;
    };

    it('should start from keyframe state', () => {
      const kf: V4KeyframeEvent = {
        type: ReplayOpcode.KF,
        timestamp: 0,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['I', 'O', 'T'],
        holdPiece: null,
        score: 1000,
        lines: 5,
        level: 2
      };

      const state = reconstructState(kf, []);
      expect(state.score).toBe(1000);
      expect(state.lines).toBe(5);
      expect(state.level).toBe(2);
    });

    it('should apply lock events to update state', () => {
      const kf: V4KeyframeEvent = {
        type: ReplayOpcode.KF,
        timestamp: 0,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['I', 'O', 'T'],
        holdPiece: null,
        score: 0,
        lines: 0,
        level: 1
      };

      const locks: V4LockEvent[] = [
        {
          type: ReplayOpcode.LOCK,
          timestamp: 1000,
          x: 3,
          y: 19,
          rotation: 0,
          pieceType: 'I',
          linesCleared: 1,
          isTSpin: false,
          isMini: false
        }
      ];

      const state = reconstructState(kf, locks);
      expect(state.lines).toBe(1);
      expect(state.score).toBeGreaterThan(0);
    });
  });

  describe('Playback Speed Control', () => {
    const calculateDeltaTime = (realDelta: number, speed: number): number => {
      return realDelta * speed;
    };

    it('should handle normal speed (1x)', () => {
      expect(calculateDeltaTime(16, 1)).toBe(16);
      expect(calculateDeltaTime(100, 1)).toBe(100);
    });

    it('should handle slow motion (0.25x)', () => {
      expect(calculateDeltaTime(16, 0.25)).toBe(4);
      expect(calculateDeltaTime(100, 0.25)).toBe(25);
    });

    it('should handle half speed (0.5x)', () => {
      expect(calculateDeltaTime(16, 0.5)).toBe(8);
      expect(calculateDeltaTime(100, 0.5)).toBe(50);
    });

    it('should handle double speed (2x)', () => {
      expect(calculateDeltaTime(16, 2)).toBe(32);
      expect(calculateDeltaTime(100, 2)).toBe(200);
    });

    it('should handle 4x speed', () => {
      expect(calculateDeltaTime(16, 4)).toBe(64);
      expect(calculateDeltaTime(100, 4)).toBe(400);
    });
  });

  describe('Time Seeking', () => {
    const isValidSeekTime = (time: number, duration: number): boolean => {
      return time >= 0 && time <= duration;
    };

    it('should accept valid seek times', () => {
      expect(isValidSeekTime(5000, 10000)).toBe(true);
      expect(isValidSeekTime(0, 10000)).toBe(true);
      expect(isValidSeekTime(10000, 10000)).toBe(true);
    });

    it('should reject negative seek times', () => {
      expect(isValidSeekTime(-1000, 10000)).toBe(false);
    });

    it('should reject seek times beyond duration', () => {
      expect(isValidSeekTime(15000, 10000)).toBe(false);
    });
  });
});
