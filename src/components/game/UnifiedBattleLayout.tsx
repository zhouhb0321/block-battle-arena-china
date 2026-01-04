/**
 * 统一多人对战布局组件
 * 支持 1v1、团队战、大逃杀模式
 * 合并 TetrioBattleLayout 和 MultiplayerBattleLayout 的优点
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import AchievementDisplay from '@/components/AchievementDisplay';
import GameStatusIndicators from '@/components/GameStatusIndicators';
import MiniPlayerView from './MiniPlayerView';
import GarbageQueueDisplay from './GarbageQueueDisplay';
import { 
  KOEffect, 
  ComboEffect, 
  B2BEffect, 
  AttackSentEffect,
  IncomingAttackWarning 
} from './BattleEffects';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import {
  Shield, Sword, Clock, Zap, ArrowLeft, Settings,
  Crown, Wifi, WifiOff
} from 'lucide-react';
import type { GamePiece, GameState } from '@/utils/gameTypes';
import type { ConnectionStatus } from '@/hooks/useBattleWebSocket';

// ============= 类型定义 =============
export type BattleMode = '1v1' | 'team' | 'ffa' | 'battle_royale';

export interface BattlePlayerState {
  id: string;
  username: string;
  rank?: string;
  team?: 'A' | 'B';
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  holdPiece: GamePiece | null;
  nextPieces: GamePiece[];
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  combo: number;
  b2b: number;
  attack: number;
  pieces: number;
  time: number;
  alive: boolean;
  garbageQueued: number;
  matchWins?: number;
  isConnected?: boolean;
}

export interface MatchInfo {
  mode: BattleMode;
  bestOf?: number;
  currentGame?: number;
  teamAWins?: number;
  teamBWins?: number;
  timeLimit?: number;
  elapsedTime?: number;
}

// 成就类型
type AchievementType = 'tetris' | 'tspin' | 'combo' | 'perfect' | 'level' | 'clear';

export interface BattleAchievement {
  id: string;
  text: string;
  type: AchievementType;
  timestamp: number;
}

export interface UnifiedBattleLayoutProps {
  // 玩家数据
  mainPlayer: BattlePlayerState;
  opponents: BattlePlayerState[];
  teammates?: BattlePlayerState[];
  // 比赛信息
  matchInfo: MatchInfo;
  // 攻击目标
  attackTarget?: string | null;
  onTargetChange?: (targetId: string) => void;
  // 垃圾行系统
  incomingGarbage?: number;
  outgoingGarbage?: number;
  // 成就系统
  achievements?: BattleAchievement[];
  onAchievementComplete?: (id: string) => void;
  // 对战特效
  showKO?: boolean;
  koTargetName?: string;
  onKOComplete?: () => void;
  lastAttackSent?: number;
  // 回调
  onBack?: () => void;
  onSettings?: () => void;
  // 游戏状态
  isGameActive: boolean;
  isPaused?: boolean;
  // 显示选项
  cellSize?: number;
  enableGhost?: boolean;
  // 网络状态
  connectionStatus?: ConnectionStatus;
}

// ============= 辅助组件 =============

// 统计行
const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value, 
  color = 'text-foreground' 
}) => (
  <div className="flex justify-between text-xs">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className={cn("font-mono", color)}>{value}</span>
  </div>
);

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 获取主题色
const getAccentClasses = (team?: 'A' | 'B', isLeft?: boolean) => {
  if (team === 'A') return {
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    text: 'text-primary',
    glow: 'shadow-primary/20'
  };
  if (team === 'B') return {
    border: 'border-destructive/50',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    glow: 'shadow-destructive/20'
  };
  // 默认根据左右位置
  return isLeft ? {
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/20'
  } : {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    glow: 'shadow-red-500/20'
  };
};

// ============= 1v1 模式布局 =============
interface VersusLayoutProps {
  mainPlayer: BattlePlayerState;
  opponent: BattlePlayerState;
  matchInfo: MatchInfo;
  cellSize: number;
  enableGhost: boolean;
  incomingGarbage: number;
  outgoingGarbage: number;
  achievements?: BattleAchievement[];
  onAchievementComplete?: (id: string) => void;
}

/**
 * 1v1 对战布局 - 与单人模式布局一致
 * 左侧: Hold + 成就 + 统计
 * 中间: 游戏棋盘
 * 右侧: Next队列
 */
