import { supabase } from '@/integrations/supabase/client';
import { toUint8Array } from './byteArrayUtils';
import { ReplayCompressor } from './replayCompression';
import type { ReplayAction } from './gameTypes';

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
 * Unified decoder for all historical compressed_actions formats
 */
export async function decodeCompressedActionsAny(input: any): Promise<DecodedActionsResult> {
  console.info('replayLoader: Decoding compressed actions, input type:', typeof input, 'length:', input?.length || 0);

  let bytes: Uint8Array;
  let encoding: DecodedActionsResult['info']['encoding'] = 'binary';
  const originalSize = typeof input === 'string' ? input.length : (input?.byteLength || input?.length || 0);

  try {
    // Case 1: Already Uint8Array/ArrayBuffer
    if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
      bytes = toUint8Array(input);
      encoding = 'binary';
    }
    // Case 1b: Base64 string (not starting with \x or { and looks like base64)
    else if (typeof input === 'string' && !input.startsWith('\\x') && !input.startsWith('{') && 
             /^[A-Za-z0-9+/]+=*$/.test(input.trim())) {
      console.info('replayLoader: Detected base64 string, length:', input.length);
      bytes = toUint8Array(input);
      encoding = 'base64';
    }
    // Case 2: BYTEA hex string (starts with \x)
    else if (typeof input === 'string' && input.startsWith('\\x')) {
      // Convert BYTEA hex to raw bytes
      const hexString = input.slice(2); // Remove \x prefix
      const rawBytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        rawBytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
      }
      
      // Try to interpret as ASCII text
      const asciiText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
      console.info('replayLoader: BYTEA decoded to ASCII:', asciiText.substring(0, 100) + '...');
      
      if (asciiText.startsWith('{') || asciiText.startsWith('[')) {
        // It's JSON text inside BYTEA
        const jsonData = JSON.parse(asciiText);
        return handleJsonData(jsonData, originalSize, 'ascii-json');
      } else {
        // Treat as binary data
        bytes = rawBytes;
        encoding = 'bytea-hex';
      }
    }
    // Case 3: Direct JSON object/array
    else if (typeof input === 'object') {
      return handleJsonData(input, originalSize, 'json-array');
    }
    // Case 4: JSON string
    else if (typeof input === 'string' && (input.startsWith('{') || input.startsWith('['))) {
      const jsonData = JSON.parse(input);
      return handleJsonData(jsonData, originalSize, 'ascii-json');
    }
    else {
      throw new Error(`Unknown input format: ${typeof input}`);
    }

    // Decode binary data using ReplayCompressor
    const compressedActions = ReplayCompressor.decodeFromBinary(bytes);
    const actions = ReplayCompressor.decompressActions(compressedActions);
    
    const placeActionsCount = actions.filter(action => action.action === 'place').length;
    
    console.info('replayLoader: Binary decode successful', {
      encoding,
      originalSize,
      decodedSize: bytes.length,
      actionsCount: actions.length,
      placeActionsCount
    });

    return {
      bytes,
      actions,
      info: {
        encoding,
        originalSize,
        decodedSize: bytes.length,
        placeActionsCount
      }
    };

  } catch (error) {
    console.error('replayLoader: Decode failed:', error);
    throw new Error(`Failed to decode replay actions: ${error.message}`);
  }
}

/**
 * Handle JSON data (either CompressedAction[] or indexed object mapping)
 */
function handleJsonData(jsonData: any, originalSize: number, encoding: 'ascii-json' | 'json-array'): DecodedActionsResult {
  let actions: ReplayAction[];
  
  if (Array.isArray(jsonData)) {
    // Direct array of actions
    actions = jsonData as ReplayAction[];
  } else if (typeof jsonData === 'object' && jsonData !== null) {
    // Check if it's indexed mapping like {"0": {...}, "1": {...}}
    const keys = Object.keys(jsonData);
    if (keys.every(key => /^\d+$/.test(key))) {
      // Convert indexed object to array
      const maxIndex = Math.max(...keys.map(Number));
      const arrayData = new Array(maxIndex + 1);
      for (const [key, value] of Object.entries(jsonData)) {
        arrayData[parseInt(key)] = value;
      }
      actions = arrayData.filter(item => item != null) as ReplayAction[];
    } else {
      // Assume it's a single action or settings object
      actions = [jsonData as ReplayAction];
    }
  } else {
    throw new Error('Invalid JSON data structure');
  }

  // Create a mock Uint8Array for compatibility
  const compressedActions = ReplayCompressor.compressActions(actions);
  const bytes = ReplayCompressor.encodeToBinary(compressedActions);
  
  const placeActionsCount = actions.filter(action => action.action === 'place').length;
  
  console.info('replayLoader: JSON decode successful', {
    encoding,
    originalSize,
    decodedSize: bytes.length,
    actionsCount: actions.length,
    placeActionsCount
  });

  return {
    bytes,
    actions,
    info: {
      encoding,
      originalSize,
      decodedSize: bytes.length,
      placeActionsCount
    }
  };
}

/**
 * Fetch full replay record by ID and decode actions
 */
export async function loadReplayById(replayId: string) {
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

  // Decode the compressed actions
  console.info('replayLoader: Starting to decode compressed_actions for replay:', replayId);
  const decodedResult = await decodeCompressedActionsAny(data.compressed_actions);
  console.info('replayLoader: Decoding completed:', {
    actionsLength: decodedResult.actions.length,
    encoding: decodedResult.info.encoding,
    placeActionsCount: decodedResult.info.placeActionsCount
  });
  
  // Optionally migrate old format to base64 for future efficiency
  if (decodedResult.info.encoding !== 'base64' && decodedResult.info.encoding !== 'binary') {
    console.info('replayLoader: Migrating old format to base64 for replay:', replayId);
    try {
      const base64Data = btoa(String.fromCharCode(...decodedResult.bytes));
      await supabase
        .from('compressed_replays')
        .update({ compressed_actions: base64Data })
        .eq('id', replayId);
      console.info('replayLoader: Migration successful');
    } catch (migrationError) {
      console.warn('replayLoader: Migration failed, but playback should still work:', migrationError);
    }
  }

  return {
    ...data,
    decodedActions: decodedResult.actions,
    decodingInfo: decodedResult.info
  };
}

/**
 * Check if a replay can be played based on metadata
 */
export function isReplayPlayable(replay: { actions_count?: number; version?: string }): boolean {
  return (replay.actions_count || 0) > 0 && 
         replay.version && 
         parseFloat(replay.version) >= 2.0;
}