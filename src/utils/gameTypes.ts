
// 基础游戏类型定义
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

export interface PieceType {
  type: string;
  shape: number[][];
  color: string;
}

export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  combo: number;
  b2b: number;
  pieces: number;
  startTime: number;
  paused: boolean;
  gameOver: boolean;
  clearingLines: number[];
  ghostPiece: GamePiece | null;
  attack: number;
  pps: number;
  apm: number;
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
}

export interface GameMode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  targetLines?: number;
  timeLimit?: number; // 秒数
  isTimeAttack: boolean;
}

export interface ReplayAction {
  timestamp: number;
  action: 'move' | 'rotate' | 'drop' | 'hold' | 'place' | 'line_clear';
  data: any;
}

export interface GameReplay {
  id: string;
  matchId: string;
  userId: string;
  gameType: string;
  gameMode: string;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  duration: number;
  actions: ReplayAction[];
  finalBoard: number[][];
  date: string;
  playerName: string;
  isPersonalBest: boolean;
}

export interface UserBestRecord {
  id: string;
  userId: string;
  gameMode: string;
  bestScore: number;
  bestLines: number;
  bestTime: number;
  bestPps: number;
  bestApm: number;
  replayId?: string;
  achievedAt: string;
}

export interface AdContent {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  isActive: boolean;
  region: string;
  language: string;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
}

// 游戏模式配置
export const GAME_MODES: GameMode[] = [
  {
    id: 'sprint_40',
    name: 'sprint_40',
    displayName: '40行冲刺',
    description: '尽快清除40行',
    targetLines: 40,
    isTimeAttack: false
  },
  {
    id: 'sprint_80',
    name: 'sprint_80', 
    displayName: '80行冲刺',
    description: '尽快清除80行',
    targetLines: 80,
    isTimeAttack: false
  },
  {
    id: 'sprint_100',
    name: 'sprint_100',
    displayName: '100行冲刺', 
    description: '尽快清除100行',
    targetLines: 100,
    isTimeAttack: false
  },
  {
    id: 'ultra_2min',
    name: 'ultra_2min',
    displayName: '2分钟挑战',
    description: '2分钟内获得最高分数',
    timeLimit: 120,
    isTimeAttack: true
  },
  {
    id: 'ultra_5min', 
    name: 'ultra_5min',
    displayName: '5分钟挑战',
    description: '5分钟内获得最高分数',
    timeLimit: 300,
    isTimeAttack: true
  },
  {
    id: 'endless',
    name: 'endless',
    displayName: '无尽模式',
    description: '无限制游戏模式',
    isTimeAttack: false
  }
];
