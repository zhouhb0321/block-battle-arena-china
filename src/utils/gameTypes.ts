
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

export interface GamePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
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
