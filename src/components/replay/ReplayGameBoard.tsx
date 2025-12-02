import React from 'react';
import EnhancedGameBoard from '@/components/EnhancedGameBoard';
import HoldPieceDisplay from '@/components/HoldPieceDisplay';
import NextPiecePreview from '@/components/NextPiecePreview';
import type { GamePiece } from '@/utils/gameTypes';

interface ReplayGameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece: GamePiece | null;
  nextPieces: GamePiece[];
  holdPiece: GamePiece | null;
  score: number;
  lines: number;
  level: number;
  pps: number;
  apm: number;
  time: number;
}

const ReplayGameBoard: React.FC<ReplayGameBoardProps> = ({
  board,
  currentPiece,
  ghostPiece,
  nextPieces,
  holdPiece,
  score,
  lines,
  level,
  pps,
  apm,
  time
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex gap-6 items-start scale-110">
      {/* HOLD 区域 */}
      <div className="w-28 flex flex-col gap-4">
        <div className="bg-black/40 border border-white/20 backdrop-blur-sm p-3 rounded-lg">
          <div className="text-xs text-white/60 mb-2 text-center">HOLD</div>
          <HoldPieceDisplay
            holdPiece={holdPiece}
            canHold={true}
          />
        </div>
      </div>

      {/* 游戏板 */}
      <div className="relative">
        <div className="bg-black/20 p-2 rounded-lg border border-white/10">
          <EnhancedGameBoard
            board={board}
            currentPiece={currentPiece}
            ghostPiece={ghostPiece}
            cellSize={28}
            showGrid={true}
            showHiddenRows={true}
          />
        </div>
      </div>

      {/* NEXT + 统计 区域 */}
      <div className="w-40 flex flex-col gap-4">
        {/* NEXT 预览 */}
        <div className="bg-black/40 border border-white/20 backdrop-blur-sm p-3 rounded-lg">
          <div className="text-xs text-white/60 mb-2 text-center">NEXT</div>
          <NextPiecePreview
            nextPieces={nextPieces}
            compact={false}
          />
        </div>

        {/* 统计数据 */}
        <div className="bg-black/40 border border-white/20 backdrop-blur-sm p-4 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">得分</span>
              <span className="font-mono text-white">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">行数</span>
              <span className="font-mono text-white">{lines}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">等级</span>
              <span className="font-mono text-white">{level}</span>
            </div>
            <div className="border-t border-white/10 my-2" />
            <div className="flex justify-between">
              <span className="text-white/60">PPS</span>
              <span className="font-mono text-white">{pps.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">APM</span>
              <span className="font-mono text-white">{apm.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">时间</span>
              <span className="font-mono text-white">{formatTime(time)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayGameBoard;
