
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

export interface TetrominoType {
  shape: number[][];
  color: string;
  name: string;
  type: string;
}

// Add PieceType as alias for TetrominoType for backward compatibility
export type PieceType = TetrominoType;

// Add GameMode type
export type GameMode = 'sprint' | 'ultra' | 'endless' | 'versus' | 'sprint40' | 'ultra2min' | 'freeForAll' | 'oneVsOne' | 'customRoom';

// Unified game piece interface
export interface GamePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
}

export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
  paused: boolean;
  canHold?: boolean;
  combo?: number;
  b2b?: number;
  pieces?: number;
  startTime?: number;
  clearingLines?: number[];
  ghostPiece?: GamePiece | null;
  attack?: number;
  pps?: number;
  apm?: number;
}

export interface ReplayAction {
  timestamp: number;
  action: 'move' | 'rotate' | 'drop' | 'hold' | 'place';
  data: any;
}

export interface GameReplay {
  id: string;
  date: string;
  score: number;
  lines: number;
  duration: number;
  actions: ReplayAction[];
  playerName?: string;
  gameMode?: string;
  gameType?: string;
  level?: number;
  isPersonalBest?: boolean;
  pps?: number;
  apm?: number;
}

export interface AdContent {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  isActive: boolean;
  region?: string;
  language?: string;
  startDate?: string;
  endDate?: string;
  clicks?: number;
  impressions?: number;
}
