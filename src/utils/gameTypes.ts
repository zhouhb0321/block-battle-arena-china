// 统一的游戏类型定义
export interface TetrominoType {
  shape: number[][];
  color: string;
  name: string;
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
}

export interface GamePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
}

export interface GameState {
  board: number[][];
  currentPiece: GamePiece | null;
  nextPieces: TetrominoType[];
  holdPiece: TetrominoType | null;
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
  ghostPiece?: GamePiece | null;
  attack: number;
  pps: number;
  apm: number;
}

export interface GameSettings {
  das: number; // Delayed Auto Shift (ms)
  arr: number; // Auto Repeat Rate (ms)  
  sdf: number; // Soft Drop Factor
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
  };
  enableGhost: boolean;
  enableSound: boolean;
  masterVolume: number;
}

export interface MultiplayerMatch {
  id: string;
  player1: string;
  player2: string;
  currentGame: number;
  maxGames: number;
  player1Wins: number;
  player2Wins: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  countdownTime: number;
}

export interface ReplayAction {
  timestamp: number;
  action: 'move' | 'rotate' | 'drop' | 'hold' | 'place';
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

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  rank: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  totalLines: number;
  bestPps: number;
  bestApm: number;
  avatarUrl?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetUrl?: string;
  position: 'left_sidebar' | 'right_sidebar' | 'top_banner' | 'bottom_banner';
  isActive: boolean;
  impressions: number;
  clicks: number;
}
