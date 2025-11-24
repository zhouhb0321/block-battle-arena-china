/**
 * Finesse System - Tracks optimal move efficiency
 * Based on Tetris Guideline and community standards
 */

export interface FinesseResult {
  actualMoves: number;
  optimalMoves: number;
  errors: number;
  efficiency: number; // 0-100
  isPerfect: boolean;
}

export interface FinesseStats {
  totalPieces: number;
  totalErrors: number;
  efficiency: number;
}

// Optimal finesse table: [pieceType][targetX][targetRotation]
// Values represent minimum number of moves (rotations + horizontal moves)
const FINESSE_TABLE: Record<string, Record<number, Record<number, number>>> = {
  // I piece
  'I': {
    0: { 0: 4, 1: 4, 2: 4, 3: 4 }, 1: { 0: 3, 1: 3, 2: 3, 3: 3 },
    2: { 0: 2, 1: 2, 2: 2, 3: 2 }, 3: { 0: 1, 1: 1, 2: 1, 3: 1 },
    4: { 0: 0, 1: 0, 2: 0, 3: 0 }, 5: { 0: 1, 1: 1, 2: 1, 3: 1 },
    6: { 0: 2, 1: 2, 2: 2, 3: 2 }, 7: { 0: 3, 1: 3, 2: 3, 3: 3 },
    8: { 0: 4, 1: 4, 2: 4, 3: 4 }, 9: { 0: 5, 1: 5, 2: 5, 3: 5 }
  },
  // O piece (no rotation needed)
  'O': {
    0: { 0: 4, 1: 4, 2: 4, 3: 4 }, 1: { 0: 3, 1: 3, 2: 3, 3: 3 },
    2: { 0: 2, 1: 2, 2: 2, 3: 2 }, 3: { 0: 1, 1: 1, 2: 1, 3: 1 },
    4: { 0: 0, 1: 0, 2: 0, 3: 0 }, 5: { 0: 1, 1: 1, 2: 1, 3: 1 },
    6: { 0: 2, 1: 2, 2: 2, 3: 2 }, 7: { 0: 3, 1: 3, 2: 3, 3: 3 },
    8: { 0: 4, 1: 4, 2: 4, 3: 4 }, 9: { 0: 5, 1: 5, 2: 5, 3: 5 }
  },
  // T piece
  'T': {
    0: { 0: 4, 1: 5, 2: 5, 3: 5 }, 1: { 0: 3, 1: 4, 2: 4, 3: 4 },
    2: { 0: 2, 1: 3, 2: 3, 3: 3 }, 3: { 0: 1, 1: 2, 2: 2, 3: 2 },
    4: { 0: 0, 1: 1, 2: 1, 3: 1 }, 5: { 0: 1, 1: 2, 2: 2, 3: 2 },
    6: { 0: 2, 1: 3, 2: 3, 3: 3 }, 7: { 0: 3, 1: 4, 2: 4, 3: 4 },
    8: { 0: 4, 1: 5, 2: 5, 3: 5 }, 9: { 0: 5, 1: 6, 2: 6, 3: 6 }
  },
  // S piece
  'S': {
    0: { 0: 4, 1: 5, 2: 5, 3: 5 }, 1: { 0: 3, 1: 4, 2: 4, 3: 4 },
    2: { 0: 2, 1: 3, 2: 3, 3: 3 }, 3: { 0: 1, 1: 2, 2: 2, 3: 2 },
    4: { 0: 0, 1: 1, 2: 1, 3: 1 }, 5: { 0: 1, 1: 2, 2: 2, 3: 2 },
    6: { 0: 2, 1: 3, 2: 3, 3: 3 }, 7: { 0: 3, 1: 4, 2: 4, 3: 4 },
    8: { 0: 4, 1: 5, 2: 5, 3: 5 }, 9: { 0: 5, 1: 6, 2: 6, 3: 6 }
  },
  // Z piece
  'Z': {
    0: { 0: 4, 1: 5, 2: 5, 3: 5 }, 1: { 0: 3, 1: 4, 2: 4, 3: 4 },
    2: { 0: 2, 1: 3, 2: 3, 3: 3 }, 3: { 0: 1, 1: 2, 2: 2, 3: 2 },
    4: { 0: 0, 1: 1, 2: 1, 3: 1 }, 5: { 0: 1, 1: 2, 2: 2, 3: 2 },
    6: { 0: 2, 1: 3, 2: 3, 3: 3 }, 7: { 0: 3, 1: 4, 2: 4, 3: 4 },
    8: { 0: 4, 1: 5, 2: 5, 3: 5 }, 9: { 0: 5, 1: 6, 2: 6, 3: 6 }
  },
  // J piece
  'J': {
    0: { 0: 4, 1: 5, 2: 5, 3: 5 }, 1: { 0: 3, 1: 4, 2: 4, 3: 4 },
    2: { 0: 2, 1: 3, 2: 3, 3: 3 }, 3: { 0: 1, 1: 2, 2: 2, 3: 2 },
    4: { 0: 0, 1: 1, 2: 1, 3: 1 }, 5: { 0: 1, 1: 2, 2: 2, 3: 2 },
    6: { 0: 2, 1: 3, 2: 3, 3: 3 }, 7: { 0: 3, 1: 4, 2: 4, 3: 4 },
    8: { 0: 4, 1: 5, 2: 5, 3: 5 }, 9: { 0: 5, 1: 6, 2: 6, 3: 6 }
  },
  // L piece
  'L': {
    0: { 0: 4, 1: 5, 2: 5, 3: 5 }, 1: { 0: 3, 1: 4, 2: 4, 3: 4 },
    2: { 0: 2, 1: 3, 2: 3, 3: 3 }, 3: { 0: 1, 1: 2, 2: 2, 3: 2 },
    4: { 0: 0, 1: 1, 2: 1, 3: 1 }, 5: { 0: 1, 1: 2, 2: 2, 3: 2 },
    6: { 0: 2, 1: 3, 2: 3, 3: 3 }, 7: { 0: 3, 1: 4, 2: 4, 3: 4 },
    8: { 0: 4, 1: 5, 2: 5, 3: 5 }, 9: { 0: 5, 1: 6, 2: 6, 3: 6 }
  }
};

