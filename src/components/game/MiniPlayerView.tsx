import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skull, Zap, Target, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface MiniPlayerViewProps {
  username: string;
  board: number[][];
  score: number;
  lines: number;
  apm: number;
  alive: boolean;
  team?: 'A' | 'B';
  rank?: string;
  isUnderAttack?: boolean;
  isAttacking?: boolean;
  garbageQueued?: number;
  isCurrentUser?: boolean;
  showFullBoard?: boolean; // New prop for precise board rendering
  onClick?: () => void;
}

const MiniPlayerView: React.FC<MiniPlayerViewProps> = ({
  username,
  board,
  score,
  lines,
  apm,
  alive,
  team,
  rank,
  isUnderAttack,
  isAttacking,
  garbageQueued = 0,
  isCurrentUser,
  showFullBoard = false,
  onClick
}) => {
  // Calculate stack height (simplified visualization)
  const getStackHeight = () => {
    for (let row = 0; row < board.length; row++) {
      if (board[row].some(cell => cell !== 0)) {
        return board.length - row;
      }
    }
    return 0;
  };

  const stackHeight = getStackHeight();
  const dangerLevel = stackHeight > 15 ? 'critical' : stackHeight > 10 ? 'warning' : 'safe';

  // Render full precision board (10 columns x 20 rows, 3px cells)
  const renderFullPrecisionBoard = () => {
    const cellSize = 3;
    const visibleRows = board.slice(3); // Skip hidden rows
    
    return (
      <div 
        className="grid gap-0 border border-border/30 rounded overflow-hidden"
        style={{ gridTemplateColumns: `repeat(10, ${cellSize}px)` }}
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

  // Render simplified mini board (5 columns x 10 rows)
  const renderSimplifiedBoard = () => {
    const miniRows = 10;
    const miniCols = 5;
    const rowStep = Math.floor(board.length / miniRows);
    const colStep = 2;

    return (
      <div className="grid gap-px bg-border/50 p-0.5 rounded">
        {Array.from({ length: miniRows }).map((_, miniRow) => (
          <div key={miniRow} className="flex gap-px">
            {Array.from({ length: miniCols }).map((_, miniCol) => {
              const boardRow = Math.min(miniRow * rowStep + 3, board.length - 1);
              const boardCol = miniCol * colStep;
              const hasBlock = board[boardRow]?.[boardCol] !== 0 || board[boardRow]?.[boardCol + 1] !== 0;
              
              return (
                <div
                  key={miniCol}
                  className={cn(
                    "w-2 h-2 rounded-sm transition-colors",
                    hasBlock 
                      ? team === 'A' 
                        ? 'bg-primary/80' 
                        : 'bg-destructive/80'
                      : 'bg-muted/30'
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-lg border transition-all cursor-pointer",
        !alive && "opacity-50 grayscale",
        isCurrentUser && "ring-2 ring-primary",
        team === 'A' ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/5",
        isUnderAttack && "animate-pulse border-red-500",
        isAttacking && "border-yellow-500",
        "hover:bg-accent/20"
      )}
    >
      {/* Attack/Defense indicators */}
      {isUnderAttack && (
        <div className="absolute -top-1 -right-1">
          <Target className="w-4 h-4 text-red-500 animate-bounce" />
        </div>
      )}
      {isAttacking && (
        <div className="absolute -top-1 -left-1">
          <Swords className="w-4 h-4 text-yellow-500" />
        </div>
      )}

      {/* Header: Username + Status */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-medium truncate max-w-[60px]">{username}</span>
          {rank && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {rank}
            </Badge>
          )}
        </div>
        {!alive && (
          <Skull className="w-3 h-3 text-destructive" />
        )}
      </div>

      {/* Mini Board */}
      <div className="flex gap-1">
        {/* Garbage queue indicator */}
        {garbageQueued > 0 && (
          <div className="flex flex-col justify-end">
            <div 
              className="w-1 bg-red-500 rounded-sm transition-all"
              style={{ height: `${Math.min(garbageQueued * 4, 40)}px` }}
            />
          </div>
        )}
        
        {showFullBoard ? renderFullPrecisionBoard() : renderSimplifiedBoard()}
      </div>

      {/* Stats */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{score.toLocaleString()}</span>
        <div className="flex items-center gap-0.5">
          <Zap className="w-2.5 h-2.5" />
          <span>{Math.round(apm)}</span>
        </div>
      </div>

      {/* Danger indicator */}
      {alive && dangerLevel !== 'safe' && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg",
          dangerLevel === 'critical' ? "bg-red-500 animate-pulse" : "bg-yellow-500"
        )} />
      )}
    </div>
  );
};

export default MiniPlayerView;
