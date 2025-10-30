import { describe, it, expect } from 'vitest';
import { validateV4Replay } from '../codec';
import { V4ReplayData, ReplayOpcode } from '../types';

describe('V4 Replay Validation', () => {
  const createValidReplay = (): V4ReplayData => ({
    version: '4.0',
    metadata: {
      userId: 'test-user',
      username: 'TestPlayer',
      gameMode: '40-lines',
      seed: 'test-seed-123',
      initialPieceSequence: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
      recordedAt: new Date().toISOString(),
      settings: { das: 100, arr: 10, sdf: 20 }
    },
    events: [
      {
        type: ReplayOpcode.LOCK,
        timestamp: 1000,
        x: 3,
        y: 18,
        rotation: 0,
        pieceType: 'I',
        linesCleared: 1,
        isTSpin: false,
        isMini: false
      },
      {
        type: ReplayOpcode.KF,
        timestamp: 1000,
        board: Array(20).fill(null).map(() => Array(10).fill(0)),
        nextPieces: ['O', 'T', 'S'],
        holdPiece: null,
        score: 100,
        lines: 1,
        level: 1
      },
      {
        type: ReplayOpcode.END,
        timestamp: 2000,
        reason: 'complete'
      }
    ],
    stats: {
      finalScore: 100,
      finalLines: 1,
      finalLevel: 1,
      duration: 2000,
      pps: 0.5,
      apm: 30,
      lockCount: 1,
      keyframeCount: 1
    },
    checksum: 'valid-checksum'
  });

  describe('Required Events', () => {
    it('should pass validation for replay with LOCK and KF events', () => {
      const replay = createValidReplay();
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when no LOCK events', () => {
      const replay = createValidReplay();
      replay.events = replay.events.filter(e => e.type !== ReplayOpcode.LOCK);
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('LOCK'))).toBe(true);
    });

    it('should fail validation when no KEYFRAME events', () => {
      const replay = createValidReplay();
      replay.events = replay.events.filter(e => e.type !== ReplayOpcode.KF);
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('keyframe'))).toBe(true);
    });
  });

  describe('Lock Count Consistency', () => {
    it('should pass when lockCount matches actual LOCK events', () => {
      const replay = createValidReplay();
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
      expect(result.stats.lockCount).toBe(replay.stats.lockCount);
    });

    it('should fail when lockCount does not match actual LOCK events', () => {
      const replay = createValidReplay();
      replay.stats.lockCount = 10; // Incorrect count
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lockCount'))).toBe(true);
    });
  });

  describe('Initial Piece Sequence', () => {
    it('should pass for sequence with 7+ pieces', () => {
      const replay = createValidReplay();
      replay.metadata.initialPieceSequence = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
    });

    it('should fail for sequence with < 7 pieces', () => {
      const replay = createValidReplay();
      replay.metadata.initialPieceSequence = ['I', 'O', 'T'];
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('initialPieceSequence'))).toBe(true);
    });
  });

  describe('Piece Type Validation', () => {
    it('should pass for valid piece types', () => {
      const replay = createValidReplay();
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid piece type in LOCK event', () => {
      const replay = createValidReplay();
      replay.events[0] = {
        type: ReplayOpcode.LOCK,
        timestamp: 1000,
        x: 3,
        y: 18,
        rotation: 0,
        pieceType: 'X', // Invalid
        linesCleared: 1,
        isTSpin: false,
        isMini: false
      };
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid piece type'))).toBe(true);
    });

    it('should fail for invalid piece type in initialPieceSequence', () => {
      const replay = createValidReplay();
      replay.metadata.initialPieceSequence = ['I', 'O', 'X', 'S', 'Z', 'J', 'L'];
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid piece'))).toBe(true);
    });
  });

  describe('Timestamp Monotonicity', () => {
    it('should pass when timestamps are monotonically increasing', () => {
      const replay = createValidReplay();
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
    });

    it('should warn when timestamps are not monotonic', () => {
      const replay = createValidReplay();
      replay.events[2] = {
        type: ReplayOpcode.END,
        timestamp: 500, // Earlier than previous event
        reason: 'complete'
      };
      
      const result = validateV4Replay(replay);
      
      expect(result.warnings.some(w => w.includes('timestamp'))).toBe(true);
    });
  });

  describe('Keyframe Integrity', () => {
    it('should pass when keyframe has all required fields', () => {
      const replay = createValidReplay();
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(true);
    });

    it('should fail when keyframe is missing board', () => {
      const replay = createValidReplay();
      const kfEvent: any = replay.events.find(e => e.type === ReplayOpcode.KF);
      delete kfEvent.board;
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('board'))).toBe(true);
    });

    it('should fail when keyframe board has wrong dimensions', () => {
      const replay = createValidReplay();
      const kfEvent: any = replay.events.find(e => e.type === ReplayOpcode.KF);
      kfEvent.board = Array(10).fill(null).map(() => Array(10).fill(0)); // Wrong: 10x10 instead of 20x10
      
      const result = validateV4Replay(replay);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('board'))).toBe(true);
    });
  });

  describe('Statistics Reporting', () => {
    it('should report correct event counts', () => {
      const replay = createValidReplay();
      replay.events.push({
        type: ReplayOpcode.SPAWN,
        timestamp: 500,
        pieceType: 'T',
        x: 3,
        y: 0
      });
      
      const result = validateV4Replay(replay);
      
      expect(result.stats.totalEvents).toBe(4);
      expect(result.stats.spawnCount).toBe(1);
      expect(result.stats.lockCount).toBe(1);
      expect(result.stats.keyframeCount).toBe(1);
    });
  });
});
