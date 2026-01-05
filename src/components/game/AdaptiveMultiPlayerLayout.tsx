/**
 * 自适应多人对战布局
 * 主玩家全比例视图，其他玩家按比例缩放
 * 3人: 主区域50% + 另外两人各25%
 * 4人: 主区域50% + 其他三人各16.7%
 * 以此类推
 */
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import GameStatusIndicators from '@/components/GameStatusIndicators';
import AchievementDisplay from '@/components/AchievementDisplay';
import MiniPlayerView from './MiniPlayerView';
import GarbageQueueDisplay from './GarbageQueueDisplay';
import { Zap, Shield, Sword, Crown, Skull } from 'lucide-react';
import type { BattlePlayerState, BattleAchievement, MatchInfo } from './UnifiedBattleLayout';

interface AdaptiveMultiPlayerLayoutProps {
  mainPlayer: BattlePlayerState;
  otherPlayers: BattlePlayerState[];
  matchInfo: MatchInfo;
  incomingGarbage: number;
  outgoingGarbage: number;
  achievements?: BattleAchievement[];
  onAchievementComplete?: (id: string) => void;
  attackTarget?: string | null;
  onTargetChange?: (targetId: string) => void;
  enableGhost?: boolean;
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 获取主题色
const getAccentClasses = (team?: 'A' | 'B') => {
  if (team === 'A') return {
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    text: 'text-primary'
  };
  if (team === 'B') return {
    border: 'border-destructive/50',
    bg: 'bg-destructive/10',
    text: 'text-destructive'
  };
  return {
    border: 'border-border',
    bg: 'bg-card',
    text: 'text-foreground'
  };
};

const AdaptiveMultiPlayerLayout: React.FC<AdaptiveMultiPlayerLayoutProps> = ({
  mainPlayer,
  otherPlayers,
  matchInfo,
  incomingGarbage,
  outgoingGarbage,
  achievements = [],
  onAchievementComplete,
  attackTarget,
  onTargetChange,
  enableGhost = true
}) => {
  const mainAccent = getAccentClasses(mainPlayer.team);
  const playerCount = otherPlayers.length + 1;

  // 按存活状态和分数排序其他玩家
  const sortedOtherPlayers = useMemo(() => {
    return [...otherPlayers].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.score - a.score;
    });
  }, [otherPlayers]);

  // 分离队友和对手
  const { teammates, opponents } = useMemo(() => {
    if (matchInfo.mode === 'team') {
      return {
        teammates: sortedOtherPlayers.filter(p => p.team === mainPlayer.team),
        opponents: sortedOtherPlayers.filter(p => p.team !== mainPlayer.team)
      };
    }
    return { teammates: [], opponents: sortedOtherPlayers };
  }, [sortedOtherPlayers, mainPlayer.team, matchInfo.mode]);

  // 计算缩略图大小
  const getMiniCellSize = () => {
    if (playerCount <= 3) return 16;
    if (playerCount <= 5) return 14;
    return 12;
  };

  // 计算右侧区域的列数
  const getGridCols = () => {
    const count = opponents.length;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  return (
    <div className="flex gap-4 justify-center items-start">
      {/* 左侧 - 队友（如果是团队模式） */}
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
            />
          ))}
        </div>
      )}

      {/* 中间 - 主玩家区域（全尺寸） */}
      <div className="flex gap-3">
        {/* 垃圾行队列 */}
        <GarbageQueueDisplay
          incomingGarbage={incomingGarbage}
          outgoingGarbage={outgoingGarbage}
          maxDisplay={20}
        />

        {/* 左侧面板: HOLD + 状态 */}
        <div className="flex flex-col gap-3 w-32">
          <div className={cn(mainAccent.bg, "border", mainAccent.border, "rounded-lg p-3")}>
            <div className="text-xs text-muted-foreground mb-2 text-center font-bold tracking-wider">HOLD</div>
            <HoldPieceDisplay holdPiece={mainPlayer.holdPiece} canHold={mainPlayer.canHold} />
          </div>

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

        {/* 主棋盘 */}
        <div className="flex flex-col items-center gap-2">
          {/* 玩家信息 */}
          <div className="flex items-center gap-2 mb-1">
            {mainPlayer.alive && mainPlayer.score > Math.max(...otherPlayers.map(p => p.score)) && (
              <Crown className="w-4 h-4 text-yellow-500" />
            )}
            <span className="font-bold">{mainPlayer.username}</span>
            {mainPlayer.rank && (
              <Badge variant="outline" className="text-[10px]">{mainPlayer.rank}</Badge>
            )}
          </div>

          {/* 分数显示 */}
          <div className="text-center">
            <div className="text-3xl font-bold">{mainPlayer.score.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              L{mainPlayer.level} | {mainPlayer.lines}行 | {formatTime(mainPlayer.time)}
            </div>
          </div>

          {/* 游戏棋盘 */}
          <div className={cn(
            "border-2 rounded-lg p-1",
            mainAccent.border,
            mainAccent.bg,
            "shadow-lg"
          )}>
            <EnhancedGameBoard
              board={mainPlayer.board}
              currentPiece={mainPlayer.currentPiece}
              ghostPiece={enableGhost ? mainPlayer.ghostPiece : null}
              cellSize={24}
              showGrid={true}
              showHiddenRows={false}
            />
          </div>

          {/* 底部统计 */}
          <div className="flex items-center gap-4 text-sm">
            <span>PPS: <span className="font-mono">{mainPlayer.pps.toFixed(2)}</span></span>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-mono">{Math.round(mainPlayer.apm)}</span>
            </div>
            <span>方块: <span className="font-mono">{mainPlayer.pieces}</span></span>
          </div>
        </div>

        {/* 右侧面板: NEXT */}
        <div className="flex flex-col gap-3 w-32">
          <div className={cn(mainAccent.bg, "border", mainAccent.border, "rounded-lg p-3")}>
            <div className="text-xs text-muted-foreground mb-2 text-center font-bold tracking-wider">NEXT</div>
            <NextPiecePreview nextPieces={mainPlayer.nextPieces.slice(0, 5)} compact={false} />
          </div>
        </div>
      </div>

      {/* 右侧 - 对手区域（缩略图） */}
      <div className="flex flex-col gap-3 w-[200px] lg:w-[280px]">
        <div className="flex items-center gap-1 text-sm font-medium text-destructive mb-1">
          <Sword className="w-4 h-4" />
          <span>{matchInfo.mode === 'team' ? '对方队伍' : '对手'}</span>
          <span className="text-xs text-muted-foreground ml-1">
            ({opponents.filter(p => p.alive).length}/{opponents.length} 存活)
          </span>
        </div>

        {/* 攻击目标选择器（多人模式） */}
        {opponents.length > 1 && onTargetChange && (
          <div className="flex flex-wrap gap-1 mb-2">
            {['random', 'badge', 'ko'].map(strategy => (
              <button
                key={strategy}
                className={cn(
                  "text-xs px-2 py-1 rounded border transition-colors",
                  attackTarget === strategy 
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "border-border hover:bg-accent"
                )}
                onClick={() => onTargetChange(strategy)}
              >
                {strategy === 'random' && '随机'}
                {strategy === 'badge' && '徽章'}
                {strategy === 'ko' && 'KO'}
              </button>
            ))}
          </div>
        )}

        {/* 对手缩略图网格 */}
        <div className={cn(
          "grid gap-2",
          getGridCols() === 1 && "grid-cols-1",
          getGridCols() === 2 && "grid-cols-2",
          getGridCols() === 3 && "grid-cols-3"
        )}>
          {opponents.map(player => (
            <div
              key={player.id}
              className={cn(
                "relative cursor-pointer transition-all",
                attackTarget === player.id && "ring-2 ring-yellow-500"
              )}
              onClick={() => onTargetChange?.(player.id)}
            >
              <MiniPlayerView
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
              
              {!player.alive && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Skull className="w-6 h-6 text-destructive" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 团队统计 */}
        {matchInfo.mode === 'team' && (
          <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">团队总分:</span>
              <span className="font-mono">
                {opponents.reduce((sum, p) => sum + p.score, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">平均 APM:</span>
              <span className="font-mono">
                {opponents.length > 0 
                  ? (opponents.reduce((sum, p) => sum + p.apm, 0) / opponents.length).toFixed(1)
                  : '0'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveMultiPlayerLayout;
