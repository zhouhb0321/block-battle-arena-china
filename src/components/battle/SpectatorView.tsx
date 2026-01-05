/**
 * 观战视图组件
 * 展示所有玩家的游戏状态，适应性布局
 */
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import MiniPlayerView from '@/components/game/MiniPlayerView';
import { 
  Eye, 
  Users, 
  Clock, 
  Zap,
  Crown,
  ArrowLeft
} from 'lucide-react';
import type { BattlePlayerState } from '@/components/game/UnifiedBattleLayout';

interface SpectatorViewProps {
  players: BattlePlayerState[];
  matchInfo: {
    mode: string;
    elapsedTime?: number;
    currentGame?: number;
    bestOf?: number;
  };
  spectatorCount: number;
  onBack?: () => void;
  onJoinGame?: () => void;
  canJoin?: boolean;
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 根据玩家数量计算布局
 * 2人: 两侧对称大图
 * 3人: 1个大图 + 2个中图
 * 4人: 2x2 网格
 * 5+人: 动态网格
 */
const SpectatorView: React.FC<SpectatorViewProps> = ({
  players,
  matchInfo,
  spectatorCount,
  onBack,
  onJoinGame,
  canJoin = false
}) => {
  // 按分数排序玩家
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      // 存活的玩家排前面
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      // 按分数排序
      return b.score - a.score;
    });
  }, [players]);

  const playerCount = players.length;

  // 计算每个玩家的棋盘尺寸
  const getCellSize = (index: number) => {
    if (playerCount <= 2) return 24; // 2人对战，大棋盘
    if (playerCount === 3) return index === 0 ? 22 : 18; // 3人，第一个大，其他中等
    if (playerCount <= 4) return 18; // 4人，中等棋盘
    return 14; // 5人以上，小棋盘
  };

  // 2人对战布局
  const renderTwoPlayerLayout = () => (
    <div className="flex justify-center items-start gap-8 lg:gap-16">
      {sortedPlayers.map((player, index) => (
        <PlayerCard 
          key={player.id} 
          player={player} 
          cellSize={getCellSize(index)}
          showDetails={true}
          isLeading={index === 0 && player.score > (sortedPlayers[1]?.score || 0)}
        />
      ))}
    </div>
  );

  // 3人对战布局: 1个大 + 2个小
  const renderThreePlayerLayout = () => (
    <div className="flex justify-center items-start gap-6">
      {/* 领先的玩家（大图） */}
      <div className="flex-shrink-0">
        <PlayerCard 
          player={sortedPlayers[0]} 
          cellSize={getCellSize(0)}
          showDetails={true}
          isLeading={true}
        />
      </div>
      
      {/* 其他玩家（中图） */}
      <div className="flex flex-col gap-4">
        {sortedPlayers.slice(1).map((player, index) => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            cellSize={getCellSize(index + 1)}
            showDetails={true}
          />
        ))}
      </div>
    </div>
  );

  // 4人及以上布局: 网格
  const renderGridLayout = () => {
    const columns = playerCount <= 4 ? 2 : playerCount <= 6 ? 3 : 4;
    
    return (
      <div 
        className={cn(
          "grid gap-4 justify-center",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-3",
          columns === 4 && "grid-cols-4"
        )}
      >
        {sortedPlayers.map((player, index) => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            cellSize={getCellSize(index)}
            showDetails={playerCount <= 6}
            isLeading={index === 0}
            compact={playerCount > 6}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/90 to-amber-500/5 p-4">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/50">
            <Eye className="w-3 h-3" />
            观战模式
          </Badge>
          
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {spectatorCount} 人观战
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {matchInfo.elapsedTime !== undefined && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(matchInfo.elapsedTime)}</span>
            </div>
          )}
          
          {matchInfo.bestOf && (
            <Badge variant="outline">
              BO{matchInfo.bestOf} 第{matchInfo.currentGame || 1}局
            </Badge>
          )}

          {canJoin && onJoinGame && (
            <Button onClick={onJoinGame} className="gap-2">
              <Zap className="w-4 h-4" />
              加入对战
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex justify-center">
        {playerCount === 2 && renderTwoPlayerLayout()}
        {playerCount === 3 && renderThreePlayerLayout()}
        {playerCount >= 4 && renderGridLayout()}
        {playerCount < 2 && (
          <Card className="p-8 text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">等待玩家加入...</p>
            <p className="text-sm text-muted-foreground mt-2">
              游戏开始后可以观看实时对战
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

// 单个玩家卡片
interface PlayerCardProps {
  player: BattlePlayerState;
  cellSize: number;
  showDetails?: boolean;
  isLeading?: boolean;
  compact?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  cellSize,
  showDetails = true,
  isLeading = false,
  compact = false
}) => {
  const borderColor = player.team === 'A' 
    ? 'border-primary/50' 
    : player.team === 'B' 
      ? 'border-destructive/50' 
      : 'border-border';

  const bgColor = player.team === 'A' 
    ? 'bg-primary/5' 
    : player.team === 'B' 
      ? 'bg-destructive/5' 
      : 'bg-card';

  if (compact) {
    return (
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
      />
    );
  }

  return (
    <Card className={cn(
      "transition-all",
      borderColor,
      bgColor,
      !player.alive && "opacity-50 grayscale",
      isLeading && "ring-2 ring-yellow-500/50"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLeading && player.alive && (
              <Crown className="w-4 h-4 text-yellow-500" />
            )}
            <CardTitle className="text-base truncate max-w-[120px]">
              {player.username}
            </CardTitle>
            {player.rank && (
              <Badge variant="outline" className="text-[10px]">
                {player.rank}
              </Badge>
            )}
          </div>
          
          {!player.alive && (
            <Badge variant="destructive" className="text-[10px]">
              淘汰
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex gap-3">
          {/* HOLD */}
          {showDetails && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-muted-foreground text-center">HOLD</div>
              <HoldPieceDisplay 
                holdPiece={player.holdPiece} 
                canHold={player.canHold}
              />
            </div>
          )}
          
          {/* 棋盘 */}
          <div className={cn("border rounded-lg p-1", borderColor)}>
            <EnhancedGameBoard
              board={player.board}
              currentPiece={player.currentPiece}
              ghostPiece={player.ghostPiece}
              cellSize={cellSize}
              showGrid={true}
              showHiddenRows={false}
            />
          </div>
          
          {/* NEXT */}
          {showDetails && (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-muted-foreground text-center">NEXT</div>
              <NextPiecePreview 
                nextPieces={player.nextPieces.slice(0, 3)} 
                compact={true}
              />
            </div>
          )}
        </div>
        
        {/* 统计 */}
        {showDetails && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold">{player.score.toLocaleString()}</span>
              <span className="text-muted-foreground">L{player.level}</span>
              <span className="text-muted-foreground">{player.lines}行</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>PPS: {player.pps.toFixed(2)}</span>
              <div className="flex items-center gap-0.5">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span>{Math.round(player.apm)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpectatorView;
