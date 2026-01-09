import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skull, Zap, Target, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedMiniPlayerViewProps {
  player: {
    id: string;
    username: string;
    team?: 'A' | 'B';
    rank?: string;
    board: number[][];
    score: number;
    lines: number;
    apm: number;
    pps?: number;
    alive: boolean;
    garbageQueued?: number;
    combo?: number;
    b2b?: number;
  };
  showFullBoard?: boolean;
  isAttackTarget?: boolean;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

// Block color mapping for precise rendering
const getBlockColor = (cell: number): string => {
  const colors: Record<number, string> = {
    1: 'bg-cyan-500',      // I piece
    2: 'bg-blue-600',      // J piece
    3: 'bg-orange-500',    // L piece
    4: 'bg-yellow-400',    // O piece
    5: 'bg-green-500',     // S piece
    6: 'bg-purple-500',    // T piece
    7: 'bg-red-500',       // Z piece
    8: 'bg-gray-500',      // Garbage
  };
  return colors[cell] || 'bg-muted/20';
};

const EnhancedMiniPlayerView: React.FC<EnhancedMiniPlayerViewProps> = ({
  player,
  showFullBoard = true,
  isAttackTarget = false,
  isCurrentUser = false,
  onClick
}) => {
  const cellSize = 3; // 3px per cell for compact display
  
  // Render full board with precise colors
  const renderFullBoard = () => {
    // Skip hidden rows (first 3 rows)
    const visibleRows = player.board.slice(3);
    
    return (
      <div 
        className="grid gap-0 border border-border/30 rounded overflow-hidden"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
        }}
      >
        {visibleRows.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={cn(
                "transition-colors",
                cell !== 0 ? getBlockColor(cell) : 'bg-muted/10'
              )}
              style={{ width: cellSize, height: cellSize }}
            />
          ))
        )}
      </div>
    );
  };

  // Calculate stack height for danger indicator
  const getStackHeight = () => {
    for (let row = 0; row < player.board.length; row++) {
      if (player.board[row].some(cell => cell !== 0)) {
        return player.board.length - row;
      }
    }
    return 0;
  };

  const stackHeight = getStackHeight();
  const dangerLevel = stackHeight > 18 ? 'critical' : stackHeight > 14 ? 'warning' : 'safe';
  const garbageQueued = player.garbageQueued || 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-lg border transition-all",
        !player.alive && "opacity-40 grayscale",
        player.team === 'A' 
          ? "border-primary/40 bg-primary/5" 
          : "border-destructive/40 bg-destructive/5",
        isAttackTarget && "ring-2 ring-yellow-500 animate-pulse",
        isCurrentUser && "ring-2 ring-primary",
        onClick && "cursor-pointer hover:bg-accent/20"
      )}
    >
      {/* Attack target indicator */}
      {isAttackTarget && (
        <div className="absolute -top-1 -right-1 z-10">
          <Target className="w-4 h-4 text-yellow-500 animate-bounce" />
        </div>
      )}

      {/* KO indicator */}
      {!player.alive && (
        <div className="absolute -top-1 -left-1 z-10">
          <Skull className="w-4 h-4 text-destructive" />
        </div>
      )}

      {/* Player info header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-medium truncate max-w-[70px]">
            {player.username}
          </span>
          {player.rank && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
              {player.rank}
            </Badge>
          )}
        </div>
        {player.team && (
          <Badge 
            variant={player.team === 'A' ? 'default' : 'destructive'} 
            className="text-[8px] px-1 py-0 h-3"
          >
            {player.team}
          </Badge>
        )}
      </div>

      {/* Board with garbage queue */}
      <div className="flex gap-1">
        {/* Garbage queue indicator */}
        {garbageQueued > 0 && (
          <div 
            className="w-1 bg-red-500 rounded-full transition-all"
            style={{ height: `${Math.min(garbageQueued * 3, 51)}px` }}
          />
        )}
        
        {/* Full precision board */}
        {showFullBoard ? renderFullBoard() : (
          <div className="w-[30px] h-[51px] bg-muted/20 rounded" />
        )}
      </div>

      {/* Stats row */}
      <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
        <span className="font-mono">{player.score.toLocaleString()}</span>
        <div className="flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-yellow-500" />
          <span className="font-mono">{Math.round(player.apm)}</span>
        </div>
      </div>

      {/* Combo/B2B indicators */}
      {((player.combo || 0) > 1 || (player.b2b || 0) > 0) && (
        <div className="mt-1 flex gap-1 text-[8px]">
          {(player.combo || 0) > 1 && (
            <span className="text-orange-400 font-bold">{player.combo}x</span>
          )}
          {(player.b2b || 0) > 0 && (
            <span className="text-yellow-400 font-bold">B2B</span>
          )}
        </div>
      )}

      {/* Danger indicator bar */}
      {player.alive && dangerLevel !== 'safe' && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg",
          dangerLevel === 'critical' ? "bg-red-500 animate-pulse" : "bg-yellow-500"
        )} />
      )}
    </div>
  );
};

export default EnhancedMiniPlayerView;
