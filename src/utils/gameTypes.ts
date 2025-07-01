export interface GameState {
  board: number[][];
  currentPiece: Piece;
  nextPieces: Piece[];
  holdPiece: Piece | null;
  canHold: boolean;
  isHolding: boolean;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  combo: number;
  b2b: number;
  pieces: number;
  attack: number;
  pps: number;
  apm: number;
  startTime: number | null;
  endTime: number | null;
  ghostPiece: Piece;
}

export interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

export interface GameMode {
  isTimeAttack: boolean;
  timeLimit?: number;
  targetLines?: number;
}

export interface GameSettings {
  das: number;
  arr: number;
  sdf: number;
  controls: {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateClockwise: string;
    rotateCounterclockwise: string;
    rotate180: string;
    hold: string;
    pause: string;
    backToMenu: string;
  };
  enableGhost: boolean;
  enableSound: boolean;
  masterVolume: number;
  backgroundMusic: string;
  musicVolume: number;
  ghostOpacity: number; // Add ghostOpacity to the interface
}

export type View = 'start' | 'game' | 'settings' | 'profile';
