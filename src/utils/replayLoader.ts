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
 * V3.0+ replay decoder - only handles base64 encoded binary data
 */
export async function decodeV3ReplayActions(base64Input: string): Promise<DecodedActionsResult> {
  console.info('replayLoader: Decoding v3.0 replay actions, base64 length:', base64Input.length);

  try {
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64Input.trim())) {
      throw new Error('Invalid base64 format');
    }

    // Convert base64 to Uint8Array
    const bytes = toUint8Array(base64Input);
    
    // Decode binary data using ReplayCompressor
    const compressedActions = ReplayCompressor.decodeFromBinary(bytes);
    const actions = ReplayCompressor.decompressActions(compressedActions);
    
    const placeActionsCount = actions.filter(action => action.action === 'place').length;
    
    console.info('replayLoader: V3.0 decode successful', {
      originalSize: base64Input.length,
      decodedSize: bytes.length,
      actionsCount: actions.length,
      placeActionsCount
    });

    return {
      bytes,
      actions,
      info: {
        encoding: 'base64',
        originalSize: base64Input.length,
        decodedSize: bytes.length,
        placeActionsCount
      }
    };

  } catch (error) {
    console.error('replayLoader: V3.0 decode failed:', error);
    throw new Error(`Failed to decode v3.0 replay: ${error.message}`);
  }
}


/**
 * Load V3.0+ replay by ID - streamlined for latest format only
 */
export async function loadReplayById(replayId: string) {
  console.info('replayLoader: Loading v3.0+ replay by ID:', replayId);
  
  const { data, error } = await supabase
    .from('compressed_replays')
    .select('*')
    .eq('id', replayId)
    .gte('version', '3.0')
    .single();

  if (error) {
    console.error('replayLoader: Failed to load v3.0+ replay:', error);
    throw new Error(`Failed to load replay: ${error.message}`);
  }

  if (!data) {
    throw new Error('V3.0+ replay not found');
  }

  if (!data.compressed_actions || typeof data.compressed_actions !== 'string') {
    throw new Error('Invalid replay data: compressed_actions must be base64 string');
  }

  // Decode the v3.0 compressed actions
  console.info('replayLoader: Decoding v3.0 compressed_actions for replay:', replayId);
  const decodedResult = await decodeV3ReplayActions(data.compressed_actions);
  
  console.info('replayLoader: V3.0 decoding completed:', {
    actionsLength: decodedResult.actions.length,
    placeActionsCount: decodedResult.info.placeActionsCount,
    binarySize: decodedResult.bytes.length
  });

  // Return a complete CompressedReplay object
  return {
    id: data.id,
    gameMode: data.game_mode,
    seed: data.seed,
    durationSeconds: data.duration_seconds,
    finalScore: data.final_score,
    finalLines: data.final_lines,
    compressionRatio: data.compression_ratio,
    actions: decodedResult.actions,
    compressedActions: decodedResult.bytes,
    decodedResult: decodedResult.info,
    // Include other metadata
    username: data.username,
    createdAt: data.created_at,
    pps: data.pps,
    apm: data.apm,
    isPersonalBest: data.is_personal_best,
    isWorldRecord: data.is_world_record,
    version: data.version,
    actionsCount: data.actions_count
  };
}

/**
 * Check if a replay can be played based on v3.0+ criteria
 */
export function isReplayPlayable(replay: { actions_count?: number; version?: string }): boolean {
  return (replay.actions_count || 0) > 0 && 
         replay.version && 
         parseFloat(replay.version) >= 3.0;
}