const VersusLayout: React.FC<VersusLayoutProps> = ({
  mainPlayer,
  opponent,
  matchInfo,
  cellSize,
  enableGhost,
  incomingGarbage,
  outgoingGarbage,
  achievements = [],
  onAchievementComplete
}) => {
  const leftAccent = getAccentClasses(mainPlayer.team, true);
  const rightAccent = getAccentClasses(opponent.team, false);

  return (
    <div className="flex justify-center items-start gap-6 lg:gap-10">
      {/* 玩家1 (左侧 - 主玩家) */}
      <PlayerSection
        player={mainPlayer}
        accent={leftAccent}
        isLeft={true}
        cellSize={cellSize}
        enableGhost={enableGhost}
        incomingGarbage={incomingGarbage}
        outgoingGarbage={outgoingGarbage}
        achievements={achievements}
        onAchievementComplete={onAchievementComplete}
        isMainPlayer={true}
      />

      {/* 中央 VS 区域 */}
      <CenterVersusArea
        player1Score={mainPlayer.score}
        player2Score={opponent.score}
        player1Wins={mainPlayer.matchWins || 0}
        player2Wins={opponent.matchWins || 0}
        combo1={mainPlayer.combo}
        combo2={opponent.combo}
        matchNumber={matchInfo.currentGame || 1}
        totalMatches={matchInfo.bestOf || 5}
      />

      {/* 玩家2 (右侧 - 对手) - 完全对称的布局 */}
      <PlayerSection
        player={opponent}
        accent={rightAccent}
        isLeft={false}
        cellSize={cellSize}
        enableGhost={enableGhost}
        incomingGarbage={0}
        outgoingGarbage={0}
        isMainPlayer={false}
      />
    </div>
  );
};

// ============= 玩家区域组件 (与SinglePlayerGameArea布局一致) =============
interface PlayerSectionProps {
  player: BattlePlayerState;
  accent: ReturnType<typeof getAccentClasses>;
  isLeft: boolean;
  cellSize: number;
  enableGhost: boolean;
  incomingGarbage?: number;
  outgoingGarbage?: number;
  achievements?: BattleAchievement[];
  onAchievementComplete?: (id: string) => void;
  isMainPlayer?: boolean;
}

/**
 * 单个玩家的游戏区域
 * 布局: [左面板] [棋盘] [右面板]
 * 镜像时: [右面板] [棋盘] [左面板]
 */
