/**
 * Replay Diagnostics - Frame-by-frame comparison for replay consistency
 */

export interface DiagnosticSnapshot {
  timestamp: number;
  lockIndex: number;
  
  // Current piece state (before lock)
  currentPiece: {
    type: string;
    x: number;
    y: number;
    rotation: number;
  };
  
  // Board state (after lock)
  board: number[][];
  
  // Next pieces and hold
  nextPieces: string[];
  holdPiece: string | null;
  
  // Game stats
  score: number;
  lines: number;
  level: number;
  
  // Gravity info
  gravityLevel: number;
  dropSpeed: number;
}

export interface DiagnosticDifference {
  lockIndex: number;
  timestamp: number;
  field: string;
  recorded: any;
  replayed: any;
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Compare two game states and return differences
 */
export function compareSnapshots(
  recorded: DiagnosticSnapshot,
  replayed: DiagnosticSnapshot
): DiagnosticDifference[] {
  const differences: DiagnosticDifference[] = [];
  
  // Compare current piece
  if (recorded.currentPiece.type !== replayed.currentPiece.type) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'currentPiece.type',
      recorded: recorded.currentPiece.type,
      replayed: replayed.currentPiece.type,
      severity: 'critical'
    });
  }
  
  if (recorded.currentPiece.x !== replayed.currentPiece.x) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'currentPiece.x',
      recorded: recorded.currentPiece.x,
      replayed: replayed.currentPiece.x,
      severity: 'critical'
    });
  }
  
  if (recorded.currentPiece.y !== replayed.currentPiece.y) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'currentPiece.y',
      recorded: recorded.currentPiece.y,
      replayed: replayed.currentPiece.y,
      severity: 'critical'
    });
  }
  
  if (recorded.currentPiece.rotation !== replayed.currentPiece.rotation) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'currentPiece.rotation',
      recorded: recorded.currentPiece.rotation,
      replayed: replayed.currentPiece.rotation,
      severity: 'critical'
    });
  }
  
  // Compare board state (cell by cell)
  for (let y = 0; y < recorded.board.length; y++) {
    for (let x = 0; x < recorded.board[y].length; x++) {
      if (recorded.board[y][x] !== replayed.board[y][x]) {
        differences.push({
          lockIndex: recorded.lockIndex,
          timestamp: recorded.timestamp,
          field: `board[${y}][${x}]`,
          recorded: recorded.board[y][x],
          replayed: replayed.board[y][x],
          severity: 'critical'
        });
      }
    }
  }
  
  // Compare next pieces
  for (let i = 0; i < Math.min(recorded.nextPieces.length, replayed.nextPieces.length); i++) {
    if (recorded.nextPieces[i] !== replayed.nextPieces[i]) {
      differences.push({
        lockIndex: recorded.lockIndex,
        timestamp: recorded.timestamp,
        field: `nextPieces[${i}]`,
        recorded: recorded.nextPieces[i],
        replayed: replayed.nextPieces[i],
        severity: 'critical'
      });
    }
  }
  
  // Compare hold piece
  if (recorded.holdPiece !== replayed.holdPiece) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'holdPiece',
      recorded: recorded.holdPiece,
      replayed: replayed.holdPiece,
      severity: 'critical'
    });
  }
  
  // Compare game stats
  if (recorded.score !== replayed.score) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'score',
      recorded: recorded.score,
      replayed: replayed.score,
      severity: 'warning'
    });
  }
  
  if (recorded.lines !== replayed.lines) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'lines',
      recorded: recorded.lines,
      replayed: replayed.lines,
      severity: 'warning'
    });
  }
  
  if (recorded.level !== replayed.level) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'level',
      recorded: recorded.level,
      replayed: replayed.level,
      severity: 'warning'
    });
  }
  
  // Compare gravity info
  if (recorded.gravityLevel !== replayed.gravityLevel) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'gravityLevel',
      recorded: recorded.gravityLevel,
      replayed: replayed.gravityLevel,
      severity: 'info'
    });
  }
  
  if (recorded.dropSpeed !== replayed.dropSpeed) {
    differences.push({
      lockIndex: recorded.lockIndex,
      timestamp: recorded.timestamp,
      field: 'dropSpeed',
      recorded: recorded.dropSpeed,
      replayed: replayed.dropSpeed,
      severity: 'info'
    });
  }
  
  return differences;
}