/**
 * Calculate finesse for a placed piece
 */
export function calculateFinesse(
  pieceType: string,
  spawnX: number,
  spawnRotation: number,
  finalX: number,
  finalRotation: number,
  moveCount: number,
  rotationCount: number
): FinesseResult {
  // Get optimal moves from table
  const pieceTable = FINESSE_TABLE[pieceType];
  if (!pieceTable) {
    console.warn(`[Finesse] Unknown piece type: ${pieceType}`);
    return {
      actualMoves: moveCount + rotationCount,
      optimalMoves: moveCount + rotationCount,
      errors: 0,
      efficiency: 100,
      isPerfect: true
    };
  }

  const optimalMoves = pieceTable[finalX]?.[finalRotation] ?? (Math.abs(finalX - spawnX) + Math.abs(finalRotation - spawnRotation));
  const actualMoves = moveCount + rotationCount;
  const errors = Math.max(0, actualMoves - optimalMoves);
  const efficiency = optimalMoves > 0 ? Math.min(100, (optimalMoves / actualMoves) * 100) : 100;

  return {
    actualMoves,
    optimalMoves,
    errors,
    efficiency,
    isPerfect: errors === 0
  };
}

/**
 * Update finesse stats with new result
 */
export function updateFinesseStats(
  currentStats: FinesseStats,
  result: FinesseResult
): FinesseStats {
  const newTotalPieces = currentStats.totalPieces + 1;
  const newTotalErrors = currentStats.totalErrors + result.errors;
  const newEfficiency = ((currentStats.totalPieces - currentStats.totalErrors) / currentStats.totalPieces * 100 + result.efficiency) / 2;

  return {
    totalPieces: newTotalPieces,
    totalErrors: newTotalErrors,
    efficiency: Math.min(100, newEfficiency)
  };
}

/**
 * Get finesse grade based on efficiency
 */
export function getFinesseGrade(efficiency: number): {
  grade: string;
  color: string;
  description: string;
} {
  if (efficiency >= 98) {
    return { grade: 'S', color: 'text-yellow-500', description: '完美' };
  } else if (efficiency >= 95) {
    return { grade: 'A', color: 'text-green-500', description: '优秀' };
  } else if (efficiency >= 90) {
    return { grade: 'B', color: 'text-blue-500', description: '良好' };
  } else if (efficiency >= 85) {
    return { grade: 'C', color: 'text-orange-500', description: '一般' };
  } else {
    return { grade: 'D', color: 'text-red-500', description: '需提升' };
  }
}

/**
 * Format finesse stats for display
 */
export function formatFinesseStats(stats: FinesseStats): string {
  if (stats.totalPieces === 0) return '- (0 pieces)';
  return `${stats.efficiency.toFixed(1)}% (${stats.totalErrors} errors)`;
}
