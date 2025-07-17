export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  canHold: boolean;
  isHolding: boolean;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  combo: number;
  b2b: number;
  pieces: number;
  attack: number;
  pps: number;
  apm: number;
  startTime: number | null;
  endTime: number | null;
  ghostPiece: GamePiece | null;
  clearingLines: number[];
}

export interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
  type: TetrominoType;
  rotation: number;
}

export interface GamePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
}

export interface TetrominoType {
  name: string;
  type: string;
  shape: number[][];
  color: string;
}

export interface GameMode {
  id: string;
  displayName: string;
  description: string;
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
  ghostOpacity: number;
  enableWallpaper: boolean;
}

export interface AdContent {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  clickUrl: string;
  targetUrl: string;
  isActive: boolean;
  region?: string;
  language?: string;
  startDate?: string;
  endDate?: string;
  clicks?: number;
  impressions?: number;
}

export interface GameReplay {
  id: string;
  matchId?: string;
  userId: string;
  gameType?: string;
  gameMode: string;
  score: number;
  lines: number;
  level?: number;
  pps?: number;
  apm?: number;
  duration?: number;
  startTime: number;
  endTime: number;
  actions: ReplayAction[];
  finalBoard?: number[][];
  date?: string;
  playerName?: string;
  isPersonalBest?: boolean;
  metadata: {
    version: string;
    settings: GameSettings;
  };
}

export interface ReplayAction {
  timestamp: number;
  action: 'move' | 'rotate' | 'drop' | 'hold' | 'pause' | 'place';
  data?: any;
}

export type Board = number[][];

export interface Position {
  x: number;
  y: number;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  time: number;
  pps: number;
  apm: number;
  gameMode: string;
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'endless',
    displayName: '无尽模式',
    description: '经典俄罗斯方块，挑战你的极限！',
    isTimeAttack: false
  },
  {
    id: 'sprint40',
    displayName: '40行冲刺',
    description: '尽快消除40行方块',
    isTimeAttack: false,
    targetLines: 40
  },
  {
    id: 'sprint100',
    displayName: '100行冲刺',
    description: '尽快消除100行方块',
    isTimeAttack: false,
    targetLines: 100
  },
  {
    id: 'timeAttack2',
    displayName: '2分钟挑战',
    description: '在2分钟内获得最高分数',
    isTimeAttack: true,
    timeLimit: 120
  },
  {
    id: 'timeAttack5',
    displayName: '5分钟挑战',
    description: '在5分钟内获得最高分数',
    isTimeAttack: true,
    timeLimit: 300
  },
  {
    id: 'versus',
    displayName: '对战模式',
    description: '与其他玩家实时对战',
    isTimeAttack: false
  }
];

export type View = 'start' | 'game' | 'settings' | 'profile';
