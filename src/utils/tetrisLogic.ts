
import type { TetrominoType, GamePiece } from './gameTypes';
import { calculateB2BAttackBonus } from './b2bSystem';
import { detectTSpin } from './tspinDetection';

// Re-export everything from the modular files
export * from './pieceGeneration';
export * from './srsRotation';
export * from './scoringSystem';
export * from './tetrisCore';

// Legacy function that integrates with the new T-Spin detection system
export const checkTSpin = (
  board: number[][], 
  piece: GamePiece, 
  lastMove: string, 
  wasKicked: boolean = false
): { type: string; isMini: boolean } | null => {
  const result = detectTSpin(board, piece, lastMove, wasKicked);
  if (result) {
    return {
      type: result.type,
      isMini: result.isMini
    };
  }
  return null;
};
