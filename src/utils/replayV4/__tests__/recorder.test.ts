import { describe, it, expect } from 'vitest';
import { ReplayOpcode } from '../types';

describe('V4 Replay Recorder Logic', () => {
  describe('Piece Type Sanitization', () => {
    const VALID_PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    
    const sanitizePieceType = (type: string): string => {
      const normalized = type.toUpperCase().trim();
      if (!VALID_PIECES.includes(normalized)) {
        throw new Error(`Invalid piece type: ${type}`);
      }
      return normalized;
    };

    it('should accept all valid piece types', () => {
      VALID_PIECES.forEach(piece => {
        expect(() => sanitizePieceType(piece)).not.toThrow();
        expect(sanitizePieceType(piece)).toBe(piece);
      });
    });

    it('should normalize lowercase to uppercase', () => {
      expect(sanitizePieceType('i')).toBe('I');
      expect(sanitizePieceType('t')).toBe('T');
      expect(sanitizePieceType('o')).toBe('O');
    });

    it('should trim whitespace', () => {
      expect(sanitizePieceType(' I ')).toBe('I');
      expect(sanitizePieceType('  T  ')).toBe('T');
    });

    it('should reject invalid piece types', () => {
      expect(() => sanitizePieceType('X')).toThrow('Invalid piece type');
      expect(() => sanitizePieceType('A')).toThrow('Invalid piece type');
      expect(() => sanitizePieceType('')).toThrow('Invalid piece type');
      expect(() => sanitizePieceType('II')).toThrow('Invalid piece type');
    });
  });

  describe('Keyframe Generation Logic', () => {
    const shouldGenerateKeyframe = (lockCount: number): boolean => {
      return lockCount === 1 || lockCount % 10 === 0;
    };

    it('should generate keyframe on first lock', () => {
      expect(shouldGenerateKeyframe(1)).toBe(true);
    });

    it('should generate keyframe every 10th lock', () => {
      expect(shouldGenerateKeyframe(10)).toBe(true);
      expect(shouldGenerateKeyframe(20)).toBe(true);
      expect(shouldGenerateKeyframe(30)).toBe(true);
      expect(shouldGenerateKeyframe(100)).toBe(true);
    });

    it('should not generate keyframe on other locks', () => {
      expect(shouldGenerateKeyframe(2)).toBe(false);
      expect(shouldGenerateKeyframe(5)).toBe(false);
      expect(shouldGenerateKeyframe(9)).toBe(false);
      expect(shouldGenerateKeyframe(11)).toBe(false);
      expect(shouldGenerateKeyframe(15)).toBe(false);
    });
  });

  describe('Lock Event Recording', () => {
    interface LockEventData {
      x: number;
      y: number;
      rotation: number;
      pieceType: string;
      linesCleared: number;
      isTSpin: boolean;
      isMini: boolean;
    }

    const createLockEvent = (timestamp: number, data: LockEventData) => ({
      type: ReplayOpcode.LOCK,
      timestamp,
      ...data
    });

    it('should create valid lock event', () => {
      const event = createLockEvent(1000, {
        x: 3,
        y: 18,
        rotation: 0,
        pieceType: 'I',
        linesCleared: 1,
        isTSpin: false,
        isMini: false
      });

      expect(event.type).toBe(ReplayOpcode.LOCK);
      expect(event.timestamp).toBe(1000);
      expect(event.pieceType).toBe('I');
      expect(event.linesCleared).toBe(1);
    });

    it('should handle T-Spin detection', () => {
      const tSpinEvent = createLockEvent(2000, {
        x: 5,
        y: 17,
        rotation: 1,
        pieceType: 'T',
        linesCleared: 2,
        isTSpin: true,
        isMini: false
      });

      expect(tSpinEvent.isTSpin).toBe(true);
      expect(tSpinEvent.isMini).toBe(false);
    });

    it('should handle mini T-Spin', () => {
      const miniTSpinEvent = createLockEvent(3000, {
        x: 5,
        y: 17,
        rotation: 2,
        pieceType: 'T',
        linesCleared: 1,
        isTSpin: true,
        isMini: true
      });

      expect(miniTSpinEvent.isTSpin).toBe(true);
      expect(miniTSpinEvent.isMini).toBe(true);
    });
  });

  describe('Replay Validation Before Save', () => {
    interface ReplayStats {
      lockCount: number;
      keyframeCount: number;
      eventCount: number;
    }

    const shouldSaveReplay = (stats: ReplayStats): { save: boolean; reason?: string } => {
      if (stats.lockCount === 0) {
        return { save: false, reason: 'No pieces locked' };
      }
      if (stats.keyframeCount === 0) {
        return { save: false, reason: 'No keyframes recorded' };
      }
      if (stats.eventCount === 0) {
        return { save: false, reason: 'No events recorded' };
      }
      return { save: true };
    };

    it('should refuse to save replay with lockCount = 0', () => {
      const result = shouldSaveReplay({ lockCount: 0, keyframeCount: 1, eventCount: 10 });
      expect(result.save).toBe(false);
      expect(result.reason).toContain('No pieces locked');
    });

    it('should refuse to save replay with no keyframes', () => {
      const result = shouldSaveReplay({ lockCount: 5, keyframeCount: 0, eventCount: 10 });
      expect(result.save).toBe(false);
      expect(result.reason).toContain('No keyframes');
    });

    it('should refuse to save replay with no events', () => {
      const result = shouldSaveReplay({ lockCount: 5, keyframeCount: 1, eventCount: 0 });
      expect(result.save).toBe(false);
      expect(result.reason).toContain('No events');
    });

    it('should allow saving valid replay', () => {
      const result = shouldSaveReplay({ lockCount: 10, keyframeCount: 2, eventCount: 50 });
      expect(result.save).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('END Event Generation', () => {
    const createEndEvent = (timestamp: number, reason: 'complete' | 'gameover' | 'quit') => ({
      type: ReplayOpcode.END,
      timestamp,
      reason
    });

    it('should create END event for game completion', () => {
      const event = createEndEvent(60000, 'complete');
      expect(event.type).toBe(ReplayOpcode.END);
      expect(event.reason).toBe('complete');
      expect(event.timestamp).toBe(60000);
    });

    it('should create END event for game over', () => {
      const event = createEndEvent(30000, 'gameover');
      expect(event.reason).toBe('gameover');
    });

    it('should create END event for quit', () => {
      const event = createEndEvent(15000, 'quit');
      expect(event.reason).toBe('quit');
    });
  });

  describe('Metadata Initialization', () => {
    interface RecordingMetadata {
      seed: string;
      initialPieceSequence: string[];
      settings: { das: number; arr: number; sdf: number };
    }

    const initializeMetadata = (
      seed: string,
      initialPieces: string[],
      das: number,
      arr: number,
      sdf: number
    ): RecordingMetadata => ({
      seed,
      initialPieceSequence: initialPieces,
      settings: { das, arr, sdf }
    });

    it('should initialize metadata with correct values', () => {
      const metadata = initializeMetadata(
        'seed-123',
        ['I', 'O', 'T', 'S', 'Z', 'J', 'L'],
        100,
        10,
        20
      );

      expect(metadata.seed).toBe('seed-123');
      expect(metadata.initialPieceSequence).toHaveLength(7);
      expect(metadata.settings.das).toBe(100);
      expect(metadata.settings.arr).toBe(10);
      expect(metadata.settings.sdf).toBe(20);
    });

    it('should store at least 7 initial pieces', () => {
      const metadata = initializeMetadata(
        'seed-456',
        ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I', 'O', 'T', 'S', 'Z', 'J', 'L'],
        100,
        10,
        20
      );

      expect(metadata.initialPieceSequence.length).toBeGreaterThanOrEqual(7);
    });
  });
});
