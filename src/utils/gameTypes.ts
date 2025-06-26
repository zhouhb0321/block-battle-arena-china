
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
  backgroundMusic?: string;
  musicVolume?: number;
}

export interface TetrisPiece {
  type: string;
  x: number;
  y: number;
  rotation: number;
  shape: number[][];
  color: string;
}

export interface GameState {
  board: number[][];
  currentPiece: TetrisPiece | null;
  nextPieces: TetrisPiece[];
  holdPiece: TetrisPiece | null;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
}
