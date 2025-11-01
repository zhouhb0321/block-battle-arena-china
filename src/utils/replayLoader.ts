import { supabase } from '@/integrations/supabase/client';
import { toUint8Array } from './byteArrayUtils';
import { ReplayCompressor } from './replayCompression';
import { decodeV4Replay } from './replayV4/codec';
import type { ReplayAction } from './gameTypes';
import type { V4ReplayData } from './replayV4/types';

export interface DecodedActionsResult {
  bytes: Uint8Array;
  actions: ReplayAction[];
  info: {
    encoding: 'base64' | 'bytea-hex' | 'ascii-json' | 'json-array' | 'binary';
    originalSize: number;
    decodedSize: number;
    placeActionsCount: number;
  };
}

/**
 * V3.0+ replay decoder - handles various encoded binary data formats
 */
export async function decodeV3ReplayActions(dataInput: string): Promise<DecodedActionsResult> {
  console.info('replayLoader: Decoding v3.0 replay actions, input length:', dataInput?.length || 0);

  try {
    if (!dataInput) {
      throw new Error('Empty replay data');
    }

    // Normalize the input - remove whitespace and data URL prefixes
    let normalizedInput = dataInput.trim();
    
    // Handle data URLs (data:application/octet-stream;base64,...)
    if (normalizedInput.startsWith('data:')) {
      const commaIndex = normalizedInput.indexOf(',');
      if (commaIndex !== -1) {
        normalizedInput = normalizedInput.substring(commaIndex + 1);
        console.info('replayLoader: Stripped data URL prefix');
      }
    }

    // Handle URL-safe base64 (replace - with + and _ with /)
    normalizedInput = normalizedInput.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (normalizedInput.length % 4) {
      normalizedInput += '=';
    }

    console.info('replayLoader: Input analysis', {
      originalLength: dataInput.length,
      normalizedLength: normalizedInput.length,
      startsWithHex: dataInput.startsWith('\\x'),
      startsWithData: dataInput.startsWith('data:'),
      isObject: typeof dataInput === 'object',
      sample: dataInput.substring(0, 50)
    });

    // Use toUint8Array to handle various formats (hex, base64, arrays, etc.)
    const bytes = toUint8Array(normalizedInput);
    
    if (bytes.length === 0) {
      throw new Error('No data after decoding');
    }
    
    console.info('replayLoader: Decoded bytes', {
      byteLength: bytes.length,
      firstBytes: Array.from(bytes.slice(0, 10)),
      lastBytes: Array.from(bytes.slice(-10))
    });

    // Decode binary data using ReplayCompressor
    const compressedActions = ReplayCompressor.decodeFromBinary(bytes);
    const actions = ReplayCompressor.decompressActions(compressedActions);
    
    const placeActionsCount = actions.filter(action => action.action === 'place').length;
    
    // Determine the encoding type based on input characteristics
    let encoding: 'base64' | 'bytea-hex' | 'ascii-json' | 'json-array' | 'binary' = 'base64';
    if (dataInput.startsWith('\\x')) {
      encoding = 'bytea-hex';
    } else if (dataInput.startsWith('[') && dataInput.endsWith(']')) {
      encoding = 'json-array';
    } else if (typeof dataInput === 'object') {
      encoding = 'binary';
    }
    
    console.info('replayLoader: V3.0 decode successful', {
      encoding,
      originalSize: dataInput.length,
      decodedSize: bytes.length,
      actionsCount: actions.length,
      placeActionsCount
    });

    // Gentle warnings for potentially problematic replays
    if (actions.length === 0) {
      console.warn('replayLoader: Replay has zero actions, may not be playable');
    } else if (placeActionsCount === 0) {
      console.warn('replayLoader: Replay has no place actions, may be incomplete');
    }

    return {
      bytes,
      actions,
      info: {
        encoding,
        originalSize: dataInput.length,
        decodedSize: bytes.length,
        placeActionsCount
      }
    };

  } catch (error) {
    console.error('replayLoader: V3.0 decode failed:', error, {
      inputType: typeof dataInput,
      inputLength: dataInput?.length || 0,
      inputSample: typeof dataInput === 'string' ? dataInput.substring(0, 100) : dataInput
    });
    throw new Error(`Failed to decode v3.0 replay: ${error.message}`);
  }
}


