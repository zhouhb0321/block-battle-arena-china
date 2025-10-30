import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid Tetromino types
const VALID_PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Replay opcodes
const ReplayOpcode = {
  SPAWN: 0x01,
  INPUT: 0x02,
  LOCK: 0x03,
  KF: 0x04,
  META: 0x05,
  END: 0xFF
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Scoring validation (based on Tetris guideline)
function calculateExpectedScore(
  linesCleared: number,
  isTSpin: boolean,
  isMini: boolean,
  level: number
): number {
  if (linesCleared === 0) {
    // T-Spin Mini no lines
    if (isTSpin && isMini) return 100 * level;
    // T-Spin no lines
    if (isTSpin) return 400 * level;
    return 0;
  }

  // T-Spin scoring
  if (isTSpin) {
    if (isMini) {
      // T-Spin Mini
      if (linesCleared === 1) return 200 * level;
      if (linesCleared === 2) return 400 * level;
    } else {
      // Regular T-Spin
      if (linesCleared === 1) return 800 * level;
      if (linesCleared === 2) return 1200 * level;
      if (linesCleared === 3) return 1600 * level;
    }
  }

  // Normal line clear scoring
  const baseScores = [0, 100, 300, 500, 800];
  return (baseScores[linesCleared] || 0) * level;
}

// Validate board state
function isValidBoard(board: number[][]): boolean {
  if (!Array.isArray(board)) return false;
  if (board.length !== 20) return false;
  
  for (const row of board) {
    if (!Array.isArray(row)) return false;
    if (row.length !== 10) return false;
    for (const cell of row) {
      if (typeof cell !== 'number') return false;
      // Cell values: 0 (empty) or 1-7 (piece types)
      if (cell < 0 || cell > 7) return false;
    }
  }
  
  return true;
}

// Main validation function
function validateReplay(replayData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check basic structure
  if (!replayData || typeof replayData !== 'object') {
    return { valid: false, errors: ['Invalid replay data structure'], warnings: [] };
  }

  if (replayData.version !== '4.0') {
    errors.push(`Unsupported version: ${replayData.version}`);
  }

  if (!replayData.metadata || !replayData.events || !replayData.stats) {
    errors.push('Missing required fields: metadata, events, or stats');
  }

  if (!Array.isArray(replayData.events)) {
    errors.push('Events must be an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 2. Validate piece types in metadata
  if (replayData.metadata.initialPieceSequence) {
    for (const piece of replayData.metadata.initialPieceSequence) {
      if (!VALID_PIECES.includes(piece)) {
        errors.push(`Invalid piece type in initial sequence: ${piece}`);
      }
    }
  }

  // 3. Count events and validate structure
  let lockCount = 0;
  let keyframeCount = 0;
  let spawnCount = 0;
  let prevTimestamp = 0;

  for (let i = 0; i < replayData.events.length; i++) {
    const event = replayData.events[i];
    
    // Validate timestamp monotonicity
    if (event.timestamp < prevTimestamp) {
      errors.push(`Non-monotonic timestamp at event ${i}: ${event.timestamp} < ${prevTimestamp}`);
    }
    prevTimestamp = event.timestamp;

    // Validate event type
    switch (event.type) {
      case ReplayOpcode.SPAWN:
        spawnCount++;
        if (!VALID_PIECES.includes(event.pieceType)) {
          errors.push(`Invalid piece type in SPAWN event ${i}: ${event.pieceType}`);
        }
        break;

      case ReplayOpcode.LOCK:
        lockCount++;
        if (!VALID_PIECES.includes(event.pieceType)) {
          errors.push(`Invalid piece type in LOCK event ${i}: ${event.pieceType}`);
        }
        // Validate position is within board bounds
        if (event.x < 0 || event.x >= 10) {
          errors.push(`Invalid X position in LOCK event ${i}: ${event.x}`);
        }
        if (event.y < 0 || event.y >= 20) {
          warnings.push(`Y position out of visible board in LOCK event ${i}: ${event.y}`);
        }
        // Validate rotation (0-3)
        if (event.rotation < 0 || event.rotation > 3) {
          errors.push(`Invalid rotation in LOCK event ${i}: ${event.rotation}`);
        }
        // Validate lines cleared (0-4)
        if (event.linesCleared < 0 || event.linesCleared > 4) {
          errors.push(`Invalid lines cleared in LOCK event ${i}: ${event.linesCleared}`);
        }
        break;

      case ReplayOpcode.KF:
        keyframeCount++;
        if (!isValidBoard(event.board)) {
          errors.push(`Invalid board state in keyframe ${i}`);
        }
        break;
    }
  }

  // 4. Validate minimum event requirements
  if (lockCount === 0) {
    errors.push('Replay must contain at least one LOCK event');
  }

  if (keyframeCount === 0) {
    errors.push('Replay must contain at least one keyframe');
  }

  // 5. Validate stats consistency
  if (replayData.stats.lockCount !== lockCount) {
    errors.push(`Lock count mismatch: stats=${replayData.stats.lockCount}, actual=${lockCount}`);
  }

  if (replayData.stats.keyframeCount !== keyframeCount) {
    warnings.push(`Keyframe count mismatch: stats=${replayData.stats.keyframeCount}, actual=${keyframeCount}`);
  }

  // 6. Validate score calculation (sample check)
  // We can't fully verify score without simulating the entire game,
  // but we can do sanity checks
  const maxPossibleScore = lockCount * 800 * 20; // Max theoretical score
  if (replayData.stats.finalScore > maxPossibleScore) {
    errors.push(`Score too high: ${replayData.stats.finalScore} exceeds theoretical max ${maxPossibleScore}`);
  }

  if (replayData.stats.finalScore < 0) {
    errors.push('Score cannot be negative');
  }

  // 7. Validate PPS and APM
  const durationSeconds = replayData.stats.duration / 1000;
  if (durationSeconds > 0) {
    const calculatedPPS = lockCount / durationSeconds;
    const reportedPPS = replayData.stats.pps;
    
    // Allow 10% tolerance
    if (Math.abs(calculatedPPS - reportedPPS) > calculatedPPS * 0.1) {
      warnings.push(`PPS mismatch: calculated=${calculatedPPS.toFixed(2)}, reported=${reportedPPS.toFixed(2)}`);
    }
  }

  // 8. Validate duration
  if (replayData.stats.duration <= 0) {
    errors.push('Duration must be positive');
  }

  const lastEventTime = replayData.events[replayData.events.length - 1]?.timestamp || 0;
  if (Math.abs(lastEventTime - replayData.stats.duration) > 1000) {
    warnings.push(`Duration mismatch: last event at ${lastEventTime}ms, stats=${replayData.stats.duration}ms`);
  }

  // 9. Check for suspicious patterns
  if (lockCount > 0 && durationSeconds > 0) {
    const pps = lockCount / durationSeconds;
    if (pps > 15) {
      warnings.push(`Extremely high PPS: ${pps.toFixed(2)} (possible speedhack)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { replayData } = await req.json();

    if (!replayData) {
      return new Response(
        JSON.stringify({ valid: false, errors: ['No replay data provided'], warnings: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Validate] Validating replay: ${replayData.metadata?.gameMode}, ${replayData.stats?.lockCount} locks`);

    const result = validateReplay(replayData);

    console.log(`[Validate] Result: valid=${result.valid}, errors=${result.errors.length}, warnings=${result.warnings.length}`);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.valid ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[Validate] Error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
