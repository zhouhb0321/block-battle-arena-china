
import type { TetrominoType, GamePiece } from './gameTypes';

// Define colors for each piece type
export const PIECE_COLORS: { [key: string]: string } = {
  I: '#00f5ff', // Cyan
  O: '#ffff00', // Yellow
  T: '#800080', // Purple
  S: '#00ff00', // Green
  Z: '#ff0000', // Red
  J: '#0000ff', // Blue
  L: '#ffa500'  // Orange
};

// Define the shapes of each piece type
export const PIECE_SHAPES: { [key: string]: number[][] } = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

// Tetromino type IDs for board representation
export const TETROMINO_TYPE_IDS: { [key: string]: number } = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7
};

// Function to generate a new piece with a random type
export const generatePieceType = (): TetrominoType => {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const randomType = pieces[Math.floor(Math.random() * pieces.length)];

  return {
    name: randomType,
    type: randomType,
    shape: PIECE_SHAPES[randomType],
    color: PIECE_COLORS[randomType]
  };
};

// Seven-bag piece generator to ensure fair distribution
let currentBag: string[] = [];
let isInitialized = false;

const generateSevenBag = (): string[] => {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  
  return pieces;
};

// Initialize the bag system
export const initializePieceBag = () => {
  currentBag = generateSevenBag();
  isInitialized = true;
};

// Generate piece using 7-bag algorithm
export const generatePiece = () => {
  if (!isInitialized) {
    initializePieceBag();
  }
  
  if (currentBag.length === 0) {
    currentBag = generateSevenBag();
  }
  
  const randomType = currentBag.pop()!;
  
  const pieceDefinitions = {
    'I': { shape: [[1,1,1,1]], color: '#00f5ff' },
    'O': { shape: [[1,1],[1,1]], color: '#ffff00' },
    'T': { shape: [[0,1,0],[1,1,1]], color: '#800080' },
    'S': { shape: [[0,1,1],[1,1,0]], color: '#00ff00' },
    'Z': { shape: [[1,1,0],[0,1,1]], color: '#ff0000' },
    'J': { shape: [[1,0,0],[1,1,1]], color: '#0000ff' },
    'L': { shape: [[0,0,1],[1,1,1]], color: '#ffa500' }
  };
  
  const piece = pieceDefinitions[randomType as keyof typeof pieceDefinitions];
  
  return {
    type: randomType,
    shape: piece.shape,
    rotation: 0,
    x: 0,
    y: 0
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
