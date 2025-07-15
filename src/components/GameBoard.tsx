
import React from 'react';
import WoodTextureCell from './WoodTextureCell';
import type { GamePiece } from '@/utils/gameTypes';

interface GameBoardProps {
  board: number[][];
  currentPiece: GamePiece | null;
  ghostPiece?: GamePiece | null;
  enableGhost?: boolean;
  cellSize?: number;
  clearingLines?: number[];
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  currentPiece,
  ghostPiece,
  enableGhost = true,
  cellSize = 25,
  clearingLines = []
}) => {
  // 渲染全部23行（含隐藏区），前3行为隐藏区
  return (
    <div className="relative">
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .wood-texture-block {
            transition: all 0.2s ease;
          }
          .wood-texture-block.clearing {
            animation: flash 0.3s ease-in-out;
            filter: brightness(1.5) saturate(1.3);
          }
          .wood-texture-block:hover {
            filter: brightness(1.1);
          }
          .wood-grain-overlay {
            mix-blend-mode: multiply;
          }
          .shimmer-overlay {
            animation: shimmer 3s ease-in-out infinite;
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.6; }
          }
          .hidden-row {
            opacity: 0.25;
            position: relative;
          }
          .hidden-row::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(45deg, transparent 10%, rgba(255,255,255,0.18) 50%, transparent 90%);
            pointer-events: none;
          }
        `}
      </style>
      <div 
        className="game-board-light grid gap-0 border-2 border-border shadow-2xl"
        style={{ 
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          width: `${cellSize * 10 + 4}px`,
          height: `${cellSize * 23 + 4}px`
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <WoodTextureCell
              key={`${rowIndex}-${colIndex}`}
              cellType={cell === 0 ? null : cell.toString()}
              rowIndex={rowIndex}
              cellSize={cellSize}
              isClearing={clearingLines.includes(rowIndex)}
              className={rowIndex < 3 ? 'hidden-row' : ''}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default GameBoard;