const PlayerSection: React.FC<PlayerSectionProps> = ({
  player,
  accent,
  isLeft,
  cellSize,
  enableGhost,
  incomingGarbage = 0,
  outgoingGarbage = 0,
  achievements = [],
  onAchievementComplete,
  isMainPlayer = false
}) => {
  // 左面板: HOLD + 成就 + 统计
  const LeftPanel = () => (
    <div className="flex flex-col gap-3 w-36">
      {/* HOLD */}
      <div className={cn(accent.bg, "border", accent.border, "rounded-lg p-3")}>
        <div className="text-xs text-muted-foreground mb-2 text-center font-bold tracking-wider">HOLD</div>
        <HoldPieceDisplay holdPiece={player.holdPiece} canHold={player.canHold} />
      </div>

      {/* 成就显示 */}
      {isMainPlayer && achievements.length > 0 && (
        <div className="min-h-[100px]">
          <AchievementDisplay
            achievements={achievements}
            onAchievementComplete={onAchievementComplete || (() => {})}
          />
        </div>
      )}

      {/* 统计数据面板 */}
      <div className={cn(accent.bg, "border", accent.border, "rounded-lg p-3")}>
        <div className="space-y-2">
          <div className="text-center border-b border-border/40 pb-2 mb-2">
            <div className="font-bold text-lg truncate">{player.username}</div>
            {player.rank && (
              <Badge variant="outline" className="text-[10px] mt-1">{player.rank}</Badge>
            )}
          </div>
          <StatRow label="得分" value={player.score.toLocaleString()} />
          <StatRow label="行数" value={player.lines.toString()} />
          <StatRow label="等级" value={`Lv.${player.level}`} />
          <StatRow label="PPS" value={player.pps.toFixed(2)} />
          <StatRow label="APM" value={player.apm.toFixed(1)} />
          <StatRow label="时间" value={formatTime(player.time)} />
        </div>
      </div>

      {/* B2B 指示器 */}
      {player.b2b > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 text-center">
          <div className="text-[10px] text-yellow-500 font-bold">B2B</div>
          <div className="text-lg font-bold text-yellow-400">×{player.b2b}</div>
        </div>
      )}
    </div>
  );

  // 右面板: NEXT 队列
  const RightPanel = () => (
    <div className="flex flex-col gap-3 w-36">
      <div className={cn(accent.bg, "border", accent.border, "rounded-lg p-3")}>
        <div className="text-xs text-muted-foreground mb-2 text-center font-bold tracking-wider">NEXT</div>
        <NextPiecePreview nextPieces={player.nextPieces.slice(0, 5)} compact={false} />
      </div>
    </div>
  );

  // 棋盘区域 (相对定位用于放置特效)
  const GameBoardArea = () => (
    <div className="relative flex flex-col items-center">
      {/* 垃圾行队列 - 显示在棋盘左侧 */}
      <div className="flex">
        {isMainPlayer && (incomingGarbage > 0 || outgoingGarbage > 0) && (
          <div className="mr-1">
            <GarbageQueueDisplay
              incomingGarbage={incomingGarbage}
              outgoingGarbage={outgoingGarbage}
              maxDisplay={20}
            />
          </div>
        )}
        
        {/* 游戏棋盘 */}
        <div className={cn(
          "border-2 rounded-lg p-1",
          accent.border,
          accent.bg,
          "shadow-lg",
          accent.glow
        )}>
          <EnhancedGameBoard
            board={player.board}
            currentPiece={player.currentPiece}
            ghostPiece={enableGhost ? player.ghostPiece : null}
            cellSize={cellSize}
            showGrid={true}
            showHiddenRows={false}
          />
        </div>
      </div>
      
      {/* Combo 效果 - 棋盘右侧 */}
      {isMainPlayer && player.combo > 1 && (
        <div className="absolute -right-16 top-1/3 pointer-events-none z-20">
          <ComboEffect combo={player.combo} show={true} />
        </div>
      )}
      
      {/* B2B 效果 - 棋盘左侧 */}
      {isMainPlayer && player.b2b > 0 && (
        <div className="absolute -left-20 top-1/3 pointer-events-none z-20">
          <B2BEffect b2b={player.b2b} show={true} />
        </div>
      )}

      {/* 玩家连接状态 */}
      {player.isConnected === false && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <WifiOff className="w-6 h-6" />
            <span className="text-sm font-medium">连接断开</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      {/* 根据位置调整布局顺序实现镜像效果 */}
      <div className={cn("flex gap-3", !isLeft && "flex-row-reverse")}>
        <LeftPanel />
        <GameBoardArea />
        <RightPanel />
      </div>
    </div>
  );
};

// ============= 中央 VS 区域 =============
interface CenterVersusAreaProps {
  player1Score: number;
  player2Score: number;
  player1Wins: number;
  player2Wins: number;
  combo1: number;
  combo2: number;
  matchNumber: number;
  totalMatches: number;
}

const CenterVersusArea: React.FC<CenterVersusAreaProps> = ({
  player1Score,
  player2Score,
  player1Wins,
  player2Wins,
  combo1,
  combo2,
  matchNumber,
  totalMatches
}) => (
  <div className="flex flex-col items-center justify-center px-4 py-8 min-w-[100px]">
    {/* 比赛进度 */}
    <div className="text-xs text-muted-foreground mb-2">
      MATCH {matchNumber}/{totalMatches}
    </div>

    {/* 局数比分 */}
    <div className="flex items-center gap-3 mb-4">
      <span className="text-2xl font-bold text-blue-400">{player1Wins}</span>
      <span className="text-lg text-muted-foreground">-</span>
      <span className="text-2xl font-bold text-red-400">{player2Wins}</span>
    </div>

    {/* VS */}
    <div className="relative my-4">
      <div className="text-4xl font-black text-yellow-500 drop-shadow-lg">VS</div>
      <div className="absolute inset-0 text-4xl font-black text-yellow-400 blur-sm -z-10">VS</div>
    </div>

    {/* 分数对比 */}
    <div className="mt-4 text-center space-y-1">
      <div className="text-[10px] text-muted-foreground">SCORE</div>
      <div className="flex gap-2 items-center text-sm">
        <span className="font-mono text-blue-300">{player1Score.toLocaleString()}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-mono text-red-300">{player2Score.toLocaleString()}</span>
      </div>
    </div>

    {/* COMBO */}
    {(combo1 > 0 || combo2 > 0) && (
      <div className="mt-4 flex gap-4">
        {combo1 > 0 && (
          <div className="text-center">
            <div className="text-[10px] text-blue-400">COMBO</div>
            <div className="text-lg font-bold text-blue-300">{combo1}</div>
          </div>
        )}
        {combo2 > 0 && (
          <div className="text-center">
            <div className="text-[10px] text-red-400">COMBO</div>
            <div className="text-lg font-bold text-red-300">{combo2}</div>
          </div>
        )}
      </div>
    )}
  </div>
);

