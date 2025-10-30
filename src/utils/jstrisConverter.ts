import { V4ReplayData, V4KeyframeEvent, V4LockEvent, ReplayOpcode } from './replayV4/types';
import * as LZString from 'lz-string';

/**
 * Jstris Replay Data Structure (Framework)
 * This will be updated once we have actual Jstris data samples
 */
export interface JstrisReplayData {
  // Encoded data format (when pasting raw data)
  encodedData?: string;
  
  // API response format
  replay?: {
    gameid?: number;
    name?: string;
    seed?: number;
    time?: number; // milliseconds
    score?: number;
    lines?: number;
    pps?: number;
    data?: string; // compressed replay data
    events?: Array<{
      frame?: number;
      type?: string; // 'spawn' | 'move' | 'rotate' | 'drop' | 'lock' | 'hold'
      piece?: string;
      x?: number;
      y?: number;
      rotation?: number;
    }>;
  };
  // Other possible fields
  game?: any;
  user?: any;
  [key: string]: any; // Allow any structure for now
}

/**
 * Convert Jstris replay data to V4 format
 * 
 * @param jstrisData - Raw data from Jstris API
 * @param replayId - Jstris replay ID
 * @returns V4ReplayData compatible with our replay player
 * 
 * NOTE: This is a framework implementation. The actual conversion logic
 * will be completed once we have a real Jstris data sample to analyze.
 */
export function convertJstrisToV4(jstrisData: any, replayId: string): V4ReplayData {
  console.log('[Jstris Converter] Raw data received:', jstrisData);
  
  // Check if this is encoded data that needs decoding
  if (jstrisData.encodedData) {
    console.log('[Jstris Converter] Detected encoded data format');
    const decoded = decodeJstrisData(jstrisData.encodedData);
    if (decoded) {
      console.log('[Jstris Converter] Successfully decoded data:', decoded);
      jstrisData = decoded;
    } else {
      console.warn('[Jstris Converter] Failed to decode data, using placeholder');
    }
  }
  
  // Try to extract replay data from various possible structures
  const replayInfo = jstrisData.replay || jstrisData.game || jstrisData;
  
  // Extract basic metadata
  const gameid = replayInfo.gameid || replayInfo.id || replayId;
  const playerName = replayInfo.name || replayInfo.user?.name || 'Jstris Player';
  const seed = replayInfo.seed || 0;
  const duration = replayInfo.time || replayInfo.duration || 0;
  const score = replayInfo.score || 0;
  const lines = replayInfo.lines || 0;
  const pps = replayInfo.pps || 0;
  
  console.log('[Jstris Converter] Extracted metadata:', {
    gameid,
    playerName,
    seed,
    duration,
    score,
    lines,
    pps
  });

  // Create initial keyframe (empty board)
  const initialKeyframe: V4KeyframeEvent = {
    type: ReplayOpcode.KF,
    timestamp: 0,
    board: Array(20).fill(null).map(() => Array(10).fill(0)),
    nextPieces: [],
    holdPiece: null,
    score: 0,
    lines: 0,
    level: 1
  };

  // TODO: Parse actual Jstris events when we have sample data
  // For now, create a minimal valid V4 replay structure
  const events: Array<V4KeyframeEvent | V4LockEvent> = [initialKeyframe];

  // If Jstris data contains events, attempt to convert them
  if (replayInfo.events && Array.isArray(replayInfo.events)) {
    console.log('[Jstris Converter] Found events array:', replayInfo.events.length);
    
    // TODO: Implement actual event conversion
    // This will be completed when we analyze real Jstris data structure
    for (const jEvent of replayInfo.events) {
      if (jEvent.type === 'lock' && jEvent.piece) {
        const timestamp = jEvent.frame ? (jEvent.frame / 60) * 1000 : 0;
        
        const lockEvent: V4LockEvent = {
          type: ReplayOpcode.LOCK,
          timestamp,
          pieceType: mapJstrisPieceType(jEvent.piece),
          x: jEvent.x || 0,
          y: jEvent.y || 0,
          rotation: jEvent.rotation || 0,
          linesCleared: 0, // TODO: Calculate from board state
          isTSpin: false, // TODO: Detect T-Spin
          isMini: false
        };
        
        events.push(lockEvent);
      }
    }
  } else {
    console.warn('[Jstris Converter] No events found in Jstris data');
  }

  // Calculate APM (approximate)
  const apm = pps > 0 && duration > 0 ? (pps * 60) : 0;

  // Create V4ReplayData
  const v4Replay: V4ReplayData = {
    version: '4.0',
    metadata: {
      userId: 'jstris-import',
      username: playerName,
      gameMode: 'jstris-import',
      seed: String(seed),
      initialPieceSequence: [],
      recordedAt: new Date().toISOString(),
      settings: {
        das: 167,
        arr: 33,
        sdf: 20
      }
    },
    stats: {
      finalScore: score,
      finalLines: lines,
      finalLevel: 1,
      duration,
      pps,
      apm,
      lockCount: events.filter(e => e.type === ReplayOpcode.LOCK).length,
      keyframeCount: events.filter(e => e.type === ReplayOpcode.KF).length
    },
    events,
    checksum: '' // Optional
  };

  console.log('[Jstris Converter] Conversion complete:', {
    eventsCount: events.length,
    lockCount: v4Replay.stats.lockCount,
    keyframeCount: v4Replay.stats.keyframeCount
  });

  return v4Replay;
}