/**
 * Load replay by ID - supports V3.0 and V4.0 formats
 */
export async function loadReplayById(replayId: string): Promise<any> {
  console.info('replayLoader: Loading replay by ID:', replayId);
  
  const { data, error } = await supabase
    .from('compressed_replays')
    .select('*')
    .eq('id', replayId)
    .single();

  if (error) {
    console.error('replayLoader: Failed to load replay:', error);
    throw new Error(`Failed to load replay: ${error.message}`);
  }

  if (!data) {
    throw new Error('Replay not found');
  }

  if (!data.compressed_actions) {
    throw new Error('Invalid replay data: compressed_actions is missing');
  }
  
  const version = parseFloat(data.version || '1.0');
  
  // V4.0 format
  if (version >= 4.0) {
    console.info('replayLoader: Decoding V4.0 replay, id:', replayId);
    console.info('replayLoader: Raw data type:', typeof data.compressed_actions);
    console.info('replayLoader: Raw data is Array?', Array.isArray(data.compressed_actions));
    console.info('replayLoader: Raw data is Uint8Array?', data.compressed_actions instanceof Uint8Array);
    
    let bytes: Uint8Array;
    
    // Prioritize Base64 string format (new format)
    if (typeof data.compressed_actions === 'string') {
      const rawString = data.compressed_actions;
      console.info('replayLoader: ✅ Processing Base64 string', {
        length: rawString.length,
        startsWithDataURL: rawString.startsWith('data:'),
        firstChars: rawString.substring(0, 20),
        lastChars: rawString.substring(rawString.length - 20),
        hasWhitespace: /\s/.test(rawString),
        hasInvalidBase64Chars: /[^A-Za-z0-9+/=]/.test(rawString)
      });
      
      try {
        // Clean the Base64 string
        let cleanBase64 = rawString.trim();
        
        // Remove data URL prefix if present
        if (cleanBase64.startsWith('data:')) {
          const commaIndex = cleanBase64.indexOf(',');
          if (commaIndex !== -1) {
            cleanBase64 = cleanBase64.substring(commaIndex + 1);
            console.info('replayLoader: Removed data URL prefix');
          }
        }
        
        console.info('replayLoader: Attempting Base64 decode, clean string length:', cleanBase64.length);
        const binaryString = atob(cleanBase64);
        console.info('replayLoader: ✅ Base64 decode successful, binary string length:', binaryString.length);
        
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        console.info('replayLoader: ✅ Uint8Array created, length:', bytes.length);
      } catch (e) {
        console.error('replayLoader: ❌ Base64 decode failed:', e);
        console.error('replayLoader: Attempting fallback to toUint8Array');
        bytes = toUint8Array(data.compressed_actions);
        console.info('replayLoader: Fallback produced', bytes.length, 'bytes');
      }
    } else if (data.compressed_actions instanceof Uint8Array) {
      bytes = data.compressed_actions;
      console.info('replayLoader: ✅ Using Uint8Array directly, length:', bytes.length);
    } else if (Array.isArray(data.compressed_actions)) {
      console.error('replayLoader: ❌ ERROR: Data is a plain array, should be Base64 string or Uint8Array!');
      console.error('replayLoader: This indicates the replay was saved incorrectly (JSON serialization instead of Base64)');
      console.error('replayLoader: Array length:', data.compressed_actions.length);
      console.error('replayLoader: First 10 elements:', data.compressed_actions.slice(0, 10));
      throw new Error('Invalid replay format: compressed_actions is an array instead of Base64 string. This replay needs to be re-recorded.');
    } else {
      console.warn('replayLoader: ⚠️ Unknown data type, using toUint8Array fallback');
      console.info('replayLoader: Data type:', typeof data.compressed_actions);
      bytes = toUint8Array(data.compressed_actions);
      console.info('replayLoader: Fallback produced', bytes.length, 'bytes');
    }
    
    console.info('replayLoader: 🔍 Binary data analysis:', {
      totalLength: bytes.length,
      firstBytes: Array.from(bytes.slice(0, 8)),
      firstBytesHex: Array.from(bytes.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
      firstBytesAscii: Array.from(bytes.slice(0, 8)).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join(''),
      expectedMagic: 'RPV4',
      expectedMagicBytes: [82, 80, 86, 52],
      expectedMagicHex: '0x52 0x50 0x56 0x34',
      magicMatch: bytes[0] === 82 && bytes[1] === 80 && bytes[2] === 86 && bytes[3] === 52,
      versionByte: bytes[4]
    });
    
    let v4Data: V4ReplayData;
    try {
      const decoded = await decodeV4Replay(bytes);
      
      if (!decoded) {
        throw new Error('Decoder returned null - check console for specific error');
      }
      
      v4Data = decoded;
      
      console.info('replayLoader: V4.0 decoding completed:', {
        eventCount: v4Data.events.length,
        lockCount: v4Data.stats.lockCount,
        keyframeCount: v4Data.stats.keyframeCount
      });
    } catch (decodeError) {
      console.error('replayLoader: V4 decode failed:', decodeError);
      throw new Error(`Failed to decode V4 replay: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
    }
    
    return {
      id: data.id,
      version: '4.0',
      format: 'v4',
      v4Data,
      // Legacy fields for compatibility
      gameMode: v4Data.metadata.gameMode,
      seed: v4Data.metadata.seed,
      durationSeconds: Math.floor(v4Data.stats.duration / 1000),
      finalScore: v4Data.stats.finalScore,
      finalLines: v4Data.stats.finalLines,
      username: v4Data.metadata.username,
      pps: v4Data.stats.pps,
      apm: v4Data.stats.apm,
      createdAt: data.created_at
    };
  }
  
  // V3.0 format (legacy)
  console.info('replayLoader: Decoding v3.0 replay');
  const decodedResult = await decodeV3ReplayActions(data.compressed_actions);
  
  console.info('replayLoader: V3.0 decoding completed:', {
    actionsLength: decodedResult.actions.length,
    placeActionsCount: decodedResult.info.placeActionsCount,
    binarySize: decodedResult.bytes.length
  });

  return {
    id: data.id,
    version: data.version,
    format: 'v3',
    gameMode: data.game_mode,
    seed: data.seed,
    durationSeconds: data.duration_seconds,
    finalScore: data.final_score,
    finalLines: data.final_lines,
    compressionRatio: data.compression_ratio,
    actions: decodedResult.actions,
    compressedActions: decodedResult.bytes,
    decodedResult: decodedResult.info,
    username: data.username,
    createdAt: data.created_at,
    pps: data.pps,
    apm: data.apm,
    isPersonalBest: data.is_personal_best,
    isWorldRecord: data.is_world_record,
    actionsCount: data.actions_count
  };
}

/**
 * Check if a replay can be played
 */
export function isReplayPlayable(replay: { 
  actions_count?: number; 
  version?: string;
  format?: string;
  v4Data?: V4ReplayData;
}): boolean {
  const version = parseFloat(replay.version || '1.0');
  
  // V4 is always playable if it has v4Data
  if (version >= 4.0 || replay.format === 'v4') {
    return !!replay.v4Data && replay.v4Data.stats.lockCount > 0;
  }
  
  // V3 requires actions
  return (replay.actions_count || 0) > 0 && version >= 3.0;
}