// ============= 多人模式布局 (团队战/大逃杀) =============
interface MultiPlayerLayoutProps {
  mainPlayer: BattlePlayerState;
  opponents: BattlePlayerState[];
  teammates: BattlePlayerState[];
  matchInfo: MatchInfo;
  attackTarget?: string | null;
  onTargetChange?: (targetId: string) => void;
  incomingGarbage: number;
  outgoingGarbage: number;
  achievements?: BattleAchievement[];
  onAchievementComplete?: (id: string) => void;
  cellSize: number;
  enableGhost: boolean;
}

const MultiPlayerLayout: React.FC<MultiPlayerLayoutProps> = ({
  mainPlayer,
  opponents,
  teammates,
  matchInfo,
  attackTarget,
  onTargetChange,
  incomingGarbage,
  outgoingGarbage,
  achievements = [],
  onAchievementComplete,
  cellSize,
  enableGhost
}) => {
  const mainAccent = getAccentClasses(mainPlayer.team, true);

  // 计算团队统计
  const getTeamStats = (team: 'A' | 'B') => {
    const allPlayers = [mainPlayer, ...opponents, ...teammates];
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const alive = teamPlayers.filter(p => p.alive).length;
    const totalScore = teamPlayers.reduce((sum, p) => sum + p.score, 0);
    return { alive, total: teamPlayers.length, totalScore };
  };

  return (
    <div className="flex gap-4 justify-center">
      {/* 左侧队友 */}
      {teammates.length > 0 && (
        <div className="hidden lg:flex flex-col gap-2 w-[140px]">
          <div className="flex items-center gap-1 text-sm font-medium text-primary mb-1">
            <Shield className="w-4 h-4" />
            <span>队友</span>
          </div>
          {teammates.map(player => (
            <MiniPlayerView
              key={player.id}
              username={player.username}
              board={player.board}
              score={player.score}
              lines={player.lines}
              apm={player.apm}
              alive={player.alive}
              team={player.team}
              rank={player.rank}
              garbageQueued={player.garbageQueued}
              isUnderAttack={attackTarget === player.id}
            />
          ))}
        </div>
      )}

      {/* 主玩家区域 */}
      <div className="flex gap-2">
        {/* 垃圾行队列 */}
        <GarbageQueueDisplay
          incomingGarbage={incomingGarbage}
          outgoingGarbage={outgoingGarbage}
          maxDisplay={20}
        />

        {/* HOLD + 状态 */}
        <div className="flex flex-col gap-2">
          <HoldPieceDisplay holdPiece={mainPlayer.holdPiece} canHold={mainPlayer.canHold} />
          <GameStatusIndicators
            combo={mainPlayer.combo}
            b2b={mainPlayer.b2b}
            totalAttack={mainPlayer.attack}
          />
          {achievements.length > 0 && (
            <AchievementDisplay
              achievements={achievements}
              onAchievementComplete={onAchievementComplete || (() => {})}
            />
          )}
        </div>

        {/* 主游戏棋盘 */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-center mb-1">
            <div className="text-2xl font-bold">{mainPlayer.score.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              L{mainPlayer.level} | {mainPlayer.lines}行
            </div>
          </div>

          <div className={cn("border-2", mainAccent.border, "rounded-lg p-1", mainAccent.bg)}>
            <EnhancedGameBoard
              board={mainPlayer.board}
              currentPiece={mainPlayer.currentPiece}
              ghostPiece={enableGhost ? mainPlayer.ghostPiece : null}
              cellSize={cellSize}
              showGrid={true}
            />
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">PPS:</span>
              <span className="font-mono">{mainPlayer.pps.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-mono">{Math.round(mainPlayer.apm)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            {mainPlayer.username}
            {mainPlayer.rank && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                {mainPlayer.rank}
              </Badge>
            )}
          </div>
        </div>

        {/* NEXT */}
        <NextPiecePreview nextPieces={mainPlayer.nextPieces.slice(0, 5)} />
      </div>

      {/* 右侧对手 */}
      <div className="flex flex-col gap-2 w-[140px] md:w-[280px]">
        <div className="flex items-center gap-1 text-sm font-medium text-destructive mb-1">
          <Sword className="w-4 h-4" />
          <span>对手</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({opponents.filter(p => p.alive).length}/{opponents.length} 存活)
          </span>
        </div>

        {/* 攻击目标选择器 */}
        {opponents.length > 1 && onTargetChange && (
          <div className="flex flex-wrap gap-1 mb-2">
            {['random', 'badge', 'ko'].map(strategy => (
              <Button
                key={strategy}
                variant={attackTarget === strategy ? "default" : "outline"}
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => onTargetChange(strategy)}
              >
                {strategy === 'random' && '随机'}
                {strategy === 'badge' && '徽章'}
                {strategy === 'ko' && 'KO'}
              </Button>
            ))}
          </div>
        )}

        {/* 对手缩略图 */}
        <div className={cn(
          "grid gap-2",
          opponents.length <= 2 && "grid-cols-1",
          opponents.length > 2 && opponents.length <= 4 && "grid-cols-2",
          opponents.length > 4 && "grid-cols-2 md:grid-cols-3"
        )}>
          {opponents.map(player => (
            <MiniPlayerView
              key={player.id}
              username={player.username}
              board={player.board}
              score={player.score}
              lines={player.lines}
              apm={player.apm}
              alive={player.alive}
              team={player.team}
              rank={player.rank}
              garbageQueued={player.garbageQueued}
              isUnderAttack={attackTarget === player.id}
              onClick={() => onTargetChange?.(player.id)}
            />
          ))}
        </div>

        {/* 团队统计 */}
        {matchInfo.mode === 'team' && (
          <Card className="mt-2 bg-destructive/5 border-destructive/20">
            <CardContent className="p-2 text-xs">
              <div className="flex justify-between">
                <span>团队总分:</span>
                <span className="font-mono">
                  {getTeamStats(mainPlayer.team === 'A' ? 'B' : 'A').totalScore.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>存活人数:</span>
                <span className="font-mono">
                  {getTeamStats(mainPlayer.team === 'A' ? 'B' : 'A').alive}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============= 主组件 =============
const UnifiedBattleLayout: React.FC<UnifiedBattleLayoutProps> = ({
  mainPlayer,
  opponents,
  teammates = [],
  matchInfo,
  attackTarget,
  onTargetChange,
  incomingGarbage = 0,
  outgoingGarbage = 0,
  achievements = [],
  onAchievementComplete,
  showKO = false,
  koTargetName,
  onKOComplete,
  lastAttackSent = 0,
  onBack,
  onSettings,
  isGameActive,
  isPaused,
  cellSize = 22,
  enableGhost = true,
  connectionStatus
}) => {
  // 判断是否为 1v1 模式
  const is1v1 = matchInfo.mode === '1v1' || (opponents.length === 1 && teammates.length === 0);

  // 追踪上一次的 combo 和 b2b 以检测变化
  const prevComboRef = useRef(mainPlayer.combo);
  const prevB2BRef = useRef(mainPlayer.b2b);
  const [comboChanged, setComboChanged] = useState(false);
  const [b2bChanged, setB2BChanged] = useState(false);
  const [showAttackSent, setShowAttackSent] = useState(false);
  const [attackSentLines, setAttackSentLines] = useState(0);

  // 检测 combo 变化
  useEffect(() => {
    if (mainPlayer.combo > prevComboRef.current && mainPlayer.combo > 1) {
      setComboChanged(true);
      const timer = setTimeout(() => setComboChanged(false), 600);
      return () => clearTimeout(timer);
    }
    prevComboRef.current = mainPlayer.combo;
  }, [mainPlayer.combo]);

  // 检测 b2b 变化
  useEffect(() => {
    if (mainPlayer.b2b > prevB2BRef.current && mainPlayer.b2b > 0) {
      setB2BChanged(true);
      const timer = setTimeout(() => setB2BChanged(false), 500);
      return () => clearTimeout(timer);
    }
    prevB2BRef.current = mainPlayer.b2b;
  }, [mainPlayer.b2b]);

  // 检测攻击发送
  useEffect(() => {
    if (lastAttackSent > 0) {
      setAttackSentLines(lastAttackSent);
      setShowAttackSent(true);
    }
  }, [lastAttackSent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-primary/5 p-2 md:p-4">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Badge variant="outline" className="text-sm">
            {matchInfo.mode === 'team' && '团队战'}
            {matchInfo.mode === '1v1' && '1v1 对战'}
            {matchInfo.mode === 'ffa' && '混战'}
            {matchInfo.mode === 'battle_royale' && '大逃杀'}
          </Badge>
          {matchInfo.bestOf && (
            <span className="text-sm text-muted-foreground">
              BO{matchInfo.bestOf} - 第{matchInfo.currentGame || 1}局
            </span>
          )}
        </div>

        {/* 团队比分 */}
        {matchInfo.mode === 'team' && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{matchInfo.teamAWins || 0}</div>
              <div className="text-xs text-muted-foreground">Team A</div>
            </div>
            <div className="text-lg font-bold">VS</div>
            <div className="text-center">
              <div className="text-xl font-bold text-destructive">{matchInfo.teamBWins || 0}</div>
              <div className="text-xs text-muted-foreground">Team B</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {matchInfo.elapsedTime !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(matchInfo.elapsedTime)}</span>
            </div>
          )}
          {/* 网络状态指示器 */}
          {connectionStatus && (
            <NetworkStatusIndicator
              isConnected={connectionStatus.isConnected}
              ping={connectionStatus.ping}
              reconnecting={connectionStatus.reconnecting}
              reconnectAttempt={connectionStatus.reconnectAttempt}
            />
          )}
          {onSettings && (
            <Button variant="ghost" size="sm" onClick={onSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex justify-center">
        {is1v1 && opponents.length === 1 ? (
          <VersusLayout
            mainPlayer={mainPlayer}
            opponent={opponents[0]}
            matchInfo={matchInfo}
            cellSize={cellSize}
            enableGhost={enableGhost}
            incomingGarbage={incomingGarbage}
            outgoingGarbage={outgoingGarbage}
            achievements={achievements}
            onAchievementComplete={onAchievementComplete}
          />
        ) : (
          <MultiPlayerLayout
            mainPlayer={mainPlayer}
            opponents={opponents}
            teammates={teammates}
            matchInfo={matchInfo}
            attackTarget={attackTarget}
            onTargetChange={onTargetChange}
            incomingGarbage={incomingGarbage}
            outgoingGarbage={outgoingGarbage}
            achievements={achievements}
            onAchievementComplete={onAchievementComplete}
            cellSize={cellSize}
            enableGhost={enableGhost}
          />
        )}
      </div>

      {/* ============= 对战特效层 ============= */}
      
      {/* KO 提示 */}
      <KOEffect
        show={showKO}
        targetName={koTargetName}
        onComplete={onKOComplete}
      />

      {/* 攻击发送动画 */}
      <AttackSentEffect
        lines={attackSentLines}
        show={showAttackSent}
        onComplete={() => setShowAttackSent(false)}
      />

      {/* 即将收到攻击警告 - 相对于棋盘位置 */}
      {incomingGarbage >= 4 && isGameActive && (
        <div className="fixed bottom-1/4 left-1/4 z-40 pointer-events-none">
          <IncomingAttackWarning lines={incomingGarbage} show={true} />
        </div>
      )}

      {/* 暂停遮罩 */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">游戏暂停</h2>
            <p className="text-muted-foreground">按 ESC 继续</p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UnifiedBattleLayout;
