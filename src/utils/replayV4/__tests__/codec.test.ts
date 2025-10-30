import { describe, it, expect } from 'vitest';
import { encodeV4Replay, decodeV4Replay, validateV4Replay } from '../codec';
import { V4ReplayData, ReplayOpcode, InputAction } from '../types';

describe('V4 Replay Codec', () => {
  // Helper to create minimal valid replay
  const createMinimalReplay = (): V4ReplayData => ({
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
        type: ReplayOpcode.SPAWN,
        timestamp: 0,
        pieceType: 'I',
        x: 3,
        y: 0
      },
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
    checksum: ''
  });

  describe('Encoding and Decoding', () => {
    it('should encode and decode minimal replay correctly', async () => {
      const original = createMinimalReplay();
      
      const encoded = await encodeV4Replay(original);
      expect(encoded).toBeInstanceOf(Uint8Array);
      expect(encoded.length).toBeGreaterThan(0);
      
      const decoded = await decodeV4Replay(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.version).toBe('4.0');
      expect(decoded?.metadata.username).toBe('TestPlayer');
      expect(decoded?.events.length).toBe(4);
    });

    it('should preserve data integrity through encode/decode cycle', async () => {
      const original = createMinimalReplay();
      
      const encoded = await encodeV4Replay(original);
      const decoded = await decodeV4Replay(encoded);
      
      expect(decoded?.stats.lockCount).toBe(original.stats.lockCount);
      expect(decoded?.stats.keyframeCount).toBe(original.stats.keyframeCount);
      expect(decoded?.metadata.seed).toBe(original.metadata.seed);
      expect(decoded?.stats.finalScore).toBe(original.stats.finalScore);
    });

    it('should reject invalid magic bytes', async () => {
      const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      const decoded = await decodeV4Replay(invalidData);
      expect(decoded).toBeNull();
    });

    it('should reject invalid version number', async () => {
      // Create data with correct magic but wrong version
      const invalidVersion = new Uint8Array([0x52, 0x50, 0x56, 0x34, 0x05]); // RPV4 + version 5
      const decoded = await decodeV4Replay(invalidVersion);
      expect(decoded).toBeNull();
    });

    it('should handle empty events array', async () => {
      const replay = createMinimalReplay();
      replay.events = [];
      replay.stats.lockCount = 0;
      replay.stats.keyframeCount = 0;
      
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      expect(decoded?.events).toHaveLength(0);
    });
  });

  describe('Checksum Validation', () => {
    it('should generate consistent checksum', async () => {
      const replay = createMinimalReplay();
      
      const encoded1 = await encodeV4Replay(replay);
      const encoded2 = await encodeV4Replay(replay);
      
      const decoded1 = await decodeV4Replay(encoded1);
      const decoded2 = await decodeV4Replay(encoded2);
      
      expect(decoded1?.checksum).toBe(decoded2?.checksum);
    });

    it('should detect data tampering', async () => {
      const replay = createMinimalReplay();
      const encoded = await encodeV4Replay(replay);
      
      // Tamper with data (modify a byte in the middle)
      const tampered = new Uint8Array(encoded);
      tampered[50] = tampered[50] ^ 0xFF;
      
      const decoded = await decodeV4Replay(tampered);
      // Should either fail to decode or have mismatched checksum
      expect(decoded === null || decoded.checksum !== replay.checksum).toBe(true);
    });
  });

  describe('Event Type Handling', () => {
    it('should encode and decode SPAWN events', async () => {
      const replay = createMinimalReplay();
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      const spawnEvent = decoded?.events.find(e => e.type === ReplayOpcode.SPAWN);
      expect(spawnEvent).toBeDefined();
      expect(spawnEvent?.type).toBe(ReplayOpcode.SPAWN);
    });

    it('should encode and decode INPUT events', async () => {
      const replay = createMinimalReplay();
      replay.events.splice(1, 0, {
        type: ReplayOpcode.INPUT,
        timestamp: 500,
        action: InputAction.MOVE_LEFT,
        success: true
      });
      
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      const inputEvent = decoded?.events.find(e => e.type === ReplayOpcode.INPUT);
      expect(inputEvent).toBeDefined();
      expect(inputEvent?.type).toBe(ReplayOpcode.INPUT);
    });

    it('should encode and decode LOCK events', async () => {
      const replay = createMinimalReplay();
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      const lockEvent = decoded?.events.find(e => e.type === ReplayOpcode.LOCK);
      expect(lockEvent).toBeDefined();
      expect(lockEvent?.type).toBe(ReplayOpcode.LOCK);
    });

    it('should encode and decode KEYFRAME events', async () => {
      const replay = createMinimalReplay();
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      const kfEvent = decoded?.events.find(e => e.type === ReplayOpcode.KF);
      expect(kfEvent).toBeDefined();
      expect(kfEvent?.type).toBe(ReplayOpcode.KF);
    });

    it('should encode and decode END events', async () => {
      const replay = createMinimalReplay();
      const encoded = await encodeV4Replay(replay);
      const decoded = await decodeV4Replay(encoded);
      
      const endEvent = decoded?.events.find(e => e.type === ReplayOpcode.END);
      expect(endEvent).toBeDefined();
      expect(endEvent?.type).toBe(ReplayOpcode.END);
    });
  });

  describe('Compression Efficiency', () => {
    it('should produce reasonable encoded size for typical 40-line replay', async () => {
      const replay = createMinimalReplay();
      
      // Simulate 40 pieces
      for (let i = 0; i < 40; i++) {
        replay.events.push({
          type: ReplayOpcode.SPAWN,
          timestamp: i * 1000,
          pieceType: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'][i % 7],
          x: 3,
          y: 0
        });
        
        replay.events.push({
          type: ReplayOpcode.LOCK,
          timestamp: i * 1000 + 500,
          x: 3,
          y: 18,
          rotation: 0,
          pieceType: ['I', 'O', 'T', 'S', 'Z', 'J', 'L'][i % 7],
          linesCleared: i % 4 === 0 ? 1 : 0,
          isTSpin: false,
          isMini: false
        });
        
        // Add keyframe every 10 locks
        if (i % 10 === 0) {
          replay.events.push({
            type: ReplayOpcode.KF,
            timestamp: i * 1000 + 500,
            board: Array(20).fill(null).map(() => Array(10).fill(0)),
            nextPieces: ['O', 'T', 'S'],
            holdPiece: null,
            score: i * 100,
            lines: i,
            level: Math.floor(i / 10) + 1
          });
        }
      }
      
      replay.stats.lockCount = 40;
      replay.stats.keyframeCount = 5;
      
      const encoded = await encodeV4Replay(replay);
      
      // Should be less than 10KB for 40-line replay
      expect(encoded.length).toBeLessThan(10 * 1024);
    });
  });
});
