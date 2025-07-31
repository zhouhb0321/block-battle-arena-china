// 录像回放系统的优化数据结构

export interface CompressedAction {
  t: number; // 时间戳 (相对开始时间，毫秒)
  a: number; // 动作类型 (位运算编码)
  d?: number; // 可选数据 (坐标、方向等)
}

export interface OptimizedReplayData {
  gameMetadata: {
    gameMode: string;
    seed: string; // 方块序列种子
    startTime: number;
    endTime: number;
    playerIds: string[];
    matchId?: string;
    gameId?: string;
  };
  playerActions: {
    [playerId: string]: CompressedAction[];
  };
  gameEvents: CompressedGameEvent[];
  checksum: string; // 数据完整性校验
}

export interface CompressedGameEvent {
  t: number; // 时间戳
  type: string; // 事件类型 (tspin, tetris, combo, attack, etc.)
  player: string; // 玩家ID
  data?: any; // 事件数据
}

export interface RankedMatch {
  id: string;
  roomId?: string;
  seasonId?: string;
  player1Id: string;
  player2Id: string;
  player1Rating: number;
  player2Rating: number;
  winnerId?: string;
  bestOf: number;
  currentGame: number;
  player1Wins: number;
  player2Wins: number;
  status: 'waiting' | 'in_progress' | 'finished' | 'cancelled';
  matchType: '1v1' | 'ranked';
  seed: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface MatchGame {
  id: string;
  matchId: string;
  gameNumber: number;
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
  winnerLines: number;
  loserLines: number;
  winnerPps: number;
  loserPps: number;
  winnerApm: number;
  loserApm: number;
  durationSeconds: number;
  attacksSent: { [playerId: string]: number };
  attacksReceived: { [playerId: string]: number };
  gameSeed: string;
  createdAt: string;
  finishedAt: string;
}

export interface CompressedReplay {
  id: string;
  matchId?: string;
  gameId?: string;
  userId: string;
  opponentId?: string;
  gameMode: string;
  gameType: 'single' | 'ranked' | '1v1';
  seed: string;
  initialBoard: number[][];
  gameSettings: any;
  compressedActions: Uint8Array;
  actionsCount: number;
  compressionRatio: number;
  finalScore: number;
  finalLines: number;
  finalLevel: number;
  pps: number;
  apm: number;
  durationSeconds: number;
  isPersonalBest: boolean;
  isWorldRecord: boolean;
  isFeatured: boolean;
  checksum: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReplayBookmark {
  id: string;
  replayId: string;
  userId: string;
  timestampMs: number;
  bookmarkType: 'tspin' | 'tetris' | 'combo' | 'attack' | 'defense' | 'custom';
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
}

// 动作类型常量
export const ACTION_TYPES = {
  MOVE_LEFT: 0,
  MOVE_RIGHT: 1,
  SOFT_DROP: 2,
  HARD_DROP: 3,
  ROTATE_CW: 4,
  ROTATE_CCW: 5,
  ROTATE_180: 6,
  HOLD: 7,
  PAUSE: 8,
  PLACE: 9,
  GAME_EVENT: 10
} as const;

// 游戏事件类型
export const GAME_EVENT_TYPES = {
  LINE_CLEAR: 'line_clear',
  TSPIN: 'tspin',
  TETRIS: 'tetris',
  COMBO: 'combo',
  PERFECT_CLEAR: 'perfect_clear',
  ATTACK_SENT: 'attack_sent',
  ATTACK_RECEIVED: 'attack_received',
  GAME_OVER: 'game_over'
} as const;

// ELO积分系统
export interface EloRating {
  rating: number;
  peakRating: number;
  currentStreak: number;
  longestWinStreak: number;
  matchesPlayed: number;
  promotionProtectionGames: number;
}

export interface EloChange {
  winnerNewRating: number;
  loserNewRating: number;
}

// 段位定义
export const RANK_TIERS = {
  BRONZE: { min: 800, max: 1199, name: 'Bronze', color: '#CD7F32' },
  SILVER: { min: 1200, max: 1599, name: 'Silver', color: '#C0C0C0' },
  GOLD: { min: 1600, max: 1999, name: 'Gold', color: '#FFD700' },
  PLATINUM: { min: 2000, max: 2399, name: 'Platinum', color: '#E5E4E2' },
  DIAMOND: { min: 2400, max: 2799, name: 'Diamond', color: '#B9F2FF' },
  MASTER: { min: 2800, max: 3199, name: 'Master', color: '#8A2BE2' },
  GRANDMASTER: { min: 3200, max: 9999, name: 'Grandmaster', color: '#FF4500' }
} as const;

export type RankTier = keyof typeof RANK_TIERS;

export function getRankByRating(rating: number): RankTier {
  for (const [tier, config] of Object.entries(RANK_TIERS)) {
    if (rating >= config.min && rating <= config.max) {
      return tier as RankTier;
    }
  }
  return 'BRONZE';
}

// 回放播放器状态
export interface ReplayPlayerState {
  isPlaying: boolean;
  currentTime: number;
  totalTime: number;
  playbackSpeed: number;
  currentActionIndex: number;
  gameBoard: number[][];
  gameStats: {
    score: number;
    lines: number;
    level: number;
    pps: number;
    apm: number;
    pieces: number;
  };
}

// 回放播放器配置
export interface ReplayPlayerConfig {
  speedOptions: number[]; // [0.25, 0.5, 1, 2, 4]
  enableBookmarks: boolean;
  showStatistics: boolean;
  autoMarkEvents: boolean;
}

export const DEFAULT_REPLAY_CONFIG: ReplayPlayerConfig = {
  speedOptions: [0.25, 0.5, 1, 2, 4],
  enableBookmarks: true,
  showStatistics: true,
  autoMarkEvents: true
};