/**
 * Format differences for console output
 */
export function formatDifferences(differences: DiagnosticDifference[]): string {
  if (differences.length === 0) {
    return '✅ No differences found - replay is consistent!';
  }
  
  const critical = differences.filter(d => d.severity === 'critical');
  const warnings = differences.filter(d => d.severity === 'warning');
  const info = differences.filter(d => d.severity === 'info');
  
  let output = `\n❌ Found ${differences.length} differences:\n`;
  
  if (critical.length > 0) {
    output += `\n🔴 Critical (${critical.length}):\n`;
    critical.forEach(d => {
      output += `  Lock #${d.lockIndex} @ ${d.timestamp}ms: ${d.field}\n`;
      output += `    Recorded: ${JSON.stringify(d.recorded)}\n`;
      output += `    Replayed: ${JSON.stringify(d.replayed)}\n`;
    });
  }
  
  if (warnings.length > 0) {
    output += `\n⚠️ Warnings (${warnings.length}):\n`;
    warnings.forEach(d => {
      output += `  Lock #${d.lockIndex}: ${d.field} (${d.recorded} → ${d.replayed})\n`;
    });
  }
  
  if (info.length > 0) {
    output += `\nℹ️ Info (${info.length}):\n`;
    info.forEach(d => {
      output += `  Lock #${d.lockIndex}: ${d.field} (${d.recorded} → ${d.replayed})\n`;
    });
  }
  
  return output;
}

/**
 * Analyze differences and suggest fixes
 */
export function analyzeDifferences(differences: DiagnosticDifference[]): string[] {
  const suggestions: string[] = [];
  
  const hasPieceTypeMismatch = differences.some(d => d.field === 'currentPiece.type');
  const hasPositionMismatch = differences.some(d => 
    d.field === 'currentPiece.x' || d.field === 'currentPiece.y'
  );
  const hasBoardMismatch = differences.some(d => d.field.startsWith('board'));
  const hasNextMismatch = differences.some(d => d.field.startsWith('nextPieces'));
  const hasScoreMismatch = differences.some(d => d.field === 'score');
  const hasLevelMismatch = differences.some(d => d.field === 'level');
  const hasGravityMismatch = differences.some(d => 
    d.field === 'gravityLevel' || d.field === 'dropSpeed'
  );
  
  if (hasPieceTypeMismatch || hasNextMismatch) {
    suggestions.push('🔴 Seed/RNG issue: Piece sequence does not match. Check that replay uses the same seed and resetSevenBag() is called correctly.');
  }
  
  if (hasPositionMismatch && !hasBoardMismatch) {
    suggestions.push('⚠️ Position mismatch but board is same: Likely timing/gravity issue. Check that gravity is enabled during replay.');
  }
  
  if (hasBoardMismatch) {
    suggestions.push('🔴 Board state mismatch: Critical issue. Check that all INPUT events are being processed correctly during replay.');
  }
  
  if (hasScoreMismatch) {
    suggestions.push('⚠️ Score mismatch: Scoring logic may differ. Check scoringSystem.ts for any conditional logic based on game state.');
  }
  
  if (hasLevelMismatch || hasGravityMismatch) {
    suggestions.push('ℹ️ Level/Gravity mismatch: Check that level changes are being tracked and gravity is recalculated correctly.');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('✅ Minor differences only. Replay is likely acceptable.');
  }
  
  return suggestions;
}
