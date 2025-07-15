
import type { TetrominoType, GamePiece } from './gameTypes';
import { calculateB2BAttackBonus } from './b2bSystem';
import { detectTSpin } from './tspinDetection';

// Re-export everything from the modular files
export * from './pieceGeneration';
export * from './srsRotation';
export * from './scoringSystem';
export * from './tetrisCore';

// Add missing exports that other files expect
export const TETROMINO_TYPES: { [key: string]: TetrominoType } = {
  I: { name: 'I', type: 'I', shape: [[1,1,1,1]], color: '#00f5ff' },
  O: { name: 'O', type: 'O', shape: [[1,1],[1,1]], color: '#ffff00' },
  T: { name: 'T', type: 'T', shape: [[0,1,0],[1,1,1]], color: '#800080' },
  S: { name: 'S', type: 'S', shape: [[0,1,1],[1,1,0]], color: '#00ff00' },
  Z: { name: 'Z', type: 'Z', shape: [[1,1,0],[0,1,1]], color: '#ff0000' },
  J: { name: 'J', type: 'J', shape: [[1,0,0],[1,1,1]], color: '#0000ff' },
  L: { name: 'L', type: 'L', shape: [[0,0,1],[1,1,1]], color: '#ffa500' }
};

// Seven bag generator
export const generateSevenBag = (): TetrominoType[] => {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const bag: TetrominoType[] = [];
  
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  
  pieces.forEach(pieceType => {
    bag.push(TETROMINO_TYPES[pieceType]);
  });
  
  return bag;
};

// Create new piece at spawn position
export const createNewPiece = (type: TetrominoType): GamePiece => {
  return {
    type,
    x: Math.floor(10 / 2) - Math.floor(type.shape[0].length / 2),
    y: 0,
    rotation: 0
  };
};

// Rotate piece function
export const rotatePiece = (type: TetrominoType, clockwise: boolean = true): TetrominoType => {
  const shape = type.shape;
  const rotated = shape[0].map((_, index) => 
    clockwise 
      ? shape.map(row => row[index]).reverse()
      : shape.map(row => row[index]).slice().reverse()
  );
  
  return {
    ...type,
    shape: rotated
  };
};

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