/**
 * Map Jstris piece type to standard format
 * 
 * Jstris may use different formats for piece types.
 * This function normalizes them to our standard format (I, O, T, S, Z, J, L)
 */
function mapJstrisPieceType(jstrisPiece: string): string {
  // Jstris typically uses single letter notation: I, O, T, S, Z, J, L
  const piece = jstrisPiece.toUpperCase().trim();
  
  // Validate it's a valid Tetris piece
  if (['I', 'O', 'T', 'S', 'Z', 'J', 'L'].includes(piece)) {
    return piece;
  }
  
  // Fallback to T if unrecognized
  console.warn(`[Jstris Converter] Unknown piece type: ${jstrisPiece}, defaulting to T`);
  return 'T';
}

/**
 * Decode Jstris compressed data
 * 
 * Jstris uses a custom compression format (likely LZ-string or similar)
 * The data starts with patterns like "N4Ig" which suggests base64 encoding
 */
export function decodeJstrisData(compressedData: string): any {
  console.log('[Jstris Converter] Attempting to decode data...');
  console.log('[Jstris Converter] Data length:', compressedData.length);
  console.log('[Jstris Converter] Data preview:', compressedData.substring(0, 50));
  
  try {
    // Strategy 1: LZ-string decompression (most likely for Jstris)
    // The "N4Ig" prefix is typical of LZ-string base64 URL-safe encoding
    try {
      const decompressed = LZString.decompressFromBase64(compressedData);
      if (decompressed) {
        console.log('[Jstris Converter] LZ-string base64 decompressed');
        try {
          const parsed = JSON.parse(decompressed);
          console.log('[Jstris Converter] Successfully decoded LZ-string data:', parsed);
          return parsed;
        } catch {
          console.log('[Jstris Converter] LZ-string decoded but not JSON');
        }
      }
    } catch (e) {
      console.log('[Jstris Converter] LZ-string base64 failed, trying other methods');
    }
    
    // Strategy 2: LZ-string URI encoding
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
      if (decompressed) {
        console.log('[Jstris Converter] LZ-string URI decompressed');
        try {
          const parsed = JSON.parse(decompressed);
          console.log('[Jstris Converter] Successfully decoded LZ-string URI data:', parsed);
          return parsed;
        } catch {
          console.log('[Jstris Converter] LZ-string URI decoded but not JSON');
        }
      }
    } catch (e) {
      console.log('[Jstris Converter] LZ-string URI failed');
    }
    
    // Strategy 3: Try direct JSON parse (unlikely but worth checking)
    try {
      const parsed = JSON.parse(compressedData);
      console.log('[Jstris Converter] Successfully parsed as JSON');
      return parsed;
    } catch {
      // Not JSON, continue
    }
    
    // Strategy 4: Try base64 decode
    try {
      const decoded = atob(compressedData);
      console.log('[Jstris Converter] Base64 decoded, length:', decoded.length);
      
      // Try parsing decoded data as JSON
      try {
        const parsed = JSON.parse(decoded);
        console.log('[Jstris Converter] Successfully decoded base64 JSON');
        return parsed;
      } catch {
        // Not JSON after base64 decode
        console.log('[Jstris Converter] Base64 decoded but not JSON');
      }
    } catch (e) {
      console.log('[Jstris Converter] Not valid base64');
    }
    
    // Strategy 5: URL-safe base64 decode (replace - with + and _ with /)
    try {
      const urlSafeDecoded = compressedData.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(urlSafeDecoded);
      console.log('[Jstris Converter] URL-safe base64 decoded');
      
      try {
        const parsed = JSON.parse(decoded);
        console.log('[Jstris Converter] Successfully decoded URL-safe base64 JSON');
        return parsed;
      } catch {
        console.log('[Jstris Converter] URL-safe base64 decoded but not JSON');
      }
    } catch (e) {
      console.log('[Jstris Converter] Not valid URL-safe base64');
    }
    
    // If all strategies failed
    console.error('[Jstris Converter] Unable to decode - all strategies failed');
    console.error('[Jstris Converter] Data prefix:', compressedData.substring(0, 20));
    return null;
    
  } catch (error) {
    console.error('[Jstris Converter] Decoding error:', error);
    return null;
  }
}

/**
 * Generate piece sequence from Jstris seed
 * 
 * If Jstris uses a deterministic piece generation algorithm,
 * we can regenerate the entire piece sequence from the seed.
 */
export function generateJstrisPieceSequence(seed: number, length: number): string[] {
  // TODO: Implement Jstris's piece generation algorithm
  // This requires understanding how Jstris generates pieces from a seed
  
  console.warn('[Jstris Converter] Piece sequence generation not yet implemented');
  
  // Placeholder: return empty array
  return [];
}
